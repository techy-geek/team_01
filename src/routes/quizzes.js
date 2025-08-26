
const router = require('express').Router();
const { createQuiz, getQuiz, addQuestion } = require('../controllers/quizzesController');

// Quiz created
router.post('/', createQuiz);

// Status of the quiz
router.get('/:id', getQuiz);

// Adding the question
router.post('/:id/questions', addQuestion);

module.exports = router;
