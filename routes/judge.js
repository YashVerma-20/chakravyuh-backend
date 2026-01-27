const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, judgeOnly } = require('../middleware/auth');

// All judge routes require authentication and judge role
router.use(authMiddleware, judgeOnly);

// Get all submissions
router.get('/submissions', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*, t.team_name, t.team_id, qb.question_text, qb.question_type, qb.correct_answer
       FROM submissions s
       JOIN teams t ON s.team_id = t.id
       JOIN question_bank qb ON s.question_id = qb.id
       ORDER BY s.submitted_at DESC`
        );

        res.json({ submissions: result.rows });
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// Score descriptive answer
router.post('/score', async (req, res) => {
    try {
        const { submissionId, points } = req.body;
        const judgeId = req.user.userId;

        // ALLOW NEGATIVE POINTS (removed points < 0 check)
        if (points === undefined) {
            return res.status(400).json({ error: 'Points are required' });
        }

        // Get submission
        const submissionResult = await db.query(
            'SELECT * FROM submissions WHERE id = $1',
            [submissionId]
        );

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const submission = submissionResult.rows[0];

        // Prevent double-evaluation
        if (submission.evaluated_at) {
            return res.status(400).json({ error: 'This submission has already been evaluated' });
        }

        // Update submission with score
        await db.query(
            'UPDATE submissions SET points_awarded = $1, evaluated_at = CURRENT_TIMESTAMP, evaluated_by = $2 WHERE id = $3',
            [points, judgeId, submissionId]
        );

        // Update team score (NO Math.max - allow negative scores)
        const stateResult = await db.query('SELECT * FROM team_state WHERE team_id = $1', [submission.team_id]);
        const teamState = stateResult.rows[0];

        const newScore = teamState.total_score + points;
        const newPosition = submission.question_position + 1;

        if (newPosition > 7) {
            // Team completed all questions
            await db.query(
                'UPDATE team_state SET total_score = $1, is_completed = true, completed_at = CURRENT_TIMESTAMP WHERE team_id = $2',
                [newScore, submission.team_id]
            );

            // Update leaderboard
            await db.query(
                'INSERT INTO leaderboard (team_id, final_score) VALUES ($1, $2) ON CONFLICT (team_id) DO UPDATE SET final_score = $2',
                [submission.team_id, newScore]
            );
        } else {
            await db.query(
                'UPDATE team_state SET total_score = $1, current_question_position = $2 WHERE team_id = $3',
                [newScore, newPosition, submission.team_id]
            );
        }

        res.json({ success: true, message: 'Score updated successfully', newScore });
    } catch (error) {
        console.error('Score submission error:', error);
        res.status(500).json({ error: 'Failed to score submission' });
    }
});

// Get round config
router.get('/config', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM round_config LIMIT 1');
        res.json({ config: result.rows[0] });
    } catch (error) {
        console.error('Get config error:', error);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// Update round config (only if not locked)
router.put('/config', async (req, res) => {
    try {
        const { mcqPoints, descriptivePoints, wrongPenalty, threeWrongPenalty } = req.body;

        // Check if config is locked
        const checkResult = await db.query('SELECT is_locked FROM round_config LIMIT 1');
        if (checkResult.rows[0]?.is_locked) {
            return res.status(403).json({ error: 'Config is locked. Round has started.' });
        }

        await db.query(
            `UPDATE round_config 
       SET mcq_correct_points = $1, descriptive_max_points = $2, 
           wrong_answer_penalty = $3, three_wrong_penalty = $4, updated_at = CURRENT_TIMESTAMP`,
            [mcqPoints, descriptivePoints, wrongPenalty, threeWrongPenalty]
        );

        res.json({ success: true, message: 'Config updated successfully' });
    } catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// Start round
router.post('/round/start', async (req, res) => {
    try {
        // Get all teams (including dummy teams for testing)
        const teamsResult = await db.query('SELECT id FROM teams');
        const teams = teamsResult.rows;

        // Initialize team_state for all teams if not exists
        for (const team of teams) {
            const stateCheck = await db.query('SELECT id FROM team_state WHERE team_id = $1', [team.id]);
            if (stateCheck.rows.length === 0) {
                // Create team_state
                await db.query(
                    `INSERT INTO team_state (team_id, total_score, started_at) 
                     VALUES ($1, 0, CURRENT_TIMESTAMP)`,
                    [team.id]
                );
            } else {
                // Reset total_score and update started_at for existing team_state
                await db.query(
                    `UPDATE team_state 
                     SET total_score = 0, started_at = CURRENT_TIMESTAMP 
                     WHERE team_id = $1`,
                    [team.id]
                );
            }

            // Assign random question set (1-7) to each team
            const randomSet = Math.floor(Math.random() * 7) + 1;

            // Check if questions already assigned (prevent re-assignment on restart)
            const assignedCheck = await db.query(
                'SELECT COUNT(*) as count FROM team_questions WHERE team_id = $1',
                [team.id]
            );

            if (parseInt(assignedCheck.rows[0].count) === 0) {
                // Get 7 questions from the randomly selected set
                const questionsResult = await db.query(
                    'SELECT id FROM question_bank WHERE question_set_id = $1 ORDER BY id LIMIT 7',
                    [randomSet]
                );

                // Assign questions to team
                for (let i = 0; i < questionsResult.rows.length; i++) {
                    await db.query(
                        'INSERT INTO team_questions (team_id, question_id, question_position) VALUES ($1, $2, $3)',
                        [team.id, questionsResult.rows[i].id, i + 1]
                    );
                }
            }
        }

        // Lock round config and activate
        await db.query(
            `UPDATE round_config 
       SET round_state = 'ACTIVE', is_locked = 1, updated_at = CURRENT_TIMESTAMP`
        );

        res.json({
            success: true,
            message: 'Round started. Teams initialized with carry-forward scores. Questions assigned.',
            teamsInitialized: teams.length
        });
    } catch (error) {
        console.error('Start round error:', error);
        res.status(500).json({ error: 'Failed to start round' });
    }
});

// Complete round
router.post('/round/complete', async (req, res) => {
    try {
        await db.query(
            `UPDATE round_config 
       SET round_state = 'COMPLETED', updated_at = CURRENT_TIMESTAMP`
        );

        res.json({ success: true, message: 'Round completed' });
    } catch (error) {
        console.error('Complete round error:', error);
        res.status(500).json({ error: 'Failed to complete round' });
    }
});

// Reset round - clear all data for a fresh start
router.post('/round/reset', async (req, res) => {
    try {
        // Delete all team states
        await db.query('DELETE FROM team_state');

        // Delete all submissions
        await db.query('DELETE FROM submissions');

        // Delete all time tracking
        await db.query('DELETE FROM question_time_tracking');

        // Clear leaderboard
        await db.query('DELETE FROM leaderboard');

        // Reset round to LOCKED
        await db.query(
            `UPDATE round_config 
       SET round_state = 'LOCKED', is_locked = 0, updated_at = CURRENT_TIMESTAMP`
        );

        res.json({ success: true, message: 'Round reset successfully. Ready for a fresh start!' });
    } catch (error) {
        console.error('Reset round error:', error);
        res.status(500).json({ error: 'Failed to reset round' });
    }
});


// Get leaderboard with full data
router.get('/leaderboard', async (req, res) => {
    try {
        // Exclude dummy teams from leaderboard
        const result = await db.query(
            `SELECT l.*, t.team_name, t.team_id
       FROM leaderboard l
       JOIN teams t ON l.team_id = t.id
       WHERE t.is_dummy = 0
       ORDER BY l.manual_rank ASC NULLS LAST, l.final_score DESC`
        );

        res.json({ leaderboard: result.rows });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Assign manual rank
router.put('/leaderboard/rank', async (req, res) => {
    try {
        const { teamId, rank, notes } = req.body;

        // Check if leaderboard is published (read-only)
        const configResult = await db.query('SELECT round_state FROM round_config LIMIT 1');
        if (configResult.rows[0]?.round_state === 'LEADERBOARD_PUBLISHED') {
            return res.status(403).json({ error: 'Leaderboard is published and read-only' });
        }

        await db.query(
            'UPDATE leaderboard SET manual_rank = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE team_id = $3',
            [rank, notes, teamId]
        );

        res.json({ success: true, message: 'Rank assigned successfully' });
    } catch (error) {
        console.error('Assign rank error:', error);
        res.status(500).json({ error: 'Failed to assign rank' });
    }
});

// Publish leaderboard
router.post('/leaderboard/publish', async (req, res) => {
    try {
        // Verify all teams have ranks
        const unrankedResult = await db.query(
            'SELECT COUNT(*) FROM leaderboard WHERE manual_rank IS NULL'
        );

        if (parseInt(unrankedResult.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Not all teams have been ranked' });
        }

        await db.query(
            `UPDATE round_config 
       SET round_state = 'LEADERBOARD_PUBLISHED', updated_at = CURRENT_TIMESTAMP`
        );

        res.json({ success: true, message: 'Leaderboard published' });
    } catch (error) {
        console.error('Publish leaderboard error:', error);
        res.status(500).json({ error: 'Failed to publish leaderboard' });
    }
});

// Set carry-forward score for a team (only before round starts)
router.put('/team/carry-forward', async (req, res) => {
    try {
        const { teamId, carryForwardScore } = req.body;

        if (carryForwardScore === undefined) {
            return res.status(400).json({ error: 'Carry-forward score is required' });
        }

        // Check if round is locked (already started)
        const configResult = await db.query('SELECT round_state, is_locked FROM round_config LIMIT 1');
        if (configResult.rows[0]?.is_locked) {
            return res.status(403).json({ error: 'Cannot modify carry-forward scores after round has started' });
        }

        // Check if team exists
        const teamCheck = await db.query('SELECT id FROM teams WHERE id = $1', [teamId]);
        if (teamCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Create or update team_state with carry_forward_score
        const stateCheck = await db.query('SELECT id FROM team_state WHERE team_id = $1', [teamId]);

        if (stateCheck.rows.length === 0) {
            await db.query(
                `INSERT INTO team_state (team_id, carry_forward_score, total_score) 
                 VALUES ($1, $2, 0)`,
                [teamId, carryForwardScore]
            );
        } else {
            await db.query(
                'UPDATE team_state SET carry_forward_score = $1 WHERE team_id = $2',
                [carryForwardScore, teamId]
            );
        }

        res.json({
            success: true,
            message: 'Carry-forward score set successfully',
            carryForwardScore
        });
    } catch (error) {
        console.error('Set carry-forward error:', error);
        res.status(500).json({ error: 'Failed to set carry-forward score' });
    }
});

// Apply manual penalty
router.post('/penalty', async (req, res) => {
    try {
        const { teamId, penaltyPoints, reason } = req.body;

        const stateResult = await db.query('SELECT * FROM team_state WHERE team_id = $1', [teamId]);
        if (stateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const teamState = stateResult.rows[0];
        const newScore = Math.max(0, teamState.total_score + penaltyPoints);

        await db.query(
            'UPDATE team_state SET total_score = $1 WHERE team_id = $2',
            [newScore, teamId]
        );

        res.json({ success: true, message: 'Penalty applied', newScore });
    } catch (error) {
        console.error('Apply penalty error:', error);
        res.status(500).json({ error: 'Failed to apply penalty' });
    }
});

// Get dashboard stats
router.get('/dashboard/stats', async (req, res) => {
    try {
        const configResult = await db.query('SELECT * FROM round_config LIMIT 1');
        const teamsResult = await db.query('SELECT COUNT(*) FROM teams');
        const completedResult = await db.query('SELECT COUNT(*) FROM team_state WHERE is_completed = true');
        const submissionsResult = await db.query('SELECT COUNT(*) FROM submissions');

        res.json({
            roundState: configResult.rows[0]?.round_state,
            totalTeams: parseInt(teamsResult.rows[0].count),
            completedTeams: parseInt(completedResult.rows[0].count),
            totalSubmissions: parseInt(submissionsResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
