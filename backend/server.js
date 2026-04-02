require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const ruleRoutes = require('./routes/rules');
const auditLogRoutes = require('./routes/auditLogs');

const aiRoutes = require('./routes/ai');
const aiManager = require('./services/aiManager');

const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});
app.set('io', io);

// Set socket in aiManager
aiManager.setSocket(io);

// Init Telegram Bot
require('./services/telegramService')(io);

const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
    origin: (origin, callback) => {
        // Allow Electron (null origin from file://), localhost dev servers
        const allowed = [
            'http://localhost:5173',
            'http://localhost:3000',
        ];
        if (!origin || origin === 'null' || allowed.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// General API rate limiter
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5000, // BM-07: relaxed for interactive AI studio use
    message: 'Too many requests from this IP, please try again later'
});

// BM-07: Stricter limiter for auth endpoints to prevent brute-force
const authLimiter = rateLimit({
    windowMs: 900000, // 15 minutes
    max: 15,
    message: 'Too many login attempts, please try again later'
});

app.use('/api/', limiter);
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
    console.log(`iFinance API Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Auto-start AI Studio with a delay to ensure login is responsive first
    setTimeout(() => {
        const specs = aiManager.getStatus();
        if (specs.engineExists && specs.modelExists) {
            console.log('🤖 Starting AI Studio Engine in background...');
            aiManager.startServer();
        }
    }, 5000); // 5-second delay for smooth startup
});

module.exports = { app, server, io };
