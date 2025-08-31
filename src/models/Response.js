const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true },
  playerId: { type: String, required: true },
  questionIndex: { type: Number, required: true },
  answerIndex: { type: Number, required: true },
  correct: { type: Boolean, required: true },
  submittedAt: { type: Date, default: Date.now }
});

responseSchema.index({ session: 1, playerId: 1, questionIndex: 1 }, { unique: true });

module.exports = mongoose.model('Response', responseSchema);
