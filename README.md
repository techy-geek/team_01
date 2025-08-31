🧑‍🏫 Quiz App (Host + Players)

A real-time quiz application built with Node.js, Express, and MongoDB.
This project allows a host to create and run live quizzes, while players can join using a unique code.

🚀 Features

🔑 Host Authentication (Signup & Login using JWT)

🏁 Host Controls: Start, control, and end quizzes

🎮 Players: Join quizzes directly via a code (no signup/login needed)

❓ Question Flow: One question at a time

📝 Answer Submission: Players submit answers for each question

📊 Live Leaderboard: Updates after every question

🏆 Final Leaderboard: Shown after the quiz ends

🛠️ Tech Stack

Backend: Node.js, Express.js

Database: MongoDB (Mongoose ODM)

Authentication: JWT (JSON Web Tokens)

Other Tools: bcryptjs, nodemon, dotenv

📂 Project Structure
quiz-app/
│── models/
│   ├── Host.js
│   ├── Quiz.js
│   ├── LiveSession.js
│── routes/
│   ├── authRoutes.js
│   ├── quizRoutes.js
│── middleware/
│   ├── authMiddleware.js
│── server.js
│── package.json
│── README.md

