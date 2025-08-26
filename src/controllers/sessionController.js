const mongoose = require('mongoose');
const LiveSession = require('../models/LiveSession');
const Quiz = require('../models/Quiz');
const { customAlphabet } = require('nanoid');
const generateJoinCode = require('../utils/generateCode');

// CREATE SESSION
exports.createSession = async (req, res, next) => {
  try {
    const { quizId, hostName } = req.body;
    if (!quizId) return res.status(400).json({ error: 'quizId is required' });

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Generate unique code
    let code;
    for (let i = 0; i < 5; i++) {
      code = generateJoinCode();
      const exists = await LiveSession.findOne({ code });
      if (!exists) break;
      code = null;
    }
    if (!code) return res.status(500).json({ error: 'Could not generate code, try again' });

    const hostKey = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16)();

    const session = await LiveSession.create({
      quiz: quiz._id,
      hostName: hostName || 'Host',
      hostKey,
      code
    });

    res.status(201).json({
      sessionId: session._id,
      code: session.code,
      hostKey: session.hostKey
    });
  } catch (err) {
    next(err);
  }
};

// JOIN SESSION
exports.joinSession = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Player name is required' });

    const session = await LiveSession.findOne({ code });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Check duplicate name
    const exists = session.participants.some(p => p.name === name);
    if (exists) return res.status(400).json({ error: 'Player name already taken in this session' });

    session.participants.push({
      playerId: customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12)(),
      name,
      score: 0
    });

    await session.save();

    res.status(200).json({
      message: `${name} joined successfully`,
      sessionId: session._id,
      participants: session.participants
    });
  } catch (err) {
    next(err);
  }
};

// GET SESSION BY CODE
exports.getSessionByCode = async (req, res, next) => {
  try {
    const session = await LiveSession.findOne({ code: req.params.code }).populate('quiz');
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({
      sessionId: session._id,
      status: session.status,
      code: session.code,
      quiz: session.quiz ? {
        title: session.quiz.title,
        questionsCount: session.quiz.questions?.length || 0
      } : null,
      playersCount: session.participants?.length || 0
    });
  } catch (err) {
    next(err);
  }
};

// START SESSION (HOST ONLY)
exports.startSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { hostKey } = req.body;

    const session = await LiveSession.findById(id).populate('quiz');
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (session.hostKey !== hostKey) return res.status(403).json({ error: "Unauthorized: invalid host key" });
    if (session.status === "ended") return res.status(400).json({ error: "Session has already ended" });

    // Resume if already live
    if (session.status === "live") {
      return res.status(200).json({
        message: "Session already live (resumed)",
        sessionId: session._id,
        currentQuestionIndex: session.currentQuestionIndex,
        status: session.status
      });
    }

    // Start fresh
    session.status = "live";
    session.currentQuestionIndex = 0;
    await session.save();

    res.status(200).json({
      message: "Session started successfully",
      sessionId: session._id,
      currentQuestionIndex: session.currentQuestionIndex,
      status: session.status
    });
  } catch (err) {
    console.error("Error starting session:", err);
    res.status(500).json({ error: "Failed to start session" });
  }
};

exports.getCurrentQuestion = async (req, res) => {
  try {
    const { code } = req.params;

    const session = await LiveSession.findOne({ code }).populate("quiz");
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (!session.quiz || !session.quiz.questions.length) {
      return res.status(404).json({ error: "Quiz not found or empty" });
    }

    if (session.currentQuestionIndex < 0) {
      return res.status(200).json({ message: "No question started yet" });
    }

    const currentQuestion = session.quiz.questions[session.currentQuestionIndex];

    res.status(200).json({
      sessionId: session._id,
      questionIndex: session.currentQuestionIndex,
      question: {
        text: currentQuestion.questionText,
        options: currentQuestion.options
      },
      status: session.status
    });
  } catch (err) {
    console.error("Error fetching current question:", err);
    res.status(500).json({ error: "Error fetching current question" });
  }
};

// NEXT QUESTION
exports.nextQuestion = async (req, res) => {
  try {
    const { code } = req.params;

    const session = await LiveSession.findOne({ code }).populate("quiz");
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (!session.quiz || !session.quiz.questions.length) {
      return res.status(404).json({ error: "Quiz not found or empty" });
    }

    // move to next question
    session.currentQuestionIndex += 1;

    if (session.currentQuestionIndex >= session.quiz.questions.length) {
      session.status = "ended"; // quiz finished
      await session.save();
      return res.status(200).json({ message: "Quiz ended" });
    }

    await session.save();
    const currentQuestion = session.quiz.questions[session.currentQuestionIndex];

    res.status(200).json({
      sessionId: session._id,
      questionIndex: session.currentQuestionIndex,
      question: {
        text: currentQuestion.questionText,
        options: currentQuestion.options
      },
      status: session.status
    });
  } catch (err) {
    console.error("Error moving to next question:", err);
    res.status(500).json({ error: "Error moving to next question" });
  }
};

//Submit Answer

exports.submitAnswer = async (req, res) => {
  try {
    const { sessionId, participantName, selectedOption } = req.body;

    const session = await LiveSession.findById(sessionId).populate("quiz");
    if (!session) return res.status(404).json({ error: "Session not found" });

    const questionIndex = session.currentQuestionIndex;
    const question = session.quiz.questions[questionIndex];
    if (!question) return res.status(404).json({ error: "No current question" });

    const participant = session.participants.find(p => p.name === participantName);
    if (!participant) return res.status(404).json({ error: "Participant not found" });

    // check correctness
    const isCorrect = question.correctAnswer === selectedOption;

    // prevent duplicate answers for same question
    const alreadyAnswered = participant.answers.find(a => a.questionIndex === questionIndex);
    if (alreadyAnswered) {
      return res.status(400).json({ error: "Already answered this question" });
    }

    // save answer
    participant.answers.push({ questionIndex, selectedOption, isCorrect });
    if (isCorrect) participant.score += 1;

    await session.save();

    res.status(200).json({
      correct: isCorrect,
      correctAnswer: question.correctAnswer, // helpful for showing feedback
      score: participant.score,
      total: session.quiz.questions.length
    });
  } catch (err) {
    console.error("Error submitting answer:", err);
    res.status(500).json({ error: "Error submitting answer" });
  }
};

// LEADERBOARD
exports.leaderboard = async (req, res, next) => {
  try {
    const session = await LiveSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const players = session.participants.sort((a,b) => b.score - a.score);
    res.json({ players });
  } catch (err) {
    next(err);
  }
};
