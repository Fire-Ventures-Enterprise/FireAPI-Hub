const express = require('express');
const router = express.Router();
const gamesController = require('./games.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { rateLimiter } = require('../../../../middleware/rateLimiter.middleware');
const { validateRequest } = require('../../../../middleware/validation.middleware');
const { body, param, query } = require('express-validator');

// =============================================================================
// NBA GAMES API ROUTES
// =============================================================================
// This file defines all NBA Games API endpoints with tier-based access control
// FREE TIER: Basic game info, today's games, scores (100 req/hour)
// STANDARD TIER: Game details, stats, historical data (500 req/hour)
// PREMIUM TIER: Live tracking, play-by-play, advanced analytics (2000 req/hour)
// =============================================================================

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'NBA Games API',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// =============================================================================
// FREE TIER ENDPOINTS (100 requests/hour)
// =============================================================================

/**
 * GET /api/nba/games
 * Get games with filtering options
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} date - Specific date (YYYY-MM-DD)
 * @query {string} team - Filter by team abbreviation
 * @query {string} status - Game status (scheduled, live, finished)
 * @query {number} limit - Limit results (max 50)
 */
router.get('/', 
    authenticate,
    rateLimiter.free,
    [
        query('date').optional().isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('status').optional().isIn(['scheduled', 'live', 'finished', 'postponed']).withMessage('Invalid game status'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
    ],
    validateRequest,
    gamesController.getGames
);

/**
 * GET /api/nba/games/today
 * Get today's NBA games
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} status - Filter by game status
 * @query {boolean} scores - Include live scores
 */
router.get('/today', 
    authenticate,
    rateLimiter.free,
    [
        query('status').optional().isIn(['scheduled', 'live', 'finished']).withMessage('Invalid game status'),
        query('scores').optional().isBoolean().withMessage('Scores must be boolean')
    ],
    validateRequest,
    gamesController.getTodaysGames
);

/**
 * GET /api/nba/games/:gameId
 * Get specific game information
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} gameId - NBA game ID
 * @query {string} include - Additional data (stats, lineups, officials)
 */
router.get('/:gameId', 
    authenticate,
    rateLimiter.free,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('include').optional().isString().withMessage('Include must be comma-separated string')
    ],
    validateRequest,
    gamesController.getGameById
);

/**
 * GET /api/nba/games/:gameId/score
 * Get live game score and basic stats
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} gameId - NBA game ID
 */
router.get('/:gameId/score', 
    authenticate,
    rateLimiter.free,
    [
        param('gameId').notEmpty().withMessage('Game ID is required')
    ],
    validateRequest,
    gamesController.getGameScore
);

/**
 * GET /api/nba/games/schedule
 * Get games schedule for date range
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} from - Start date (YYYY-MM-DD)
 * @query {string} to - End date (YYYY-MM-DD)
 * @query {string} team - Filter by team
 */
router.get('/schedule', 
    authenticate,
    rateLimiter.free,
    [
        query('from').optional().isISO8601().withMessage('Invalid from date format'),
        query('to').optional().isISO8601().withMessage('Invalid to date format'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation')
    ],
    validateRequest,
    gamesController.getSchedule
);

// =============================================================================
// STANDARD TIER ENDPOINTS (500 requests/hour)
// =============================================================================

/**
 * GET /api/nba/games/:gameId/boxscore
 * Get detailed game box score
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} gameId - NBA game ID
 * @query {string} format - Response format (detailed, summary)
 */
router.get('/:gameId/boxscore', 
    authenticate,
    rateLimiter.standard,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('format').optional().isIn(['detailed', 'summary']).withMessage('Invalid format')
    ],
    validateRequest,
    gamesController.getBoxScore
);

/**
 * GET /api/nba/games/:gameId/team-stats
 * Get team statistics for specific game
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} gameId - NBA game ID
 * @query {string} team - Specific team stats
 * @query {string} period - Specific period/quarter
 */
router.get('/:gameId/team-stats', 
    authenticate,
    rateLimiter.standard,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('period').optional().isIn(['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'OT2', 'OT3', 'FINAL']).withMessage('Invalid period')
    ],
    validateRequest,
    gamesController.getTeamStats
);

/**
 * GET /api/nba/games/:gameId/player-stats
 * Get player statistics for specific game
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} gameId - NBA game ID
 * @query {string} team - Filter by team
 * @query {string} position - Filter by position
 * @query {string} starter - Filter starters only
 */
router.get('/:gameId/player-stats', 
    authenticate,
    rateLimiter.standard,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('position').optional().isIn(['PG', 'SG', 'SF', 'PF', 'C']).withMessage('Invalid position'),
        query('starter').optional().isBoolean().withMessage('Starter must be boolean')
    ],
    validateRequest,
    gamesController.getPlayerStats
);

/**
 * GET /api/nba/games/:gameId/timeline
 * Get game timeline and key events
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} gameId - NBA game ID
 * @query {string} period - Filter by period
 * @query {string} eventType - Filter by event type
 */
router.get('/:gameId/timeline', 
    authenticate,
    rateLimiter.standard,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('period').optional().isIn(['Q1', 'Q2', 'Q3', 'Q4', 'OT']).withMessage('Invalid period'),
        query('eventType').optional().isIn(['shot', 'foul', 'turnover', 'timeout', 'substitution']).withMessage('Invalid event type')
    ],
    validateRequest,
    gamesController.getGameTimeline
);

/**
 * GET /api/nba/games/historical
 * Get historical games data
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} season - Season (e.g., 2023-24)
 * @query {string} team - Filter by team
 * @query {string} opponent - Filter by opponent
 * @query {number} limit - Limit results
 */
router.get('/historical', 
    authenticate,
    rateLimiter.standard,
    [
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format (e.g., 2023-24)'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('opponent').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid opponent abbreviation'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100')
    ],
    validateRequest,
    gamesController.getHistoricalGames
);

// =============================================================================
// PREMIUM TIER ENDPOINTS (2000 requests/hour)
// =============================================================================

/**
 * GET /api/nba/games/:gameId/play-by-play
 * Get detailed play-by-play data
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} gameId - NBA game ID
 * @query {string} period - Filter by period
 * @query {string} team - Filter by team
 * @query {boolean} video - Include video links
 */
router.get('/:gameId/play-by-play', 
    authenticate,
    rateLimiter.premium,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('period').optional().isIn(['Q1', 'Q2', 'Q3', 'Q4', 'OT']).withMessage('Invalid period'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('video').optional().isBoolean().withMessage('Video must be boolean')
    ],
    validateRequest,
    gamesController.getPlayByPlay
);

/**
 * GET /api/nba/games/:gameId/live-tracking
 * Get real-time live game tracking data
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} gameId - NBA game ID
 * @query {boolean} positions - Include player positions
 * @query {boolean} ball - Include ball tracking
 */
router.get('/:gameId/live-tracking', 
    authenticate,
    rateLimiter.premium,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('positions').optional().isBoolean().withMessage('Positions must be boolean'),
        query('ball').optional().isBoolean().withMessage('Ball must be boolean')
    ],
    validateRequest,
    gamesController.getLiveTracking
);

/**
 * GET /api/nba/games/:gameId/advanced-stats
 * Get advanced game analytics
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} gameId - NBA game ID
 * @query {string} metrics - Specific metrics to include
 * @query {string} team - Filter by team
 */
router.get('/:gameId/advanced-stats', 
    authenticate,
    rateLimiter.premium,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('metrics').optional().isString().withMessage('Metrics must be comma-separated string'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation')
    ],
    validateRequest,
    gamesController.getAdvancedStats
);

/**
 * GET /api/nba/games/:gameId/predictions
 * Get game predictions and win probability
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} gameId - NBA game ID
 * @query {string} model - Prediction model type
 * @query {boolean} live - Live win probability updates
 */
router.get('/:gameId/predictions', 
    authenticate,
    rateLimiter.premium,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('model').optional().isIn(['basic', 'advanced', 'ml']).withMessage('Invalid model type'),
        query('live').optional().isBoolean().withMessage('Live must be boolean')
    ],
    validateRequest,
    gamesController.getGamePredictions
);

/**
 * GET /api/nba/games/:gameId/momentum
 * Get game momentum analysis
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} gameId - NBA game ID
 * @query {string} period - Filter by period
 * @query {string} metric - Momentum metric type
 */
router.get('/:gameId/momentum', 
    authenticate,
    rateLimiter.premium,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('period').optional().isIn(['Q1', 'Q2', 'Q3', 'Q4', 'OT']).withMessage('Invalid period'),
        query('metric').optional().isIn(['scoring', 'possession', 'defensive', 'overall']).withMessage('Invalid momentum metric')
    ],
    validateRequest,
    gamesController.getGameMomentum
);

/**
 * GET /api/nba/games/live
 * Get all currently live games
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {boolean} detailed - Include detailed live data
 * @query {boolean} tracking - Include player tracking
 */
router.get('/live', 
    authenticate,
    rateLimiter.premium,
    [
        query('detailed').optional().isBoolean().withMessage('Detailed must be boolean'),
        query('tracking').optional().isBoolean().withMessage('Tracking must be boolean')
    ],
    validateRequest,
    gamesController.getLiveGames
);

/**
 * GET /api/nba/games/:gameId/clutch-stats
 * Get clutch time statistics
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} gameId - NBA game ID
 * @query {string} definition - Clutch time definition
 * @query {string} team - Filter by team
 */
router.get('/:gameId/clutch-stats', 
    authenticate,
    rateLimiter.premium,
    [
        param('gameId').notEmpty().withMessage('Game ID is required'),
        query('definition').optional().isIn(['last5min', 'last2min', 'last30sec']).withMessage('Invalid clutch definition'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation')
    ],
    validateRequest,
    gamesController.getClutchStats
);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Handle 404 for undefined routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'ENDPOINT_NOT_FOUND',
            message: `Games API endpoint ${req.originalUrl} not found`,
            availableEndpoints: [
                'GET /api/nba/games - Get games with filters',
                'GET /api/nba/games/today - Get today\'s games',
                'GET /api/nba/games/:gameId - Get game by ID',
                'GET /api/nba/games/:gameId/score - Get game score',
                'GET /api/nba/games/schedule - Get games schedule',
                'GET /api/nba/games/:gameId/boxscore - Get box score (Standard)',
                'GET /api/nba/games/:gameId/team-stats - Get team stats (Standard)',
                'GET /api/nba/games/:gameId/player-stats - Get player stats (Standard)',
                'GET /api/nba/games/:gameId/timeline - Get game timeline (Standard)',
                'GET /api/nba/games/historical - Get historical games (Standard)',
                'GET /api/nba/games/:gameId/play-by-play - Get play-by-play (Premium)',
                'GET /api/nba/games/:gameId/live-tracking - Get live tracking (Premium)',
                'GET /api/nba/games/:gameId/advanced-stats - Get advanced stats (Premium)',
                'GET /api/nba/games/:gameId/predictions - Get predictions (Premium)',
                'GET /api/nba/games/:gameId/momentum - Get momentum analysis (Premium)',
                'GET /api/nba/games/live - Get live games (Premium)',
                'GET /api/nba/games/:gameId/clutch-stats - Get clutch stats (Premium)'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
