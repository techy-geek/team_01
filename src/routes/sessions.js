const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController.js');

// Create a new session
router.post('/create', sessionController.createSession);

// Get session details by code
router.get('/code/:code', sessionController.getSessionByCode);

// Player joins session
router.post('/join/:code', sessionController.joinSession);

// Host starts the session
router.post('/:id/start', sessionController.startSession);

// Host will control the question
router.get("/:code/current", sessionController.getCurrentQuestion);

//Next Question [ONLY VISIBLE TO HOST]
router.get("/:code/next", sessionController.nextQuestionToHost);

//Next Question
router.post("/:code/next", sessionController.nextQuestion);

//Submit the answer
router.post("/:code/submit", sessionController.submitAnswer);

// Final leaderboard 
router.post("/:code/end", sessionController.endSession);

module.exports = router;
