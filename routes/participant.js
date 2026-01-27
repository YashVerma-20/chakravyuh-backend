const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// All participant routes require authentication
router.use(authMiddleware);

// Get current question
router.get('/question/current', async (req, res) => {
    try {
        const teamId = req.user.userId;

        // Check round state
        const configResult = await db.query('SELECT round_state FROM round_config LIMIT 1');
        const roundState = configResult.rows[0]?.round_state;

        if (roundState !== 'ACTIVE') {
            return res.json({ status: roundState, message: 'Round is not active' });
        }

        // Get team state
        let stateResult = await db.query(
            'SELECT * FROM team_state WHERE team_id = $1',
            [teamId]
        );

        if (stateResult.rows.length === 0) {
            // Initialize team state
            await db.query(
                'INSERT INTO team_state (team_id, current_question_position, started_at) VALUES ($1, 1, CURRENT_TIMESTAMP)',
                [teamId]
            );
            // Refetch the newly created state
            stateResult = await db.query(
                'SELECT * FROM team_state WHERE team_id = $1',
                [teamId]
            );
        }

        const teamState = stateResult.rows[0];

        if (teamState.is_completed) {
            return res.json({ status: 'COMPLETED', message: 'All questions completed' });
        }

        // Get current question assignment
        const questionResult = await db.query(
            `SELECT qb.id, qb.question_text, qb.question_type, qb.options, qb.max_points
       FROM team_questions tq
       JOIN question_bank qb ON tq.question_id = qb.id
       WHERE tq.team_id = $1 AND tq.question_position = $2`,
            [teamId, teamState.current_question_position]
        );

        console.log('Question query:', { teamId, position: teamState.current_question_position, rowCount: questionResult.rows.length });

        if (questionResult.rows.length === 0) {
            console.error('No question found for team:', teamId, 'position:', teamState.current_question_position);
            return res.status(404).json({ error: 'Question not found' });
        }

        const question = questionResult.rows[0];

        // Start time tracking if not already started
        const trackingCheck = await db.query(
            'SELECT * FROM question_time_tracking WHERE team_id = $1 AND question_position = $2 AND completed_at IS NULL',
            [teamId, teamState.current_question_position]
        );

        if (trackingCheck.rows.length === 0) {
            await db.query(
                'INSERT INTO question_time_tracking (team_id, question_position) VALUES ($1, $2)',
                [teamId, teamState.current_question_position]
            );
        }

        res.json({
            status: 'ACTIVE',
            currentQuestion: teamState.current_question_position,
            totalQuestions: 7,
            question: {
                id: question.id,
                text: question.question_text,
                type: question.question_type,
                options: question.options,
                maxPoints: question.max_points
                // NEVER send correct_answer to frontend
            }
        });
    } catch (error) {
        console.error('Get current question error:', error);
        res.status(500).json({ error: 'Failed to fetch question' });
    }
});

// Submit answer
router.post('/question/submit', async (req, res) => {
    try {
        const teamId = req.user.userId;
        const { answer } = req.body;

        if (!answer || answer.trim() === '') {
            return res.status(400).json({ error: 'Answer is required' });
        }

        // Check round state
        const configResult = await db.query('SELECT * FROM round_config LIMIT 1');
        const config = configResult.rows[0];

        if (config.round_state !== 'ACTIVE') {
            return res.status(400).json({ error: 'Round is not active' });
        }

        // Get team state
        const stateResult = await db.query('SELECT * FROM team_state WHERE team_id = $1', [teamId]);
        const teamState = stateResult.rows[0];

        if (!teamState) {
            return res.status(400).json({ error: 'Team state not initialized' });
        }

        if (teamState.is_completed) {
            return res.status(400).json({ error: 'All questions already completed' });
        }

        // Get current question
        const questionResult = await db.query(
            `SELECT qb.* FROM team_questions tq
       JOIN question_bank qb ON tq.question_id = qb.id
       WHERE tq.team_id = $1 AND tq.question_position = $2`,
            [teamId, teamState.current_question_position]
        );

        const question = questionResult.rows[0];
        let isCorrect = null;
        let pointsAwarded = 0;

        // Auto-evaluate MCQ
        if (question.question_type === 'MCQ') {
            isCorrect = answer.toUpperCase() === question.correct_answer.toUpperCase();
            pointsAwarded = isCorrect ? config.mcq_correct_points : 0;
        }

        // Convert boolean to integer for SQLite (SQLite doesn't support boolean type)
        const isCorrectInt = isCorrect === null ? null : (isCorrect ? 1 : 0);

        // Record submission
        await db.query(
            `INSERT INTO submissions (team_id, question_id, question_position, answer_text, is_correct, points_awarded, evaluated_at)
       VALUES ($1, $2, $3, $4, $5, $6, ${question.question_type === 'MCQ' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
            [teamId, question.id, teamState.current_question_position, answer, isCorrectInt, pointsAwarded]
        );

        // Complete time tracking
        await db.query(
            'UPDATE question_time_tracking SET completed_at = CURRENT_TIMESTAMP WHERE team_id = $1 AND question_position = $2 AND completed_at IS NULL',
            [teamId, teamState.current_question_position]
        );

        // Handle wrong answer for MCQ
        if (question.question_type === 'MCQ' && !isCorrect) {
            const newWrongCount = teamState.wrong_answer_count + 1;
            const penalty = config.wrong_answer_penalty;

            if (newWrongCount >= 3) {
                // Apply heavy penalty and assign new question set
                const heavyPenalty = config.three_wrong_penalty;
                const newScore = teamState.total_score + heavyPenalty; // ALLOW NEGATIVE
                const newSetNumber = teamState.question_set_number + 1;

                await db.query(
                    `UPDATE team_state 
           SET total_score = $1, wrong_answer_count = 0, current_question_position = 1, question_set_number = $2
           WHERE team_id = $3`,
                    [newScore, newSetNumber, teamId]
                );

                // Assign new question set
                await assignNewQuestionSet(teamId, newSetNumber);

                return res.json({
                    success: false,
                    message: '3 wrong answers! Heavy penalty applied. New question set assigned.',
                    action: 'RESET_NEW_SET',
                    penalty: heavyPenalty
                });
            } else {
                // Regular penalty and reset to question 1
                const newScore = teamState.total_score + penalty; // ALLOW NEGATIVE

                await db.query(
                    `UPDATE team_state 
           SET total_score = $1, wrong_answer_count = $2, current_question_position = 1
           WHERE team_id = $3`,
                    [newScore, newWrongCount, teamId]
                );

                return res.json({
                    success: false,
                    message: 'Wrong answer! Penalty applied. Reset to Question 1.',
                    action: 'RESET_TO_Q1',
                    penalty: penalty,
                    wrongCount: newWrongCount
                });
            }
        }

        // Handle correct MCQ answer
        if (question.question_type === 'MCQ' && isCorrect) {
            const newScore = teamState.total_score + pointsAwarded;
            const newPosition = teamState.current_question_position + 1;

            if (newPosition > 7) {
                // Completed all questions
                await db.query(
                    'UPDATE team_state SET total_score = $1, is_completed = 1, completed_at = CURRENT_TIMESTAMP WHERE team_id = $2',
                    [newScore, teamId]
                );

                // Add to leaderboard
                await db.query(
                    'INSERT INTO leaderboard (team_id, final_score) VALUES ($1, $2) ON CONFLICT (team_id) DO UPDATE SET final_score = $2',
                    [teamId, newScore]
                );

                return res.json({
                    success: true,
                    message: 'All questions completed!',
                    action: 'COMPLETED'
                });
            } else {
                await db.query(
                    'UPDATE team_state SET total_score = $1, current_question_position = $2 WHERE team_id = $3',
                    [newScore, newPosition, teamId]
                );

                return res.json({
                    success: true,
                    message: 'Correct! Moving to next question.',
                    action: 'NEXT_QUESTION'
                });
            }
        }

        // Handle descriptive answer (queued for judge evaluation)
        if (question.question_type === 'DESCRIPTIVE') {
            return res.json({
                success: true,
                message: 'Answer submitted for evaluation.',
                action: 'QUEUED_FOR_EVALUATION'
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({ error: 'Failed to submit answer' });
    }
});

// Get team status (no score!)
router.get('/status', async (req, res) => {
    try {
        const teamId = req.user.userId;

        const stateResult = await db.query('SELECT * FROM team_state WHERE team_id = $1', [teamId]);
        const teamState = stateResult.rows[0];

        const configResult = await db.query('SELECT round_state FROM round_config LIMIT 1');
        const roundState = configResult.rows[0]?.round_state;

        // Check if there's a pending descriptive submission waiting for evaluation
        let canProceed = true;
        if (teamState) {
            const pendingSubmission = await db.query(
                `SELECT * FROM submissions 
                 WHERE team_id = $1 
                 AND question_position = $2 
                 AND evaluated_at IS NULL 
                 ORDER BY submitted_at DESC LIMIT 1`,
                [teamId, teamState.current_question_position]
            );

            // If there's an unevaluated submission, canProceed should be false
            // If it's been evaluated, canProceed should be true
            canProceed = pendingSubmission.rows.length === 0;
        }

        res.json({
            roundState,
            currentQuestion: teamState?.current_question_position || 1,
            totalQuestions: 7,
            isCompleted: teamState?.is_completed || false,
            wrongAnswerCount: teamState?.wrong_answer_count || 0,
            canProceed: canProceed
            // NEVER send total_score
        });
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

// Get leaderboard (only if published)
router.get('/leaderboard', async (req, res) => {
    try {
        const configResult = await db.query('SELECT round_state FROM round_config LIMIT 1');
        const roundState = configResult.rows[0]?.round_state;

        if (roundState !== 'LEADERBOARD_PUBLISHED') {
            return res.status(403).json({ error: 'Leaderboard not published yet' });
        }

        const result = await db.query(
            `SELECT t.team_name, l.final_score, l.manual_rank
       FROM leaderboard l
       JOIN teams t ON l.team_id = t.id
       WHERE l.manual_rank IS NOT NULL
       ORDER BY l.manual_rank ASC`
        );

        res.json({ leaderboard: result.rows });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Restart quiz endpoint
router.post('/restart', async (req, res) => {
    try {
        const teamId = req.user.userId;

        // Reset team state to start fresh
        await db.query(
            `UPDATE team_state 
             SET current_question_position = 1, 
                 is_completed = 0, 
                 completed_at = NULL,
                 total_score = 0,
                 wrong_answer_count = 0
             WHERE team_id = $1`,
            [teamId]
        );

        // If no team state exists, create it
        const checkState = await db.query('SELECT * FROM team_state WHERE team_id = $1', [teamId]);
        if (checkState.rows.length === 0) {
            await db.query(
                'INSERT INTO team_state (team_id, current_question_position, started_at) VALUES ($1, 1, CURRENT_TIMESTAMP)',
                [teamId]
            );
        }

        res.json({
            success: true,
            message: 'Quiz restarted successfully'
        });
    } catch (error) {
        console.error('Restart quiz error:', error);
        res.status(500).json({ error: 'Failed to restart quiz' });
    }
});

// Helper function to assign new question set
async function assignNewQuestionSet(teamId, setNumber) {
    // Delete old assignments
    await db.query('DELETE FROM team_questions WHERE team_id = $1', [teamId]);

    // Get 7 random questions from a different set
    const questionsResult = await db.query(
        `SELECT id FROM question_bank 
     WHERE question_set_id = $1 
     ORDER BY RANDOM() 
     LIMIT 7`,
        [setNumber]
    );

    // If not enough questions in set, use from set 1
    if (questionsResult.rows.length < 7) {
        const fallbackResult = await db.query(
            'SELECT id FROM question_bank ORDER BY RANDOM() LIMIT 7'
        );
        questionsResult.rows = fallbackResult.rows;
    }

    // Assign new questions
    for (let i = 0; i < questionsResult.rows.length && i < 7; i++) {
        await db.query(
            'INSERT INTO team_questions (team_id, question_id, question_position) VALUES ($1, $2, $3)',
            [teamId, questionsResult.rows[i].id, i + 1]
        );
    }
}

module.exports = router;
