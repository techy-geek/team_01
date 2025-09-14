const mongoose = require('mongoose');
const { Schema } = mongoose;
const participantSchema = new Schema({
  playerId: { type: String, required: true }, 
  name: { type: String, required: true },
  score: { type: Number, default: 0 }
});

const liveSessionSchema = new Schema({
  quiz: {
    type: Schema.Types.ObjectId,
    ref: "Quiz", 
    required: true
  },
  hostName: { type: String, required: true },
  hostKey: { type: String, required: true },
  code: { type: String, unique: true, required: true },
  status: { type: String, enum: ["waiting", "live", "ended"], default: "waiting" },
  currentQuestionIndex: { type: Number, default: -1 }, // -1 = not started, 0+ = question index
  players: [participantSchema]
}, { timestamps: true });

module.exports = mongoose.model('LiveSession', liveSessionSchema);