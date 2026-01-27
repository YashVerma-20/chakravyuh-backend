# Chakravyuh Backend API

Backend API server for Chakravyuh Round 3 Quiz Platform.

## 🚀 Tech Stack

- **Node.js** + **Express**
- **SQLite** (better-sqlite3)
- **JWT** Authentication
- **bcryptjs** for password hashing

## 📦 Installation

```bash
npm install
```

## 🗄️ Database Setup

```bash
# Initialize database and create tables
node init-db.js

# Add questions to the database
node add-questions.js
```

## ⚙️ Environment Variables

Create a `.env` file:

```env
PORT=5000
NODE_ENV=development
```

## 🎮 Running the Server

```bash
# Development
npm start

# The server will run on http://localhost:5000
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/judge/login` - Judge login
- `POST /api/auth/participant/access` - Participant access

### Participant Routes (Protected)
- `GET /api/participant/question/current` - Get current question
- `POST /api/participant/question/submit` - Submit answer
- `GET /api/participant/status` - Get team status
- `GET /api/participant/leaderboard` - View leaderboard

### Judge Routes (Protected)
- `GET /api/judge/submissions` - View all submissions
- `POST /api/judge/score` - Score descriptive answers
- `POST /api/judge/round/start` - Start round
- `POST /api/judge/round/complete` - Complete round
- `GET /api/judge/leaderboard` - View leaderboard

## 🔐 Default Credentials

**Judge:**
- Username: `admin` or `judge1`
- Password: `admin123`

**Participant:**
- Test Token: `DUMMY_TEST_001_2026`

## 🌐 CORS Configuration

The server is configured to accept requests from:
- `http://localhost:3000`
- `http://localhost:5173`
- `https://chakravuyhcg.vercel.app`
- `https://chakravyuh-kappa.vercel.app`

Update `server.js` to add your frontend URL.

## 📁 Project Structure

```
backend/
├── config/          # Database configuration
├── middleware/      # Auth middleware
├── routes/          # API routes
│   ├── auth.js
│   ├── participant.js
│   └── judge.js
├── init-db.js       # Database initialization
├── add-questions.js # Question seeding
├── server.js        # Main server file
└── package.json
```

## 🚢 Deployment

### Railway.app
1. Connect this GitHub repository
2. Set root directory to backend folder (or deploy from this repo directly)
3. Railway auto-detects Node.js
4. Add environment variables if needed
5. Deploy!

### Render.com
1. Create new Web Service
2. Connect this repository
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variables
6. Deploy!

## 📝 License

Created for Chakravyuh Round 3 coding competition.
