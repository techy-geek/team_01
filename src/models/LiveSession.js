// CORRECTED LIVESESSION SCHEMA (models/LiveSession.js)
// ==========================================

const mongoose = require('mongoose');
const { Schema } = mongoose;

// CRITICAL FIX: Schema must match what live.js expects
const participantSchema = new Schema({
  playerId: { type: String, required: true }, // live.js uses playerId, not socketId
  name: { type: String, required: true },
  score: { type: Number, default: 0 }
  // REMOVED: answers array (use Response collection as single source of truth)
  // REMOVED: socketId (not needed, playerId serves this purpose)
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
  
  // CRITICAL FIX: Changed from 'participants' to 'players' to match live.js
  players: [participantSchema]
}, { timestamps: true });

module.exports = mongoose.model('LiveSession', liveSessionSchema);

// ==========================================
// CORRECTED LIVE.JS SOCKET LOGIC
// ==========================================
