require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Explicitly allowed origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://chakravuyhcg.vercel.app',
    'https://chakravyuh-kappa.vercel.app',
    'https://chakravyuh-sepia.vercel.app'
];

// Middleware
app.use(helmet());

// ✅ FINAL CORS FIX (Vercel-safe, production-grade)
app.use(cors({
    origin: function (origin, callback) {
        // Allow server-to-server & Postman
        if (!origin) return callback(null, true);

        // Allow explicit origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // ✅ Allow ALL Vercel preview deployments
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Required for preflight (OPTIONS)
app.options('*', cors());

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

// Error handler
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
