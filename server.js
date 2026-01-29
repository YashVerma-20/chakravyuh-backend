require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * ✅ Robust CORS for Vercel + localhost
 * - Works with credentials
 * - Supports preview deployments
 * - Fixes preflight + POST mismatch
 */
const corsOptions = {
    origin: function (origin, callback) {
        // Allow non-browser requests (Postman, server-to-server)
        if (!origin) return callback(null, true);

        // Allow localhost
        if (
            origin.startsWith('http://localhost:3000') ||
            origin.startsWith('http://localhost:5173')
        ) {
            return callback(null, true);
        }

        // ✅ Allow ANY Vercel preview or prod deployment
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        // ❌ Block everything else (but DO NOT throw)
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware order MATTERS
app.use(helmet());
app.use(cors(corsOptions));

// ✅ Explicit preflight handler (CRITICAL)
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const participantRoutes = require('./routes/participant');
const judgeRoutes = require('./routes/judge');

app.use('/api/auth', authRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/judge', judgeRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'CHAKRAVYUH Backend is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler (DO NOT break CORS)
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 CHAKRAVYUH Backend Server`);
    console.log(`📡 Running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
});

module.exports = app;




