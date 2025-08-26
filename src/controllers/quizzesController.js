const Quiz = require('../models/Quiz');

// Create a new quiz
const createQuiz = async (req, res) => {
  try {
    const { title, questions } = req.body;

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    const quiz = new Quiz({
      title,
      questions: questions || [] // allow empty quiz
    });

    await quiz.save();

    res.status(201).json({
      message: "Quiz created successfully",
      quiz
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a quiz by ID
const getQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    next(err);
  }
};

// Add a new question to quiz
const addQuestion = async (req, res, next) => {
  try {
    const { text, options, correctIndex, points, timeLimitSec } = req.body;

    if (!text || !Array.isArray(options) || typeof correctIndex !== 'number') {
      return res.status(400).json({ error: 'text, options[], correctIndex required' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    quiz.questions.push({
      text,
      options,
      correctIndex,
      points: points || 1,
      timeLimitSec: timeLimitSec || 30
    });

    quiz.isDraft = false; // mark published once a question is added
    await quiz.save();

    res.status(201).json(quiz);
  } catch (err) {
    next(err);
  }
};

module.exports = { createQuiz, getQuiz, addQuestion };
