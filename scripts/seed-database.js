const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function seedDatabase() {
    try {
        console.log('🌱 Seeding database with mock data...');

        // Create judges
        const judgePassword = await bcrypt.hash('admin123', 10);
        await db.query(
            'INSERT INTO judges (username, password_hash) VALUES ($1, $2), ($3, $4) ON CONFLICT (username) DO NOTHING',
            ['admin', judgePassword, 'judge1', judgePassword]
        );
        console.log('✅ Created judges: admin/admin123, judge1/admin123');

        // Create teams
        const teams = [
            { team_id: 'TEAM_A', team_name: 'Phoenix Warriors', token: 'PHX2026WARRIOR' },
            { team_id: 'TEAM_B', team_name: 'Cyber Ninjas', token: 'CYB2026NINJA' },
            { team_id: 'TEAM_C', team_name: 'Code Breakers', token: 'CODE2026BREAK' },
            { team_id: 'TEAM_D', team_name: 'Digital Spartans', token: 'DIG2026SPARTAN' },
            { team_id: 'TEAM_E', team_name: 'Tech Titans', token: 'TECH2026TITAN' }
        ];

        for (const team of teams) {
            await db.query(
                'INSERT INTO teams (team_id, team_name, access_token) VALUES ($1, $2, $3) ON CONFLICT (team_id) DO NOTHING',
                [team.team_id, team.team_name, team.token]
            );
        }
        console.log('✅ Created 5 teams');

        // Create question bank (Set 1)
        const questionsSet1 = [
            {
                text: 'What is the time complexity of binary search?',
                type: 'MCQ',
                options: { A: 'O(n)', B: 'O(log n)', C: 'O(n²)', D: 'O(1)' },
                answer: 'B',
                set: 1
            },
            {
                text: 'Which HTTP method is idempotent?',
                type: 'MCQ',
                options: { A: 'POST', B: 'DELETE', C: 'PUT', D: 'Both B and C' },
                answer: 'D',
                set: 1
            },
            {
                text: 'Explain the concept of polymorphism in OOP with an example.',
                type: 'DESCRIPTIVE',
                options: null,
                answer: null,
                set: 1
            },
            {
                text: 'What does ACID stand for in database transactions?',
                type: 'MCQ',
                options: { A: 'Atomicity, Consistency, Isolation, Durability', B: 'Authentication, Credentials, Identity, Data', C: 'Access, Control, Identity, Distribution', D: 'None of the above' },
                answer: 'A',
                set: 1
            },
            {
                text: 'Which port does HTTPS use by default?',
                type: 'MCQ',
                options: { A: '80', B: '443', C: '8080', D: '3000' },
                answer: 'B',
                set: 1
            },
            {
                text: 'Describe the difference between JWT and session-based authentication.',
                type: 'DESCRIPTIVE',
                options: null,
                answer: null,
                set: 1
            },
            {
                text: 'What is the purpose of a primary key in a database?',
                type: 'MCQ',
                options: { A: 'To encrypt data', B: 'To uniquely identify records', C: 'To create indexes', D: 'To backup data' },
                answer: 'B',
                set: 1
            },
            {
                text: 'In React, what is the difference between props and state?',
                type: 'MCQ',
                options: { A: 'Props are mutable, state is immutable', B: 'Props are passed from parent, state is internal', C: 'They are the same', D: 'State cannot be updated' },
                answer: 'B',
                set: 1
            },
            {
                text: 'Explain how async/await works in JavaScript.',
                type: 'DESCRIPTIVE',
                options: null,
                answer: null,
                set: 1
            },
            {
                text: 'What does REST stand for?',
                type: 'MCQ',
                options: { A: 'Remote Execution State Transfer', B: 'Representational State Transfer', C: 'Resource Execution System Technology', D: 'Relative State Transmission' },
                answer: 'B',
                set: 1
            }
        ];

        // Create question bank (Set 2 - for 3-wrong-answer penalty)
        const questionsSet2 = [
            {
                text: 'What is the purpose of Docker containers?',
                type: 'MCQ',
                options: { A: 'Database management', B: 'Application isolation', C: 'Code compilation', D: 'Network routing' },
                answer: 'B',
                set: 2
            },
            {
                text: 'Which SQL command is used to retrieve data?',
                type: 'MCQ',
                options: { A: 'INSERT', B: 'UPDATE', C: 'SELECT', D: 'DELETE' },
                answer: 'C',
                set: 2
            },
            {
                text: 'Explain the concept of event loop in Node.js.',
                type: 'DESCRIPTIVE',
                options: null,
                answer: null,
                set: 2
            },
            {
                text: 'What does API stand for?',
                type: 'MCQ',
                options: { A: 'Application Programming Interface', B: 'Advanced Protocol Integration', C: 'Automated Process Interaction', D: 'Application Process Interface' },
                answer: 'A',
                set: 2
            },
            {
                text: 'Which Git command is used to save changes?',
                type: 'MCQ',
                options: { A: 'git save', B: 'git commit', C: 'git push', D: 'git store' },
                answer: 'B',
                set: 2
            },
            {
                text: 'Describe the MVC architecture pattern.',
                type: 'DESCRIPTIVE',
                options: null,
                answer: null,
                set: 2
            },
            {
                text: 'What is the default port for MongoDB?',
                type: 'MCQ',
                options: { A: '3306', B: '5432', C: '27017', D: '8080' },
                answer: 'C',
                set: 2
            }
        ];

        const allQuestions = [...questionsSet1, ...questionsSet2];

        for (const q of allQuestions) {
            await db.query(
                `INSERT INTO question_bank (question_text, question_type, options, correct_answer, max_points, question_set_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [q.text, q.type, q.options ? JSON.stringify(q.options) : null, q.answer, q.type === 'MCQ' ? 10 : 15, q.set]
            );
        }
        console.log(`✅ Created ${allQuestions.length} questions (2 sets)`);

        // Assign questions to teams (Set 1)
        const teamsResult = await db.query('SELECT id FROM teams ORDER BY id');
        const questionsResult = await db.query('SELECT id FROM question_bank WHERE question_set_id = 1 LIMIT 7');

        for (const team of teamsResult.rows) {
            for (let i = 0; i < questionsResult.rows.length; i++) {
                await db.query(
                    'INSERT INTO team_questions (team_id, question_id, question_position) VALUES ($1, $2, $3)',
                    [team.id, questionsResult.rows[i].id, i + 1]
                );
            }
        }
        console.log('✅ Assigned questions to all teams');

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n📝 Access Credentials:');
        console.log('   Judge: admin / admin123');
        console.log('   Team Tokens: PHX2026WARRIOR, CYB2026NINJA, CODE2026BREAK, DIG2026SPARTAN, TECH2026TITAN\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();
