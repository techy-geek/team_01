
const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true },
  playerId: { type: String, required: true },
  questionIndex: { type: Number, required: true },
  answerIndex: { type: Number, required: true },
  correct: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  timeTakenMs: { type: Number, default: 0 },
}, { timestamps: true });

ResponseSchema.index({ session: 1, playerId: 1, questionIndex: 1 }, { unique: true });

module.exports = mongoose.model('Response', ResponseSchema);
