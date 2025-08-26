const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  createdBy: { type: String, default: "host" },
  isDraft: { type: Boolean, default: true },
  code: {
    type: String,
    unique: true,
    default: () =>
      Math.random().toString(36).substring(2, 8).toUpperCase() // e.g. "A1B2C3"
  },
  questions: [
    {
      questionText: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: Number, required: true }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
