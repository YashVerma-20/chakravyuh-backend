const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, judgeOnly } = require('../middleware/auth');

// All judge routes require authentication and judge role
router.use(authMiddleware, judgeOnly);

// ================= SUBMISSIONS =================
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

// ================= SCORE DESCRIPTIVE =================
router.post('/score', async (req, res) => {
    try {
        const { submissionId, points } = req.body;
        const judgeId = req.user.userId;

        if (points === undefined) {
            return res.status(400).json({ error: 'Points are required' });
        }

        const submissionResult = await db.query(
            'SELECT * FROM submissions WHERE id = $1',
            [submissionId]
        );

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const submission = submissionResult.rows[0];

        if (submission.evaluated_at) {
            return res.status(400).json({ error: 'Submission already evaluated' });
        }

        await db.query(
            `UPDATE submissions 
             SET points_awarded = $1, evaluated_at = CURRENT_TIMESTAMP, evaluated_by = $2 
             WHERE id = $3`,
            [points, judgeId, submissionId]
        );

        const stateResult = await db.query(
            'SELECT * FROM team_state WHERE team_id = $1',
            [submission.team_id]
        );

        const teamState = stateResult.rows[0];
        const newScore = teamState.total_score + points;
        const newPosition = submission.question_position + 1;

        if (newPosition > 7) {
            await db.query(
                `UPDATE team_state 
                 SET total_score = $1, is_completed = true, completed_at = CURRENT_TIMESTAMP 
                 WHERE team_id = $2`,
                [newScore, submission.team_id]
            );

            await db.query(
                `INSERT INTO leaderboard (team_id, final_score)
                 VALUES ($1, $2)
                 ON CONFLICT (team_id) DO UPDATE SET final_score = $2`,
                [submission.team_id, newScore]
            );
        } else {
            await db.query(
                `UPDATE team_state 
                 SET total_score = $1, current_question_position = $2 
                 WHERE team_id = $3`,
                [newScore, newPosition, submission.team_id]
            );
        }

        res.json({ success: true, newScore });
    } catch (error) {
        console.error('Score error:', error);
        res.status(500).json({ error: 'Failed to score submission' });
    }
});

// ================= ROUND CONFIG =================
router.get('/config', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM round_config LIMIT 1');
        res.json({ config: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

router.put('/config', async (req, res) => {
    try {
        const { mcqPoints, descriptivePoints, wrongPenalty, threeWrongPenalty } = req.body;

        const check = await db.query('SELECT is_locked FROM round_config LIMIT 1');
        if (check.rows[0]?.is_locked) {
            return res.status(403).json({ error: 'Config locked' });
        }

        await db.query(
            `UPDATE round_config 
             SET mcq_correct_points = $1,
                 descriptive_max_points = $2,
                 wrong_answer_penalty = $3,
                 three_wrong_penalty = $4,
                 updated_at = CURRENT_TIMESTAMP`,
            [mcqPoints, descriptivePoints, wrongPenalty, threeWrongPenalty]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// ================= ROUND CONTROL =================
router.post('/round/start', async (req, res) => {
    try {
        const teams = await db.query('SELECT id FROM teams');

        for (const team of teams.rows) {
            await db.query(
                `INSERT INTO team_state (team_id, total_score, started_at)
                 VALUES ($1, 0, CURRENT_TIMESTAMP)
                 ON CONFLICT (team_id)
                 DO UPDATE SET total_score = 0, started_at = CURRENT_TIMESTAMP`,
                [team.id]
            );
        }

        await db.query(
            `UPDATE round_config 
             SET round_state = 'ACTIVE', is_locked = 1`
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start round' });
    }
});

router.post('/round/complete', async (req, res) => {
    try {
        await db.query(
            `UPDATE round_config SET round_state = 'COMPLETED'`
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to complete round' });
    }
});

router.post('/round/reset', async (req, res) => {
    try {
        await db.query('DELETE FROM team_state');
        await db.query('DELETE FROM submissions');
        await db.query('DELETE FROM leaderboard');

        await db.query(
            `UPDATE round_config 
             SET round_state = 'LOCKED', is_locked = 0`
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset round' });
    }
});

// ================= LEADERBOARD =================
router.get('/leaderboard', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT l.*, t.team_name
             FROM leaderboard l
             JOIN teams t ON l.team_id = t.id
             WHERE t.is_dummy = 0
             ORDER BY l.manual_rank ASC NULLS LAST, l.final_score DESC`
        );

        res.json({ leaderboard: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// ================= DASHBOARD STATS (FIXED) =================
const dashboardStatsHandler = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');

        const round = await db.query('SELECT round_state FROM round_config LIMIT 1');
        const teams = await db.query('SELECT COUNT(*)::int AS count FROM teams');
        const completed = await db.query(
            'SELECT COUNT(*)::int AS count FROM team_state WHERE is_completed = true'
        );
        const submissions = await db.query(
            'SELECT COUNT(*)::int AS count FROM submissions'
        );

        res.status(200).json({
            roundState: round.rows[0]?.round_state || 'LOCKED',
            totalTeams: teams.rows[0]?.count || 0,
            completedTeams: completed.rows[0]?.count || 0,
            totalSubmissions: submissions.rows[0]?.count || 0
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            roundState: 'UNKNOWN',
            totalTeams: 0,
            completedTeams: 0,
            totalSubmissions: 0
        });
    }
};

// ✅ Frontend expects this
router.get('/stats', dashboardStatsHandler);

// ✅ Keep old route
router.get('/dashboard/stats', dashboardStatsHandler);

module.exports = router;
