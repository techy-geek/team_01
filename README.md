
# Live Quiz Backend (Starter)

A minimal backend to host live quizzes with a sharable join code. Built with **Express**, **MongoDB/Mongoose**, and **Socket.IO**.

## Quick Start

1. **Clone & install**  
   ```bash
   npm install
   ```

2. **Configure environment**  
   Copy `.env.example` to `.env` and set your values.

3. **Run the server**  
   ```bash
   npm run dev
   ```

4. **Test**  
   - Create a quiz: `POST /api/quizzes`  
   - Add a question: `POST /api/quizzes/:id/questions`  
   - Create a live session (get join code): `POST /api/sessions`  
   - In Socket.IO, connect and emit events per `src/sockets/live.js`.

## Environment

```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/quizapp
CLIENT_ORIGIN=http://localhost:5173
```

## Socket Events (Overview)

- `player:join` -> `{ code, name }`
- `host:join` -> `{ sessionId, hostKey }`
- `host:start` -> start first question
- `host:next` -> move to next question / end
- `player:answer` -> `{ questionIndex, answerIndex }`
- Server emits:
  - `lobby:update`, `question:show`, `leaderboard:update`, `session:ended`

## Notes

- For a real deployment, use **Redis** to store ephemeral state and a **JWT** auth layer.
- This starter keeps it simple: state is persisted to MongoDB, with some in-memory maps for sockets.
