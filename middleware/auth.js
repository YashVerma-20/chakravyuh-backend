const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains { userId, username, role }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Middleware to check if user is a judge
const judgeOnly = (req, res, next) => {
    if (req.user.role !== 'judge') {
        return res.status(403).json({ error: 'Access denied. Judges only.' });
    }
    next();
};

module.exports = { authMiddleware, judgeOnly };
