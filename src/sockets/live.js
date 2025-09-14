
const LiveSession = require('../models/LiveSession');
const Quiz = require('../models/Quiz');
const Response = require('../models/Response');

// in-memory map socket.id -> { sessionId, playerId, isHost }
const socketsState = new Map();

module.exports = function initLiveSockets(io) {
  const nsp = io.of('/live');

  nsp.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Player joins via code
    socket.on('player:join', async ({ code, name }, cb) => {
      try {
        if (!code || !name) return cb?.({ error: 'Code and name required' });
        
        const session = await LiveSession.findOne({ code });
        if (!session) return cb?.({ error: 'Invalid code' });
        if (session.status === 'ended') return cb?.({ error: 'Session ended' });

        // Use socket.id as playerId for simplicity (could use nanoid for persistence)
        const playerId = socket.id;
        
        // Check if player already exists, if not add them
        if (!session.players.find(p => p.playerId === playerId)) {
          session.players.push({ playerId, name, score: 0 });
          await session.save();
        }

        // Store socket state
        socketsState.set(socket.id, { 
          sessionId: String(session._id), 
          playerId, 
          isHost: false 
        });
        
        socket.join(session.code);

        // Update lobby for all clients
        nsp.to(session.code).emit('lobby:update', 
          session.players.map(p => ({ name: p.name, score: p.score }))
        );

        cb?.({ 
          ok: true, 
          sessionId: String(session._id), 
          playerId, 
          status: session.status,
          currentQuestionIndex: session.currentQuestionIndex
        });
        
      } catch (err) {
        console.error('Player join error:', err);
        cb?.({ error: 'Join failed' });
      }
    });

    // Host join by sessionId + hostKey
    socket.on('host:join', async ({ sessionId, hostKey }, cb) => {
      try {
        const session = await LiveSession.findById(sessionId).populate('quiz');
        if (!session) return cb?.({ error: 'Session not found' });
        if (session.hostKey !== hostKey) return cb?.({ error: 'Invalid host key' });

        socketsState.set(socket.id, { 
          sessionId: String(session._id), 
          playerId: null, 
          isHost: true 
        });
        
        socket.join(session.code);

        cb?.({ 
          ok: true, 
          code: session.code, 
          status: session.status, 
          currentQuestionIndex: session.currentQuestionIndex,
          players: session.players.map(p => ({ name: p.name, score: p.score }))
        });
        
      } catch (err) {
        console.error('Host join error:', err);
        cb?.({ error: 'Host join failed' });
      }
    });

    // Host starts quiz
    socket.on('host:start', async (cb) => {
      try {
        const state = socketsState.get(socket.id);
        if (!state?.isHost) return cb?.({ error: 'Not authorized as host' });
        
        const session = await LiveSession.findById(state.sessionId).populate('quiz');
        if (!session) return cb?.({ error: 'Session not found' });
        if (session.status !== 'waiting') return cb?.({ error: 'Cannot start - session not waiting' });

        session.status = 'live';
        session.currentQuestionIndex = 0;
        await session.save();

        const question = session.quiz.questions[0];
        if (!question) return cb?.({ error: 'No questions in quiz' });

        // Broadcast first question to all clients
        nsp.to(session.code).emit('question:show', {
          index: 0,
          text: question.text,
          options: question.options,
          timeLimitSec: question.timeLimitSec || 30
        });

        cb?.({ ok: true });
        
      } catch (err) {
        console.error('Start quiz error:', err);
        cb?.({ error: 'Failed to start quiz' });
      }
    });

    // Host moves to next question
    socket.on('host:next', async (cb) => {
      try {
        const state = socketsState.get(socket.id);
        if (!state?.isHost) return cb?.({ error: 'Not authorized as host' });
        
        const session = await LiveSession.findById(state.sessionId).populate('quiz');
        if (!session) return cb?.({ error: 'Session not found' });

        const prevIndex = session.currentQuestionIndex;
        
        // Proper score calculation after each question
        if (prevIndex >= 0) {
          const quiz = session.quiz;
          const correctIndex = quiz.questions[prevIndex].correctIndex;
          const questionPoints = quiz.questions[prevIndex].points || 10;
          
          // Get all responses for this question
          const responses = await Response.find({ 
            session: session._id, 
            questionIndex: prevIndex 
          });
          
          // Build points map for correct answers
          const pointsMap = new Map();
          responses.forEach(r => {
            if (r.answerIndex === correctIndex) {
              pointsMap.set(r.playerId, questionPoints);
            }
          });
          
          // Proper Mongoose array update
          for (let i = 0; i < session.players.length; i++) {
            const player = session.players[i];
            const earnedPoints = pointsMap.get(player.playerId) || 0;
            session.players[i].score += earnedPoints;
          }
        }

        const nextIndex = prevIndex + 1;
        
        // Check if quiz is complete
        if (nextIndex >= session.quiz.questions.length) {
          session.status = 'ended';
          session.currentQuestionIndex = nextIndex; // Keep final index
          await session.save();
          
          // Send final leaderboard
          const finalScores = session.players
            .sort((a, b) => b.score - a.score)
            .map(p => ({ name: p.name, score: p.score }));
            
          nsp.to(session.code).emit('quiz:ended', { 
            leaderboard: finalScores,
            totalQuestions: session.quiz.questions.length 
          });
          
          return cb?.({ ok: true, ended: true });
        }

        // Move to next question
        session.currentQuestionIndex = nextIndex;
        await session.save();

        const nextQuestion = session.quiz.questions[nextIndex];
        
        // Send updated leaderboard first
        const currentScores = session.players
          .sort((a, b) => b.score - a.score)
          .map(p => ({ name: p.name, score: p.score }));
        nsp.to(session.code).emit('leaderboard:update', currentScores);
        
        // Then show next question
        nsp.to(session.code).emit('question:show', {
          index: nextIndex,
          text: nextQuestion.text,
          options: nextQuestion.options,
          timeLimitSec: nextQuestion.timeLimitSec || 30
        });

        cb?.({ ok: true });
        
      } catch (err) {
        console.error('Next question error:', err);
        cb?.({ error: 'Failed to advance question' });
      }
    });

    // Player answers 
    socket.on('player:answer', async ({ questionIndex, answerIndex }, cb) => {
      try {
        const state = socketsState.get(socket.id);
        if (!state || state.isHost) return cb?.({ error: 'Not authorized as player' });
        
        const session = await LiveSession.findById(state.sessionId).populate('quiz');
        if (!session) return cb?.({ error: 'Session not found' });
        if (session.status !== 'live') return cb?.({ error: 'Quiz not live' });
        if (questionIndex !== session.currentQuestionIndex) {
          return cb?.({ error: 'Question mismatch' });
        }

        const question = session.quiz.questions[questionIndex];
        if (!question) return cb?.({ error: 'Question not found' });

        const isCorrect = answerIndex === question.correctIndex;

        // Save/update response in Response collection 
        await Response.findOneAndUpdate(
          { 
            session: session._id, 
            playerId: state.playerId, 
            questionIndex 
          },
          { 
            answerIndex, 
            correct: isCorrect 
          },
          { 
            new: true, 
            upsert: true, 
            setDefaultsOnInsert: true 
          }
        );

        cb?.({ ok: true, correct: isCorrect });
        
      } catch (err) {
        console.error('Player answer error:', err);
        cb?.({ error: 'Answer submission failed' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      const state = socketsState.get(socket.id);
      if (!state) return;
      
      socketsState.delete(socket.id);
      
     
      try {
        if (!state.isHost && state.sessionId) {
          const session = await LiveSession.findById(state.sessionId);
          if (session && session.status === 'waiting') {
            // Only remove from lobby if session hasn't started
            session.players = session.players.filter(p => p.playerId !== state.playerId);
            await session.save();
            
            nsp.to(session.code).emit('lobby:update', 
              session.players.map(p => ({ name: p.name, score: p.score }))
            );
          }
        }
      } catch (err) {
        console.error('Disconnect cleanup error:', err);
      }
    });
  });
};