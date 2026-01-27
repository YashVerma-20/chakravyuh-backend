const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'chakravyuh.db'));
db.pragma('foreign_keys = ON');

console.log('🗄️  Creating database tables...\n');

/* =========================
   DROP & CREATE TABLES
   ========================= */
db.exec(`
  DROP TABLE IF EXISTS leaderboard;
  DROP TABLE IF EXISTS question_time_tracking;
  DROP TABLE IF EXISTS team_state;
  DROP TABLE IF EXISTS submissions;
  DROP TABLE IF EXISTS team_questions;
  DROP TABLE IF EXISTS question_bank;
  DROP TABLE IF EXISTS round_config;
  DROP TABLE IF EXISTS judges;
  DROP TABLE IF EXISTS teams;

  CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT UNIQUE NOT NULL,
    team_name TEXT NOT NULL,
    access_token TEXT UNIQUE NOT NULL,
    is_dummy INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE judges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE round_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_state TEXT DEFAULT 'LOCKED',
    mcq_correct_points INTEGER DEFAULT 10,
    descriptive_max_points INTEGER DEFAULT 15,
    wrong_answer_penalty INTEGER DEFAULT -5,
    three_wrong_penalty INTEGER DEFAULT -20,
    is_locked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE question_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,
    options TEXT,
    correct_answer TEXT,
    max_points INTEGER DEFAULT 15,
    difficulty TEXT,
    question_set_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE team_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER,
    question_id INTEGER,
    question_position INTEGER,
    assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (question_id) REFERENCES question_bank(id),
    UNIQUE(team_id, question_position)
  );

  CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER,
    question_id INTEGER,
    question_position INTEGER,
    answer_text TEXT NOT NULL,
    is_correct INTEGER,
    points_awarded INTEGER DEFAULT 0,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    evaluated_at TEXT,
    evaluated_by INTEGER,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (question_id) REFERENCES question_bank(id),
    FOREIGN KEY (evaluated_by) REFERENCES judges(id)
  );

  CREATE TABLE team_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER UNIQUE,
    current_question_position INTEGER DEFAULT 1,
    total_score INTEGER DEFAULT 0,
    wrong_answer_count INTEGER DEFAULT 0,
    question_set_number INTEGER DEFAULT 1,
    is_completed INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (team_id) REFERENCES teams(id)
  );

  CREATE TABLE question_time_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER,
    question_position INTEGER,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    FOREIGN KEY (team_id) REFERENCES teams(id)
  );

  CREATE TABLE leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER UNIQUE,
    final_score INTEGER NOT NULL,
    manual_rank INTEGER,
    notes TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
  );
`);

console.log('✅ Tables created\n');

/* =========================
   SEED JUDGES
   ========================= */
const pass = bcrypt.hashSync('admin123', 10);
const judgeStmt = db.prepare(
  'INSERT INTO judges (username, password_hash) VALUES (?, ?)'
);

judgeStmt.run('admin', pass);
judgeStmt.run('judge1', pass);

console.log('✅ Judges created\n');

/* =========================
   SEED TEAMS
   ========================= */
// 16 Real Teams
const realTeams = [
  ['TEAM_BB', 'Binary Brains', 'TEAM_BB001_2026', 0],
  ['TEAM_TI', 'Three Idiots', 'TEAM_TI002_2026', 0],
  ['TEAM_E404', 'Error 404 (brain not found)', 'TEAM_E404003_2026', 0],
  ['TEAM_DUO', 'Duo', 'TEAM_DUO004_2026', 0],
  ['TEAM_TL', 'Trinetra Legion', 'TEAM_TL005_2026', 0],
  ['TEAM_CF', 'cat food', 'TEAM_CF006_2026', 0],
  ['TEAM_CGPT', 'team chatgpt', 'TEAM_CGPT007_2026', 0],
  ['TEAM_IX', 'Innovation X', 'TEAM_IX008_2026', 0],
  ['TEAM_TF', 'Twin Flames', 'TEAM_TF009_2026', 0],
  ['TEAM_TJ', 'The Jacks', 'TEAM_TJ010_2026', 0],
  ['TEAM_MV', 'ManasVerse', 'TEAM_MV011_2026', 0],
  ['TEAM_LL', 'Logic Labs', 'TEAM_LL012_2026', 0],
  ['TEAM_HW', 'hello world', 'TEAM_HW013_2026', 0],
  ['TEAM_XU', 'Xavier uncle', 'TEAM_XU014_2026', 0],
  ['TEAM_T3', 'Team Teen Tandav - T^3', 'TEAM_T3015_2026', 0],
  ['TEAM_MS', 'Mini Sena', 'TEAM_MS016_2026', 0]
];

// 8 Dummy Teams for Testing
const dummyTeams = [
  ['DUMMY_01', 'DUMMY_TEAM_1', 'DUMMY_TEST_001_2026', 1],
  ['DUMMY_02', 'DUMMY_TEAM_2', 'DUMMY_TEST_002_2026', 1],
  ['DUMMY_03', 'DUMMY_TEAM_3', 'DUMMY_TEST_003_2026', 1],
  ['DUMMY_04', 'DUMMY_TEAM_4', 'DUMMY_TEST_004_2026', 1],
  ['DUMMY_05', 'DUMMY_TEAM_5', 'DUMMY_TEST_005_2026', 1],
  ['DUMMY_06', 'DUMMY_TEAM_6', 'DUMMY_TEST_006_2026', 1],
  ['DUMMY_07', 'DUMMY_TEAM_7', 'DUMMY_TEST_007_2026', 1],
  ['DUMMY_08', 'DUMMY_TEAM_8', 'DUMMY_TEST_008_2026', 1]
];

const teamStmt = db.prepare(
  'INSERT INTO teams (team_id, team_name, access_token, is_dummy) VALUES (?, ?, ?, ?)'
);

// Insert real teams
realTeams.forEach(t => teamStmt.run(t[0], t[1], t[2], t[3]));
console.log('✅ 16 Real teams created');

// Insert dummy teams
dummyTeams.forEach(t => teamStmt.run(t[0], t[1], t[2], t[3]));
console.log('✅ 8 Dummy teams created (for testing)');
console.log('✅ Total 24 teams initialized\n');

/* =========================
   ROUND CONFIG
   ========================= */
db.prepare(
  'INSERT INTO round_config (id, round_state) VALUES (1, ?)'
).run('LOCKED');

console.log('✅ Round config created\n');

console.log('🎉 Database schema ready (NO questions seeded)\n');

db.close();