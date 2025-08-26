const mongoose = require('mongoose');
const { Schema } = mongoose;

const participantSchema = new Schema({
  name: { type: String, required: true },
  socketId: { type: String }, // optional if using sockets
  answers: [
    {
      questionIndex: Number,
      selectedOption: Number,  // which option user picked
      isCorrect: Boolean
    }
  ],
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
  currentQuestionIndex: { type: Number, default: 0 },
  participants: [participantSchema]
}, { timestamps: true });

module.exports = mongoose.model('LiveSession', liveSessionSchema);
