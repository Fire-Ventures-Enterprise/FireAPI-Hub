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

// ============= NBA API ROUTES =============
// Import and use Teams API (properly ordered)
const teamsRoutes = require('./services/sports/NBA/teams/teams.routes');
app.use('/api/nba/teams', teamsRoutes);

// Other NBA APIs (commented out for now - add one by one after Teams works)
// const playersRoutes = require('./services/sports/NBA/players/players.routes');
// const gamesRoutes = require('./services/sports/NBA/games/games.routes');
// const standingsRoutes = require('./services/sports/NBA/standings/standings.routes');
// const advancedStatsRoutes = require('./services/sports/NBA/advanced-stats/advanced-stats.routes');
// const newsRoutes = require('./services/sports/NBA/news/news.routes');
// const injuriesRoutes = require('./services/sports/NBA/injuries/injuries.routes');
// const suspensionsRoutes = require('./services/sports/NBA/suspensions/suspensions.routes');
// const weatherRoutes = require('./services/sports/NBA/weather/weather.routes');

// app.use('/api/nba/players', playersRoutes);
// app.use('/api/nba/games', gamesRoutes);
// app.use('/api/nba/standings', standingsRoutes);
// app.use('/api/nba/advanced-stats', advancedStatsRoutes);
// app.use('/api/nba/news', newsRoutes);
// app.use('/api/nba/injuries', injuriesRoutes);
// app.use('/api/nba/suspensions', suspensionsRoutes);
// app.use('/api/nba/weather', weatherRoutes);

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
            '🏀 Teams API - ✅ ACTIVE',
            '👨‍💼 Players API - Coming Soon',
            '🎮 Games API - Coming Soon',
            '🏆 Standings API - Coming Soon',
            '📊 Advanced Stats API - Coming Soon',
            '📰 News API - Coming Soon',
            '🏥 Injuries API - Coming Soon',
            '⚖️ Suspensions API - Coming Soon',
            '🌤️ Weather API - Coming Soon'
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

// API Routes info
app.get('/api', (req, res) => {
    res.json({
        message: 'FireAPI-Hub NBA Data APIs',
        available_apis: [
            '/api/nba/teams - NBA Teams API ✅ ACTIVE',
            '/api/nba/players - Coming Soon',
            '/api/nba/games - Coming Soon',
            '/api/nba/standings - Coming Soon',
            '/api/nba/advanced-stats - Coming Soon',
            '/api/nba/news - Coming Soon',
            '/api/nba/injuries - Coming Soon',
            '/api/nba/suspensions - Coming Soon',
            '/api/nba/weather - Coming Soon'
        ],
        status: 'Teams API is now ACTIVE! 🏀',
        note: 'More APIs coming online soon!'
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
        timestamp: new Date().toISOString(),
        availableRoutes: [
            '/',
            '/health',
            '/api',
            '/api/test',
            '/api/nba/teams',
            '/api/nba/teams/health'
        ]
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
    console.log(`🏀 Teams API: http://localhost:${PORT}/api/nba/teams`);
    console.log(`📊 API docs: http://localhost:${PORT}/api`);
});

module.exports = app;
