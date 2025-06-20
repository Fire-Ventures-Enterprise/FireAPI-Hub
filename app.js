const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const connectDB = async () => {
    try {
        if (process.env.MONGODB_URI) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✅ MongoDB Connected Successfully');
        } else {
            console.log('⚠️ MongoDB URI not found, running without database');
        }
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        // Don't exit process, continue without DB for now
    }
};

// Connect to database
connectDB();

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'FireAPI-Hub',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        message: '🔥 Welcome to FireAPI-Hub - Complete NBA Data API',
        status: 'running',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            api_docs: '/api/docs',
            test: '/api/test'
        },
        apis: [
            '🌤️ Weather API',
            '🏀 Teams API', 
            '👨‍💼 Players API',
            '🎮 Games API',
            '🏆 Standings API',
            '📊 Advanced Stats API',
            '📰 News API',
            '🏥 Injuries API',
            '⚖️ Suspensions API'
        ],
        tiers: {
            free: '100 requests/hour',
            standard: '500 requests/hour', 
            premium: '2000 requests/hour'
        }
    });
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ FireAPI-Hub is working!', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// API Routes (will be added later)
// ============= NBA API ROUTES =============
const teamsRoutes = require('./services/sports/NBA/teams/teams.routes');
app.use('/api/nba/teams', teamsRoutes);

app.get('/api', (req, res) => {
    res.json({
        message: 'FireAPI-Hub NBA Data APIs',
        available_apis: [
            '/api/nba/weather',
            '/api/nba/teams - NBA Teams API ✅ ACTIVE',

            '/api/nba/players', 
            '/api/nba/games',
            '/api/nba/standings',
            '/api/nba/advanced-stats',
            '/api/nba/news',
            '/api/nba/injuries',
            '/api/nba/suspensions'
        ],
        status: 'Teams API is now ACTIVE! 🏀'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully');
    mongoose.connection.close(() => {
        console.log('📦 MongoDB connection closed');
        process.exit(0);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 FireAPI-Hub server running on port ${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 API docs: http://localhost:${PORT}/api`);
});

module.exports = app;
