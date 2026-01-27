-- CHAKRAVYUH Round 3 Database Schema
-- PostgreSQL Database Setup

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS user_intro_state CASCADE;
DROP TABLE IF EXISTS leaderboard CASCADE;
DROP TABLE IF EXISTS question_time_tracking CASCADE;
DROP TABLE IF EXISTS team_state CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS team_questions CASCADE;
DROP TABLE IF EXISTS question_bank CASCADE;
DROP TABLE IF EXISTS round_config CASCADE;
DROP TABLE IF EXISTS judges CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- Teams table
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(50) UNIQUE NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  access_token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Judges table
CREATE TABLE judges (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Round configuration
CREATE TABLE round_config (
  id SERIAL PRIMARY KEY,
  round_state VARCHAR(50) DEFAULT 'LOCKED', -- LOCKED, ACTIVE, COMPLETED, LEADERBOARD_PUBLISHED
  mcq_correct_points INT DEFAULT 10,
  descriptive_max_points INT DEFAULT 15,
  wrong_answer_penalty INT DEFAULT -5,
  three_wrong_penalty INT DEFAULT -20,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Question bank
CREATE TABLE question_bank (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL, -- MCQ, DESCRIPTIVE
  options JSONB, -- For MCQ: {"A": "...", "B": "...", "C": "...", "D": "..."}
  correct_answer TEXT, -- For MCQ: "A", "B", etc. NEVER sent to frontend
  max_points INT DEFAULT 15,
  difficulty VARCHAR(20),
  question_set_id INT DEFAULT 1, -- For organizing different sets
  created_at TIMESTAMP DEFAULT NOW()
);

-- Team question assignments (which questions are assigned to which team)
CREATE TABLE team_questions (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES teams(id) ON DELETE CASCADE,
  question_id INT REFERENCES question_bank(id),
  question_position INT, -- 1-7 (representing 7 team members)
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, question_position)
);

-- Submissions
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES teams(id) ON DELETE CASCADE,
  question_id INT REFERENCES question_bank(id),
  question_position INT,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN, -- For MCQ auto-eval
  points_awarded INT DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT NOW(),
  evaluated_at TIMESTAMP,
  evaluated_by INT REFERENCES judges(id)
);

-- Team state (tracks current progress)
CREATE TABLE team_state (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  current_question_position INT DEFAULT 1, -- 1-7
  total_score INT DEFAULT 0,
  wrong_answer_count INT DEFAULT 0,
  question_set_number INT DEFAULT 1, -- Increments when 3 wrong answers
  is_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Time tracking
CREATE TABLE question_time_tracking (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES teams(id) ON DELETE CASCADE,
  question_position INT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Leaderboard (manual rankings)
CREATE TABLE leaderboard (
  id SERIAL PRIMARY KEY,
  team_id INT REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  final_score INT NOT NULL,
  manual_rank INT, -- Judge assigns this
  notes TEXT, -- Judge notes for ranking decisions
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Intro video state (optional, can use localStorage instead)
CREATE TABLE user_intro_state (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE,
  has_watched_intro BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default round config
INSERT INTO round_config (round_state, mcq_correct_points, descriptive_max_points, wrong_answer_penalty, three_wrong_penalty, is_locked)
VALUES ('LOCKED', 10, 15, -5, -20, false);

-- Create indexes for better performance
CREATE INDEX idx_team_questions_team ON team_questions(team_id);
CREATE INDEX idx_submissions_team ON submissions(team_id);
CREATE INDEX idx_submissions_question ON submissions(question_id);
CREATE INDEX idx_team_state_team ON team_state(team_id);
