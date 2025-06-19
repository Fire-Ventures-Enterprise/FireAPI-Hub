const express = require('express');
const router = express.Router();
const teamsController = require('./teams.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { rateLimiter } = require('../../../../middleware/rateLimiter.middleware');
const { validateRequest } = require('../../../../middleware/validation.middleware');
const { body, param, query } = require('express-validator');

// =============================================================================
// NBA TEAMS API ROUTES
// =============================================================================
// This file defines all NBA Teams API endpoints with tier-based access control
// FREE TIER: Basic team info, current roster
// STANDARD TIER: Historical data, detailed stats
// PREMIUM TIER: Advanced analytics, real-time updates
// =============================================================================

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'NBA Teams API',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// =============================================================================
// FREE TIER ENDPOINTS (100 requests/hour)
// =============================================================================

/**
 * GET /api/nba/teams
 * Get all NBA teams basic information
 * Tier: FREE
 * Rate limit: 100/hour
 */
router.get('/', 
    authenticate,
    rateLimiter.free,
    teamsController.getAllTeams
);

/**
 * GET /api/nba/teams/:teamId
 * Get specific team information
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} teamId - NBA team ID or abbreviation
 */
router.get('/:teamId', 
    authenticate,
    rateLimiter.free,
    [
        param('teamId')
            .notEmpty()
            .withMessage('Team ID is required')
            .isLength({ min: 2, max: 10 })
            .withMessage('Invalid team ID format')
    ],
    validateRequest,
    teamsController.getTeamById
);

/**
 * GET /api/nba/teams/:teamId/roster
 * Get current team roster
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} teamId - NBA team ID or abbreviation
 */
router.get('/:teamId/roster', 
    authenticate,
    rateLimiter.free,
    [
        param('teamId')
            .notEmpty()
            .withMessage('Team ID is required')
    ],
    validateRequest,
    teamsController.getTeamRoster
);

// =============================================================================
// STANDARD TIER ENDPOINTS (500 requests/hour)
// =============================================================================

/**
 * GET /api/nba/teams/:teamId/stats
 * Get team statistics for current season
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} teamId - NBA team ID or abbreviation
 * @query {string} season - Season year (optional, defaults to current)
 */
router.get('/:teamId/stats', 
    authenticate,
    rateLimiter.standard,
    [
        param('teamId').notEmpty().withMessage('Team ID is required'),
        query('season').optional().isLength({ min: 4, max: 9 }).withMessage('Invalid season format (e.g., 2023-24)')
    ],
    validateRequest,
    teamsController.getTeamStats
);

/**
 * GET /api/nba/teams/:teamId/schedule
 * Get team schedule/games
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} teamId - NBA team ID or abbreviation
 * @query {string} from - Start date (YYYY-MM-DD)
 * @query {string} to - End date (YYYY-MM-DD)
 * @query {string} status - Game status (scheduled, live, finished)
 */
router.get('/:teamId/schedule', 
    authenticate,
    rateLimiter.standard,
    [
        param('teamId').notEmpty().withMessage('Team ID is required'),
        query('from').optional().isISO8601().withMessage('Invalid from date format'),
        query('to').optional().isISO8601().withMessage('Invalid to date format'),
        query('status').optional().isIn(['scheduled', 'live', 'finished']).withMessage('Invalid status')
    ],
    validateRequest,
    teamsController.getTeamSchedule
);

/**
 * GET /api/nba/teams/:teamId/standings
 * Get team's current standings position
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} teamId - NBA team ID or abbreviation
 * @query {string} season - Season year (optional)
 */
router.get('/:teamId/standings', 
    authenticate,
    rateLimiter.standard,
    [
        param('teamId').notEmpty().withMessage('Team ID is required'),
        query('season').optional().isLength({ min: 4, max: 9 }).withMessage('Invalid season format')
    ],
    validateRequest,
    teamsController.getTeamStandings
);

// =============================================================================
// PREMIUM TIER ENDPOINTS (2000 requests/hour)
// =============================================================================

/**
 * GET /api/nba/teams/:teamId/analytics
 * Get advanced team analytics and metrics
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} teamId - NBA team ID or abbreviation
 * @query {string} metrics - Comma-separated list of metrics
 * @query {string} period - Time period (last7, last30, season)
 */
router.get('/:teamId/analytics', 
    authenticate,
    rateLimiter.premium,
    [
        param('teamId').notEmpty().withMessage('Team ID is required'),
        query('metrics').optional().isString().withMessage('Metrics must be comma-separated string'),
        query('period').optional().isIn(['last7', 'last30', 'season']).withMessage('Invalid period')
    ],
    validateRequest,
    teamsController.getTeamAnalytics
);

/**
 * GET /api/nba/teams/:teamId/injuries
 * Get current team injury report
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} teamId - NBA team ID or abbreviation
 */
router.get('/:teamId/injuries', 
    authenticate,
    rateLimiter.premium,
    [
        param('teamId').notEmpty().withMessage('Team ID is required')
    ],
    validateRequest,
    teamsController.getTeamInjuries
);

/**
 * GET /api/nba/teams/:teamId/trades
 * Get team trade history and rumors
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @param {string} teamId - NBA team ID or abbreviation
 * @query {string} type - Trade type (completed, rumors, all)
 * @query {number} limit - Number of results (max 50)
 */
router.get('/:teamId/trades', 
    authenticate,
    rateLimiter.premium,
    [
        param('teamId').notEmpty().withMessage('Team ID is required'),
        query('type').optional().isIn(['completed', 'rumors', 'all']).withMessage('Invalid trade type'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
    ],
    validateRequest,
    teamsController.getTeamTrades
);

/**
 * GET /api/nba/teams/compare
 * Compare multiple teams head-to-head
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} teams - Comma-separated team IDs (2-4 teams)
 * @query {string} metrics - Metrics to compare
 * @query {string} season - Season year
 */
router.get('/compare', 
    authenticate,
    rateLimiter.premium,
    [
        query('teams')
            .notEmpty()
            .withMessage('Teams parameter is required')
            .custom((value) => {
                const teamIds = value.split(',');
                if (teamIds.length < 2 || teamIds.length > 4) {
                    throw new Error('Must provide 2-4 teams for comparison');
                }
                return true;
            }),
        query('metrics').optional().isString().withMessage('Metrics must be comma-separated string'),
        query('season').optional().isLength({ min: 4, max: 9 }).withMessage('Invalid season format')
    ],
    validateRequest,
    teamsController.compareTeams
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
            message: `Teams API endpoint ${req.originalUrl} not found`,
            availableEndpoints: [
                'GET /api/nba/teams - Get all teams',
                'GET /api/nba/teams/:teamId - Get team by ID',
                'GET /api/nba/teams/:teamId/roster - Get team roster',
                'GET /api/nba/teams/:teamId/stats - Get team stats',
                'GET /api/nba/teams/:teamId/schedule - Get team schedule',
                'GET /api/nba/teams/:teamId/standings - Get team standings',
                'GET /api/nba/teams/:teamId/analytics - Get team analytics (Premium)',
                'GET /api/nba/teams/:teamId/injuries - Get injury report (Premium)',
                'GET /api/nba/teams/:teamId/trades - Get trade info (Premium)',
                'GET /api/nba/teams/compare - Compare teams (Premium)'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
