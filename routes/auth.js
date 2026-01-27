const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Judge login
router.post('/judge/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Find judge
        const result = await db.query(
            'SELECT * FROM judges WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const judge = result.rows[0];

        // Verify password
        const isValid = await bcrypt.compare(password, judge.password_hash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: judge.id, username: judge.username, role: 'judge' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: judge.id,
                username: judge.username,
                role: 'judge'
            }
        });
    } catch (error) {
        console.error('Judge login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Participant access via team token
router.post('/participant/access', async (req, res) => {
    try {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({ error: 'Access token required' });
        }

        // Find team
        const result = await db.query(
            'SELECT id, team_id, team_name FROM teams WHERE access_token = $1',
            [accessToken]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid access token' });
        }

        const team = result.rows[0];

        // Generate participant token
        const token = jwt.sign(
            { userId: team.id, teamId: team.team_id, teamName: team.team_name, role: 'participant' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            team: {
                id: team.id,
                teamId: team.team_id,
                teamName: team.team_name
            }
        });
    } catch (error) {
        console.error('Participant access error:', error);
        res.status(500).json({ error: 'Access failed' });
    }
});

module.exports = router;
