
const LiveSession = require('../models/LiveSession');
const Quiz = require('../models/Quiz');
const Response = require('../models/Response');

// in-memory map socket.id -> { sessionId, playerId, isHost }
const socketsState = new Map();

module.exports = function initLiveSockets(io) {
  const nsp = io.of('/live');

  nsp.on('connection', (socket) => {
    // Player joins via code
    socket.on('player:join', async ({ code, name }, cb) => {
      try {
        if (!code || !name) return cb?.({ error: 'code and name required' });
        const session = await LiveSession.findOne({ code });
        if (!session) return cb?.({ error: 'Invalid code' });
        if (session.status === 'ended') return cb?.({ error: 'Session ended' });

        // Assign or reuse player
        const playerId = socket.id; // simple; replace with nanoid for persistence
        if (!session.players.find(p => p.playerId === playerId)) {
          session.players.push({ playerId, name });
          await session.save();
        }

        socketsState.set(socket.id, { sessionId: String(session._id), playerId, isHost: false });
        socket.join(session.code);

        // update lobby
        nsp.to(session.code).emit('lobby:update', session.players.map(p => ({ name: p.name, score: p.score })));

        cb?.({ ok: true, sessionId: String(session._id), playerId, status: session.status });
      } catch (err) {
        console.error(err);
        cb?.({ error: 'Join failed' });
      }
    });

    // Host join by sessionId + hostKey
    socket.on('host:join', async ({ sessionId, hostKey }, cb) => {
      try {
        const session = await LiveSession.findById(sessionId).populate('quiz');
        if (!session) return cb?.({ error: 'Session not found' });
        if (session.hostKey !== hostKey) return cb?.({ error: 'Invalid hostKey' });

        socketsState.set(socket.id, { sessionId: String(session._id), playerId: null, isHost: true });
        socket.join(session.code);

        cb?.({ ok: true, code: session.code, status: session.status, currentQuestionIndex: session.currentQuestionIndex });
      } catch (err) {
        console.error(err);
        cb?.({ error: 'Host join failed' });
      }
    });

    // Host starts quiz
    socket.on('host:start', async (cb) => {
      try {
        const state = socketsState.get(socket.id);
        if (!state?.isHost) return cb?.({ error: 'Not host' });
        const session = await LiveSession.findById(state.sessionId).populate('quiz');
        if (!session) return cb?.({ error: 'Session not found' });

        session.status = 'live';
        session.currentQuestionIndex = 0;
        await session.save();

        const q = session.quiz.questions[0];
        nsp.to(session.code).emit('question:show', {
          index: 0,
          text: q.text,
          options: q.options,
          timeLimitSec: q.timeLimitSec
        });

        cb?.({ ok: true });
      } catch (err) {
        console.error(err);
        cb?.({ error: 'Failed to start' });
      }
    });

    // Host moves to next question
    socket.on('host:next', async (cb) => {
      try {
        const state = socketsState.get(socket.id);
        if (!state?.isHost) return cb?.({ error: 'Not host' });
        const session = await LiveSession.findById(state.sessionId).populate('quiz');
        if (!session) return cb?.({ error: 'Session not found' });

        const prevIndex = session.currentQuestionIndex;
        // After previous question, compute points for correct answers
        if (prevIndex >= 0) {
          const quiz = session.quiz;
          const correctIndex = quiz.questions[prevIndex].correctIndex;
          const responses = await Response.find({ session: session._id, questionIndex: prevIndex });
          const mapPoints = new Map();
          for (const r of responses) {
            if (r.answerIndex === correctIndex) {
              mapPoints.set(r.playerId, Math.max(mapPoints.get(r.playerId) || 0, quiz.questions[prevIndex].points));
            }
          }
          // apply points
          session.players = session.players.map(p => {
            const add = mapPoints.get(p.playerId) || 0;
            return { ...p.toObject(), score: p.score + add };
          });
        }

        const nextIndex = prevIndex + 1;
        if (nextIndex >= session.quiz.questions.length) {
          session.status = 'ended';
          await session.save();
          nsp.to(session.code).emit('leaderboard:update', session.players.sort((a,b)=>b.score-a.score));
          nsp.to(session.code).emit('session:ended', { totalQuestions: session.quiz.questions.length });
          return cb?.({ ok: true, ended: true });
        }

        session.currentQuestionIndex = nextIndex;
        await session.save();

        const q = session.quiz.questions[nextIndex];
        nsp.to(session.code).emit('leaderboard:update', session.players.sort((a,b)=>b.score-a.score));
        nsp.to(session.code).emit('question:show', {
          index: nextIndex,
          text: q.text,
          options: q.options,
          timeLimitSec: q.timeLimitSec
        });

        cb?.({ ok: true });
      } catch (err) {
        console.error(err);
        cb?.({ error: 'Failed to go next' });
      }
    });

    // Player answers
    socket.on('player:answer', async ({ questionIndex, answerIndex }, cb) => {
      try {
        const state = socketsState.get(socket.id);
        if (!state || state.isHost) return cb?.({ error: 'Not a player' });
        const session = await LiveSession.findById(state.sessionId).populate('quiz');
        if (!session) return cb?.({ error: 'Session not found' });
        if (session.status !== 'live') return cb?.({ error: 'Not live' });

        // upsert response (unique per player+question)
        const correct = session.quiz.questions[questionIndex]?.correctIndex === answerIndex;
        const doc = await Response.findOneAndUpdate(
          { session: session._id, playerId: state.playerId, questionIndex },
          { $set: { answerIndex, correct } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        cb?.({ ok: true, correct });
      } catch (err) {
        console.error(err);
        cb?.({ error: 'Answer failed' });
      }
    });

    socket.on('disconnect', async () => {
      const state = socketsState.get(socket.id);
      if (!state) return;
      socketsState.delete(socket.id);
      // OPTIONAL: remove player from lobby on disconnect
      try {
        if (!state.isHost) {
          const session = await LiveSession.findById(state.sessionId);
          if (session) {
            session.players = session.players.filter(p => p.playerId !== state.playerId);
            await session.save();
            nsp.to(session.code).emit('lobby:update', session.players.map(p => ({ name: p.name, score: p.score })));
          }
        }
      } catch (e) {}
    });
  });
}
