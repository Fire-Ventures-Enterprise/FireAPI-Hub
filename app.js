const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import middleware
const authMiddleware = require('./middleware/auth.middleware');
const errorHandler = require('./middleware/error-handler.middleware');

// Import NBA routes
const nbaWeatherRoutes = require('./services/sports/NBA/weather/weather.routes');
const nbaH2HRoutes = require('./services/sports/NBA/h2h/h2h.routes');
const nbaRefereeRoutes = require('./services/sports/NBA/referee/referee.routes');
const nbaPlayerStatsRoutes = require('./services/sports/NBA/player-stats/player-stats.routes');
const nbaTeamStatsRoutes = require('./services/sports/NBA/team-stats/team-stats.routes');
const nbaInjuriesRoutes = require('./services/sports/NBA/injuries/injuries.routes');
const nbaOddsRoutes = require('./services/sports/NBA/odds/odds.routes');
const nbaSchedulesRoutes = require('./services/sports/NBA/schedules/schedules.routes');
const nbaLiveScoresRoutes = require('./services/sports/NBA/live-scores/live-scores.routes');
const nbaPlayerPropsRoutes = require('./services/sports/NBA/player-props/player-props.routes');
const nbaTeamNewsRoutes = require('./services/sports/NBA/team-news/team-news.routes');
const nbaPredictionsRoutes = require('./services/sports/NBA/predictions/predictions.routes');
const nbaMasterRoutes = require('./services/sports/NBA/master-prediction/master.routes');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('🔥 FireAPI-Hub connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'FireAPI-Hub NBA Intelligence',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// NBA API Routes
app.use('/api/sports/nba/weather', nbaWeatherRoutes);
app.use('/api/sports/nba/h2h', nbaH2HRoutes);
app.use('/api/sports/nba/referee', nbaRefereeRoutes);
app.use('/api/sports/nba/player-stats', nbaPlayerStatsRoutes);
app.use('/api/sports/nba/team-stats', nbaTeamStatsRoutes);
app.use('/api/sports/nba/injuries', nbaInjuriesRoutes);
app.use('/api/sports/nba/odds', nbaOddsRoutes);
app.use('/api/sports/nba/schedules', nbaSchedulesRoutes);
app.use('/api/sports/nba/live-scores', nbaLiveScoresRoutes);
app.use('/api/sports/nba/player-props', nbaPlayerPropsRoutes);
app.use('/api/sports/nba/team-news', nbaTeamNewsRoutes);
app.use('/api/sports/nba/predictions', nbaPredictionsRoutes);
app.use('/api/sports/nba/master-prediction', nbaMasterRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: '🔥 Welcome to FireAPI-Hub NBA Intelligence Engine',
        version: '2.0.0',
        services: ['NBA Weather', 'NBA H2H', 'NBA Referee', 'NBA Player Stats', 'NBA Team Stats', 'NBA Injuries', 'NBA Odds', 'NBA Schedules', 'NBA Live Scores', 'NBA Player Props', 'NBA Team News', 'NBA Predictions', 'NBA Master Prediction'],
        documentation: '/api/docs',
        health: '/api/health'
    });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: 'The requested NBA API endpoint does not exist'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 FireAPI-Hub NBA Intelligence running on port ${PORT}`);
    console.log(`🏀 NBA API Services: 12 endpoints active`);
    console.log(`🎯 Master Prediction Engine: Ready`);
});

module.exports = app;
