-- CHAKRAVYUH Round 3 Database Schema
-- SQLite Database Setup

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS user_intro_state;
DROP TABLE IF EXISTS leaderboard;
DROP TABLE IF EXISTS question_time_tracking;
DROP TABLE IF EXISTS team_state;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS team_questions;
DROP TABLE IF EXISTS question_bank;
DROP TABLE IF EXISTS round_config;
DROP TABLE IF EXISTS judges;
DROP TABLE IF EXISTS teams;

-- Teams table
CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id VARCHAR(50) UNIQUE NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  access_token VARCHAR(255) UNIQUE NOT NULL,
  is_dummy INTEGER DEFAULT 0, -- Flag to mark testing dummy teams
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Judges table
CREATE TABLE judges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Round configuration
CREATE TABLE round_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_state VARCHAR(50) DEFAULT 'LOCKED', -- LOCKED, ACTIVE, COMPLETED, LEADERBOARD_PUBLISHED
  mcq_correct_points INTEGER DEFAULT 10,
  descriptive_max_points INTEGER DEFAULT 15,
  wrong_answer_penalty INTEGER DEFAULT -5,
  three_wrong_penalty INTEGER DEFAULT -20,
  is_locked INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Question bank
CREATE TABLE question_bank (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL, -- MCQ, DESCRIPTIVE
  options TEXT, -- For MCQ: JSON string {"A": "...", "B": "...", "C": "...", "D": "..."}
  correct_answer TEXT, -- For MCQ: "A", "B", etc. NEVER sent to frontend
  max_points INTEGER DEFAULT 15,
  difficulty VARCHAR(20),
  question_set_id INTEGER DEFAULT 1, -- For organizing different sets
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Team question assignments (which questions are assigned to which team)
CREATE TABLE team_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  question_position INTEGER, -- 1-7 (representing 7 team members)
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES question_bank(id),
  UNIQUE(team_id, question_position)
);

-- Submissions
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  question_position INTEGER,
  answer_text TEXT NOT NULL,
  is_correct INTEGER, -- For MCQ auto-eval (0 or 1)
  points_awarded INTEGER DEFAULT 0,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  evaluated_at DATETIME,
  evaluated_by INTEGER,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES question_bank(id),
  FOREIGN KEY (evaluated_by) REFERENCES judges(id)
);

-- Team state (tracks current progress)
CREATE TABLE team_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER UNIQUE NOT NULL,
  current_question_position INTEGER DEFAULT 1, -- 1-7
  total_score INTEGER DEFAULT 0,
  carry_forward_score INTEGER DEFAULT 0, -- Score from previous rounds, editable before round start
  wrong_answer_count INTEGER DEFAULT 0,
  question_set_number INTEGER DEFAULT 1, -- Increments when 3 wrong answers
  is_completed INTEGER DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Time tracking
CREATE TABLE question_time_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  question_position INTEGER,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Leaderboard (manual rankings)
CREATE TABLE leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER UNIQUE NOT NULL,
  final_score INTEGER NOT NULL,
  manual_rank INTEGER, -- Judge assigns this
  notes TEXT, -- Judge notes for ranking decisions
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Intro video state (optional, can use localStorage instead)
CREATE TABLE user_intro_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id VARCHAR(255) UNIQUE,
  has_watched_intro INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default round config
INSERT INTO round_config (round_state, mcq_correct_points, descriptive_max_points, wrong_answer_penalty, three_wrong_penalty, is_locked)
VALUES ('LOCKED', 10, 15, -5, -20, 0);

-- Create indexes for better performance
CREATE INDEX idx_team_questions_team ON team_questions(team_id);
CREATE INDEX idx_submissions_team ON submissions(team_id);
CREATE INDEX idx_submissions_question ON submissions(question_id);
CREATE INDEX idx_team_state_team ON team_state(team_id);
