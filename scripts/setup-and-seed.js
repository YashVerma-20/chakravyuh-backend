const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function setupAndSeed() {
    try {
        console.log('🗄️  Setting up SQLite database...\n');

        // Create tables (SQLite syntax)
        const schema = `
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id TEXT UNIQUE NOT NULL,
        team_name TEXT NOT NULL,
        access_token TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS judges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS round_config (
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

      CREATE TABLE IF NOT EXISTS question_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT,
        max_points INTEGER DEFAULT 15,
        difficulty TEXT,
        question_set_id INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS team_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER,
        question_id INTEGER,
        question_position INTEGER,
        assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES question_bank(id),
        UNIQUE(team_id, question_position)
      );

      CREATE TABLE IF NOT EXISTS submissions (
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
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES question_bank(id),
        FOREIGN KEY (evaluated_by) REFERENCES judges(id)
      );

      CREATE TABLE IF NOT EXISTS team_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER UNIQUE,
        current_question_position INTEGER DEFAULT 1,
        total_score INTEGER DEFAULT 0,
        wrong_answer_count INTEGER DEFAULT 0,
        question_set_number INTEGER DEFAULT 1,
        is_completed INTEGER DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS question_time_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER,
        question_position INTEGER,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER UNIQUE,
        final_score INTEGER NOT NULL,
        manual_rank INTEGER,
        notes TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );
    `;

        // Execute schema
        db.db.exec(schema);
        console.log('✅ Database schema created\n');

        // Seed judges
        const judgePassword = await bcrypt.hash('admin123', 10);
        db.db.prepare('INSERT OR IGNORE INTO judges (username, password_hash) VALUES (?, ?)').run('admin', judgePassword);
        db.db.prepare('INSERT OR IGNORE INTO judges (username, password_hash) VALUES (?, ?)').run('judge1', judgePassword);
        console.log('✅ Created judges: admin/admin123, judge1/admin123\n');

        // Seed teams
        const teams = [
            { team_id: 'TEAM_A', team_name: 'Phoenix Warriors', token: 'PHX2026WARRIOR' },
            { team_id: 'TEAM_B', team_name: 'Cyber Ninjas', token: 'CYB2026NINJA' },
            { team_id: 'TEAM_C', team_name: 'Code Breakers', token: 'CODE2026BREAK' },
            { team_id: 'TEAM_D', team_name: 'Digital Spartans', token: 'DIG2026SPARTAN' },
            { team_id: 'TEAM_E', team_name: 'Tech Titans', token: 'TECH2026TITAN' }
        ];

        const teamStmt = db.db.prepare('INSERT OR IGNORE INTO teams (team_id, team_name, access_token) VALUES (?, ?, ?)');
        teams.forEach(team => teamStmt.run(team.team_id, team.team_name, team.token));
        console.log('✅ Created 5 teams\n');

        // Seed questions
        const questions = [
            { text: 'What is the time complexity of binary search?', type: 'MCQ', options: JSON.stringify({ A: 'O(n)', B: 'O(log n)', C: 'O(n²)', D: 'O(1)' }), answer: 'B', set: 1 },
            { text: 'Which HTTP method is idempotent?', type: 'MCQ', options: JSON.stringify({ A: 'POST', B: 'DELETE', C: 'PUT', D: 'Both B and C' }), answer: 'D', set: 1 },
            { text: 'Explain polymorphism in OOP with an example.', type: 'DESCRIPTIVE', options: null, answer: null, set: 1 },
            { text: 'What does ACID stand for in database transactions?', type: 'MCQ', options: JSON.stringify({ A: 'Atomicity, Consistency, Isolation, Durability', B: 'Authentication, Credentials, Identity, Data', C: 'Access, Control, Identity, Distribution', D: 'None' }), answer: 'A', set: 1 },
            { text: 'Which port does HTTPS use by default?', type: 'MCQ', options: JSON.stringify({ A: '80', B: '443', C: '8080', D: '3000' }), answer: 'B', set: 1 },
            { text: 'Describe JWT vs session-based authentication.', type: 'DESCRIPTIVE', options: null, answer: null, set: 1 },
            { text: 'What is the purpose of a primary key?', type: 'MCQ', options: JSON.stringify({ A: 'To encrypt data', B: 'To uniquely identify records', C: 'To create indexes', D: 'To backup data' }), answer: 'B', set: 1 }
        ];

        const qStmt = db.db.prepare('INSERT INTO question_bank (question_text, question_type, options, correct_answer, max_points, question_set_id) VALUES (?, ?, ?, ?, ?, ?)');
        questions.forEach(q => qStmt.run(q.text, q.type, q.options, q.answer, q.type === 'MCQ' ? 10 : 15, q.set));
        console.log(`✅ Created ${questions.length} questions\n`);

        // Assign questions to teams
        const teamRows = db.db.prepare('SELECT id FROM teams').all();
        const questionRows = db.db.prepare('SELECT id FROM question_bank WHERE question_set_id = 1 LIMIT 7').all();

        const assignStmt = db.db.prepare('INSERT INTO team_questions (team_id, question_id, question_position) VALUES (?, ?, ?)');
        teamRows.forEach(team => {
            questionRows.forEach((q, idx) => {
                assignStmt.run(team.id, q.id, idx + 1);
            });
        });
        console.log('✅ Assigned questions to all teams\n');

        // Insert default config
        db.db.prepare('INSERT OR IGNORE INTO round_config (id, round_state) VALUES (1, \'LOCKED\')').run();
        console.log('✅ Round config initialized\n');

        console.log('🎉 Database setup and seeding complete!\n');
        console.log('📝 Access Credentials:');
        console.log('   Judge: admin / admin123');
        console.log('   Team Tokens: PHX2026WARRIOR, CYB2026NINJA, CODE2026BREAK, etc.\n');
    } catch (error) {
        console.error('❌ Setup failed:', error);
    }
}

module.exports = setupAndSeed;
