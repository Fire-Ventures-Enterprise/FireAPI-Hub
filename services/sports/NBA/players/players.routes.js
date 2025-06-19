const express = require('express');
const router = express.Router();
const playersController = require('./players.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { rateLimiter } = require('../../../../middleware/rateLimiter.middleware');
const { validateRequest } = require('../../../../middleware/validation.middleware');
const { body, param, query } = require('express-validator');

// =============================================================================
// NBA PLAYERS API ROUTES
// =============================================================================
// This file defines all NBA Players API endpoints with tier-based access control
// FREE TIER: Basic player info, current stats (100 req/hour)
// STANDARD TIER: Career stats, game logs, historical data (500 req/hour)  
// PREMIUM TIER: Advanced analytics, comparisons, predictions (2000 req/hour)
// =============================================================================

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'NBA Players API',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// =============================================================================
// FREE TIER ENDPOINTS (100 requests/hour)
// =============================================================================

/**
 * GET /api/nba/players
 * Get all NBA players with filtering options
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} team - Filter by team abbreviation
 * @query {string} position - Filter by position (PG, SG, SF, PF, C)
 * @query {string} status - Filter by status (active, injured, inactive)
 * @query {number} limit - Limit results (max 100)
 * @query {number} page - Page number for pagination
 */
router.get('/', 
    authenticate,
    rateLimiter.free,
    [
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('position').optional().isIn(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F']).withMessage('Invalid position'),
        query('status').optional().isIn(['active', 'injured', 'inactive', 'suspended']).withMessage('Invalid status'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer')
    ],
    validateRequest,
    playersController.getAllPlayers
);

/**
 * GET /api/nba/players/:playerId
 * Get specific player information
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} playerId - NBA player ID
 * @query {string} include - Additional data (stats, bio, social)
 */
router.get('/:playerId', 
    authenticate,
    rateLimiter.free,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('include').optional().isString().withMessage('Include must be comma-separated string')
    ],
    validateRequest,
    playersController.getPlayerById
);

/**
 * GET /api/nba/players/:playerId/current-stats
 * Get player's current season statistics
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} playerId - NBA player ID
 * @query {string} type - Stats type (regular, playoffs, preseason)
 */
router.get('/:playerId/current-stats', 
    authenticate,
    rateLimiter.free,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('type').optional().isIn(['regular', 'playoffs', 'preseason']).withMessage('Invalid stats type')
    ],
    validateRequest,
    playersController.getCurrentStats
);

/**
 * GET /api/nba/players/search
 * Search players by name or other criteria
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} q - Search query
 * @query {string} filters - Additional filters
 * @query {number} limit - Limit results
 */
router.get('/search', 
    authenticate,
    rateLimiter.free,
    [
        query('q').notEmpty().withMessage('Search query is required').isLength({ min: 2 }).withMessage('Query must be at least 2 characters'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
    ],
    validateRequest,
    playersController.searchPlayers
);

// =============================================================================
// STANDARD TIER ENDPOINTS (500 requests/hour)
// =============================================================================

/**
 * GET /api/nba/players/:playerId/career-stats
 * Get player's complete career statistics
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} playerId - NBA player ID
 * @query {string} type - Stats type (regular, playoffs, both)
 * @query {boolean} pergame - Per game averages (true/false)
 */
router.get('/:playerId/career-stats', 
    authenticate,
    rateLimiter.standard,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('type').optional().isIn(['regular', 'playoffs', 'both']).withMessage('Invalid stats type'),
        query('pergame').optional().isBoolean().withMessage('Pergame must be boolean')
    ],
    validateRequest,
    playersController.getCareerStats
);

/**
 * GET /api/nba/players/:playerId/game-logs
 * Get player's game-by-game logs
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} playerId - NBA player ID
 * @query {string} season - Season (e.g., 2023-24)
 * @query {string} from - Start date (YYYY-MM-DD)
 * @query {string} to - End date (YYYY-MM-DD)
 * @query {number} limit - Limit results (max 82)
 */
router.get('/:playerId/game-logs', 
    authenticate,
    rateLimiter.standard,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format (e.g., 2023-24)'),
        query('from').optional().isISO8601().withMessage('Invalid from date format'),
        query('to').optional().isISO8601().withMessage('Invalid to date format'),
        query('limit').optional().isInt({ min: 1, max: 82 }).withMessage('Limit must be between 1-82')
    ],
    validateRequest,
    playersController.getGameLogs
);

/**
 * GET /api/nba/players/:playerId/splits
 * Get player's statistical splits (home/away, vs teams, etc.)
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} playerId - NBA player ID
 * @query {string} type - Split type (home-away, vs-teams, monthly)
 * @query {string} season - Season year
 */
router.get('/:playerId/splits', 
    authenticate,
    rateLimiter.standard,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('type').optional().isIn(['home-away', 'vs-teams', 'monthly', 'vs-position']).withMessage('Invalid split type'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format')
    ],
    validateRequest,
    playersController.getPlayerSplits
);

/**
 * GET /api/nba/players/:playerId/awards
 * Get player's awards and achievements
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} playerId - NBA player ID
 * @query {string} type - Award type (mvp, allstar, championships)
 */
router.get('/:playerId/awards', 
    authenticate,
    rateLimiter.standard,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('type').optional().isIn(['mvp', 'allstar', 'championships', 'rookie', 'defensive']).withMessage('Invalid award type')
    ],
    validateRequest,
    playersController.getPlayerAwards
);

// =============================================================================
// PREMIUM TIER ENDPOINTS (2000 requests/hour)
// =============================================================================

/**
 * GET /api/nba/players/:playerId/advanced-analytics
 * Get player's advanced analytics and metrics
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} playerId - NBA player ID
 * @query {string} metrics - Specific metrics to include
 * @query {string} period - Time period (season, last30, last10)
 * @query {string} context - Context (clutch, garbage-time, close-games)
 */
router.get('/:playerId/advanced-analytics', 
    authenticate,
    rateLimiter.premium,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('metrics').optional().isString().withMessage('Metrics must be comma-separated string'),
        query('period').optional().isIn(['season', 'last30', 'last10', 'last5']).withMessage('Invalid period'),
        query('context').optional().isIn(['clutch', 'garbage-time', 'close-games', 'blowouts']).withMessage('Invalid context')
    ],
    validateRequest,
    playersController.getAdvancedAnalytics
);

/**
 * GET /api/nba/players/:playerId/projections
 * Get player's performance projections and predictions
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} playerId - NBA player ID
 * @query {string} type - Projection type (season, game, fantasy)
 * @query {number} games - Number of games to project
 */
router.get('/:playerId/projections', 
    authenticate,
    rateLimiter.premium,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('type').optional().isIn(['season', 'game', 'fantasy', 'contract']).withMessage('Invalid projection type'),
        query('games').optional().isInt({ min: 1, max: 82 }).withMessage('Games must be between 1-82')
    ],
    validateRequest,
    playersController.getPlayerProjections
);

/**
 * GET /api/nba/players/:playerId/injury-history
 * Get player's injury history and risk analysis
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} playerId - NBA player ID
 * @query {number} years - Years of history (max 10)
 * @query {string} type - Injury type filter
 */
router.get('/:playerId/injury-history', 
    authenticate,
    rateLimiter.premium,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('years').optional().isInt({ min: 1, max: 10 }).withMessage('Years must be between 1-10'),
        query('type').optional().isString().withMessage('Invalid injury type')
    ],
    validateRequest,
    playersController.getInjuryHistory
);

/**
 * GET /api/nba/players/compare
 * Compare multiple players head-to-head
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} players - Comma-separated player IDs (2-4 players)
 * @query {string} metrics - Metrics to compare
 * @query {string} season - Season for comparison
 * @query {string} context - Comparison context
 */
router.get('/compare', 
    authenticate,
    rateLimiter.premium,
    [
        query('players')
            .notEmpty()
            .withMessage('Players parameter is required')
            .custom((value) => {
                const playerIds = value.split(',');
                if (playerIds.length < 2 || playerIds.length > 4) {
                    throw new Error('Must provide 2-4 players for comparison');
                }
                return true;
            }),
        query('metrics').optional().isString().withMessage('Metrics must be comma-separated string'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('context').optional().isIn(['overall', 'clutch', 'playoffs', 'head-to-head']).withMessage('Invalid context')
    ],
    validateRequest,
    playersController.comparePlayers
);

/**
 * GET /api/nba/players/:playerId/shot-charts
 * Get player's shot chart data and heat maps
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} playerId - NBA player ID
 * @query {string} season - Season for shot chart
 * @query {string} type - Chart type (season, game, playoff)
 * @query {string} zone - Court zone filter
 */
router.get('/:playerId/shot-charts', 
    authenticate,
    rateLimiter.premium,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('type').optional().isIn(['season', 'game', 'playoff', 'clutch']).withMessage('Invalid chart type'),
        query('zone').optional().isIn(['paint', 'midrange', 'three', 'all']).withMessage('Invalid zone')
    ],
    validateRequest,
    playersController.getShotCharts
);

/**
 * GET /api/nba/players/rookies
 * Get rookie players and their performance
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} season - Season year
 * @query {string} sort - Sort by metric
 * @query {number} limit - Limit results
 */
router.get('/rookies', 
    authenticate,
    rateLimiter.premium,
    [
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('sort').optional().isIn(['points', 'rebounds', 'assists', 'efficiency']).withMessage('Invalid sort metric'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100')
    ],
    validateRequest,
    playersController.getRookieStats
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
            message: `Players API endpoint ${req.originalUrl} not found`,
            availableEndpoints: [
                'GET /api/nba/players - Get all players',
                'GET /api/nba/players/:playerId - Get player by ID',
                'GET /api/nba/players/:playerId/current-stats - Get current stats',
                'GET /api/nba/players/search - Search players',
                'GET /api/nba/players/:playerId/career-stats - Get career stats (Standard)',
                'GET /api/nba/players/:playerId/game-logs - Get game logs (Standard)',
                'GET /api/nba/players/:playerId/splits - Get statistical splits (Standard)',
                'GET /api/nba/players/:playerId/awards - Get awards (Standard)',
                'GET /api/nba/players/:playerId/advanced-analytics - Get analytics (Premium)',
                'GET /api/nba/players/:playerId/projections - Get projections (Premium)',
                'GET /api/nba/players/:playerId/injury-history - Get injury history (Premium)',
                'GET /api/nba/players/compare - Compare players (Premium)',
                'GET /api/nba/players/:playerId/shot-charts - Get shot charts (Premium)',
                'GET /api/nba/players/rookies - Get rookie stats (Premium)'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
