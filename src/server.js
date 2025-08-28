
const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const quizzesRoutes = require('./routes/quizzes');
const sessionsRoutes = require('./routes/sessions');
const initLiveSockets = require('./sockets/live');
const authRoutes = require( "./routes/authRoutes.js");



dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*'}));

// Authorisation and Login and Signup
app.use("/api/auth", authRoutes);

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// REST routes
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/sessions', sessionsRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// DB
connectDB();

// HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*' }
});

initLiveSockets(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
