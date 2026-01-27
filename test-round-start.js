const db = require('./config/database');

console.log('Testing round start logic...\n');

async function testRoundStart() {
    try {
        // Test 1: Get teams
        console.log('1. Getting teams...');
        const teamsResult = await db.query('SELECT id, team_id, team_name FROM teams WHERE is_dummy = 0');
        console.log(`   Found ${teamsResult.rows.length} teams`);

        if (teamsResult.rows.length === 0) {
            console.error('   ❌ NO TEAMS FOUND!');
            return;
        }

        // Test 2: Check questions
        console.log('\n2. Checking questions...');
        const questionsCheck = await db.query('SELECT COUNT(*) as count FROM question_bank');
        console.log(`   Total questions: ${questionsCheck.rows[0].count}`);

        // Test 3: Check question sets
        console.log('\n3. Checking question sets...');
        for (let setId = 1; setId <= 7; setId++) {
            const setCheck = await db.query(
                'SELECT COUNT(*) as count FROM question_bank WHERE question_set_id = $1',
                [setId]
            );
            console.log(`   Set ${setId}: ${setCheck.rows[0].count} questions`);
        }

        // Test 4: Try initializing one team
        console.log('\n4. Testing team initialization...');
        const testTeam = teamsResult.rows[0];
        console.log(`   Testing with team: ${testTeam.team_name} (ID: ${testTeam.id})`);

        // Check if team_state exists
        const stateCheck = await db.query('SELECT id FROM team_state WHERE team_id = $1', [testTeam.id]);
        console.log(`   Existing team_state records: ${stateCheck.rows.length}`);

        if (stateCheck.rows.length === 0) {
            console.log('   Creating team_state...');
            await db.query(
                'INSERT INTO team_state (team_id, total_score, carry_forward_score, started_at) VALUES ($1, 0, 0, CURRENT_TIMESTAMP)',
                [testTeam.id]
            );
            console.log('   ✅ team_state created');
        }

        // Test 5: Try assigning questions
        console.log('\n5. Testing question assignment...');
        const randomSet = 1; // Use set 1 for testing
        const questionsResult = await db.query(
            'SELECT id FROM question_bank WHERE question_set_id = $1 ORDER BY id LIMIT 7',
            [randomSet]
        );
        console.log(`   Got ${questionsResult.rows.length} questions from set ${randomSet}`);

        if (questionsResult.rows.length === 0) {
            console.error('   ❌ NO QUESTIONS IN SET!');
            return;
        }

        // Check if questions already assigned
        const assignedCheck = await db.query(
            'SELECT COUNT(*) as count FROM team_questions WHERE team_id = $1',
            [testTeam.id]
        );
        console.log(`   Existing question assignments: ${assignedCheck.rows[0].count}`);

        if (parseInt(assignedCheck.rows[0].count) === 0) {
            console.log('   Assigning questions...');
            for (let i = 0; i < questionsResult.rows.length; i++) {
                await db.query(
                    'INSERT INTO team_questions (team_id, question_id, question_position) VALUES ($1, $2, $3)',
                    [testTeam.id, questionsResult.rows[i].id, i + 1]
                );
            }
            console.log('   ✅ Questions assigned');
        }

        // Test 6: Update round state
        console.log('\n6. Testing round state update...');
        await db.query(
            'UPDATE round_config SET round_state = ?, is_locked = 1, updated_at = CURRENT_TIMESTAMP',
            ['ACTIVE']
        );
        console.log('   ✅ Round state updated');

        console.log('\n✅ ALL TESTS PASSED!');
        console.log('   Round start should work now.');

    } catch (error) {
        console.error('\n❌ ERROR:', error);
        console.error('Stack:', error.stack);
    }

    process.exit(0);
}

testRoundStart();
