const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true }, // Matches live.js expectation
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true }, // Matches live.js expectation
  points: { type: Number, default: 10 },
  timeLimitSec: { type: Number, default: 30 }
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Host' },
  questions: [questionSchema],
  code: { type: String, unique: true, default: () => Math.random().toString(36).substring(2, 8).toUpperCase() },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);
