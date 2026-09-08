# Eloquence '26 - Symposium MCQ / Online Quiz Examination Platform

A complete, full-stack, production-ready online examination platform engineered for high-stakes university symposium quizzes with automated anti-cheating proctoring, server-authoritative countdown timers, real-time autosave, server-side scoring, dynamic leaderboards, and multi-round qualification workflows (Round 1 Prelims → Round 2 Grand Finals).

---

## 🚀 Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS (default clean White/Light theme with smooth Dark Mode toggle), React Router v6, Axios, Lucide Icons.
- **Backend:** Node.js, Express.js REST API, JSON Web Tokens (JWT), BCrypt, Helmet, CORS, Rate Limiting, Winston-like Logger.
- **Database:** Supabase PostgreSQL with Row Level Security (RLS) policies, Stored Procedures, and seed data.

---

## 📂 Project Structure

```
eloquence26_quiz_new/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # ThemeToggle, Modal, Toast, StatsCard, Badge, Loading, Chart
│   │   │   ├── admin/          # QuestionModal, QuizModal, CSVUploadModal
│   │   │   ├── participant/    # QuizCard
│   │   │   └── exam/           # ExamHeader, QuestionPalette, ViolationWarningModal
│   │   ├── pages/
│   │   │   ├── auth/           # LoginPage, RegisterPage, ForgotPasswordPage
│   │   │   ├── admin/          # Dashboard, Participants, Quizzes, Questions, Schedule, LiveExams, Results, RoundSelection, SecondRound, Announcements, Violations, Reports, Settings
│   │   │   ├── participant/    # Dashboard, AvailableQuizzes, RoundStatus, ResultsHistory
│   │   │   └── exam/           # ExamInstructions, ExamArena, ExamSubmitted, ExamTerminated
│   │   ├── layouts/            # AdminLayout, ParticipantLayout, ExamLayout, AuthLayout
│   │   ├── routes/             # AppRoutes, ProtectedRoute
│   │   ├── context/            # AuthContext, ThemeContext, ToastContext
│   │   ├── hooks/              # useAntiCheating, useFullscreen
│   │   ├── security/           # antiCheatingDetector.js
│   │   ├── services/           # api, authService, quizService, examService, adminService
│   │   ├── utils/              # constants, formatters
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── config/             # env, supabase, db store
│   │   ├── controllers/        # auth, admin, quiz, question, participant, exam, result, round, security, announcement, report
│   │   ├── middleware/         # authMiddleware, roleMiddleware, securityMiddleware, errorHandler
│   │   ├── routes/             # modular REST endpoints
│   │   ├── services/           # scoringService, timerService, sessionService, roundSelectionService, auditService
│   │   ├── utils/              # jwtHelper, responseHelper, logger
│   │   ├── app.js
│   │   └── server.js
│   ├── .env
│   └── package.json
├── database/
│   ├── schema.sql              # Complete PostgreSQL schema
│   ├── policies.sql            # Supabase Row Level Security (RLS) policies
│   ├── functions.sql           # Stored functions (scoring, ranking, auto-select)
│   └── seed.sql                # Default admin, participants, questions, quizzes, settings
├── README.md
└── .gitignore
```

---

## 🔑 Default Credentials & Quick Login

### 1. Admin Login
- **Email:** `admin@eloquence.com`
- **Password:** `admin123`
- **Role:** `ADMIN` (Access to Admin Dashboard, Live Monitor, Question Bank, Round Selection)

### 2. Participant Login
- **Email / ID:** `alex.chen@university.edu` or `ELQ-2026-001`
- **Password:** `participant123`
- **Role:** `PARTICIPANT` (Access to Participant Portal, Exam Arena, Scorecards)

---

## ⚙️ Environment Variables

### Backend `.env` (`backend/.env`)
```env
PORT=5001
SUPABASE_URL=https://wsduykedgwqkcqqazqsv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZHV5a2VkZ3dxa2NxcWF6cXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMjY1MDIsImV4cCI6MjEwMzkwMjUwMn0.eGJpCp_aeK6i3zazyTFjaW3J2VYAaMnkFUHDVoIpqAw
VITE_API_BASE_URL=https://eloquence2k26-quiz.onrender.com
JWT_SECRET=eloquence_symposium_jwt_secret_key_2026_super_secure
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

### Frontend `.env` (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5001
VITE_SUPABASE_URL=https://wsduykedgwqkcqqazqsv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZHV5a2VkZ3dxa2NxcWF6cXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMjY1MDIsImV4cCI6MjEwMzkwMjUwMn0.eGJpCp_aeK6i3zazyTFjaW3J2VYAaMnkFUHDVoIpqAw
```

---

## 🛠️ Step-by-Step Installation & Running

### 1. Backend Server Setup
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:5001`.

### 2. Frontend Application Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 🗄️ Database Setup (Supabase)

To execute the database migrations in your Supabase SQL editor:
1. Open Supabase Dashboard → **SQL Editor**.
2. Run `database/schema.sql`.
3. Run `database/functions.sql`.
4. Run `database/policies.sql`.
5. Run `database/seed.sql`.

---

## 🛡️ Key Features & Anti-Cheating Architecture

1. **Strict Server-Side Grading & Validation:**
   - Correct answers and explanations are **never** exposed to client browsers during active examinations.
   - All marks, negative deductions, and leaderboard rankings are computed and verified server-side.

2. **Server-Authoritative Exam Timers:**
   - Started and expiration timestamps are registered on the server.
   - Client countdown clock synchronizes against server time; auto-submits instantly when expiry is reached.

3. **Multi-Vector Automated Proctoring:**
   - Fullscreen enforcement via Fullscreen API.
   - Tab switch detection (`visibilitychange`) and window focus loss (`blur`).
   - Disables copy, cut, paste, and right-click context menus.
   - Blocks DevTools inspection and system hotkeys (`F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+C`, `Ctrl+V`, `Ctrl+P`, `Ctrl+S`, `Ctrl+U`).
   - Configurable violation threshold (Default: 3 warnings before automatic test termination).

4. **Single Active Session Control:**
   - Dedicated `session_id` per attempt prevents simultaneous multi-window / multi-device access.

5. **Multi-Round Symposium Progression (Round 1 → Round 2):**
   - Round 1 Leaderboard with "Auto Select Top N" algorithm + manual override.
   - "Publish Round 1 Selection" automatically unlocks Round 2 for selected finalists while restricting non-qualifiers.

6. **Live Admin Monitoring & Remote Control:**
   - Live telemetry grid showing active participants, remaining time, answered questions count, and real-time violation logs.
   - Admin remote controls: Disqualify/Force-Terminate Attempt, Extend Exam Time (+5/+10 mins).

---

## 📦 Production Build Commands

```bash
# Frontend production bundle
cd frontend
npm run build

# Preview production build locally
npm run preview
```
