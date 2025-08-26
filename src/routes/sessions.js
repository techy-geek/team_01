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

//Next Question
router.post("/:code/next", sessionController.nextQuestion);

//Submit the answer
router.post("/submit-answer", sessionController.submitAnswer);

// Leaderboard
router.get('/:id/leaderboard', sessionController.leaderboard);

module.exports = router;
