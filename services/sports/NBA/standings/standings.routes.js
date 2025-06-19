const express = require('express');
const router = express.Router();
const standingsController = require('./standings.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { rateLimiter } = require('../../../../middleware/rateLimiter.middleware');
const { validateRequest } = require('../../../../middleware/validation.middleware');
const { body, param, query } = require('express-validator');

// =============================================================================
// NBA STANDINGS API ROUTES
// =============================================================================
// This file defines all NBA Standings API endpoints with tier-based access control
// FREE TIER: Current standings, conference/division standings (100 req/hour)
// STANDARD TIER: Historical standings, playoff race, trends (500 req/hour)
// PREMIUM TIER: Projections, scenarios, advanced analytics (2000 req/hour)
// =============================================================================

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'NBA Standings API',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// =============================================================================
// FREE TIER ENDPOINTS (100 requests/hour)
// =============================================================================

/**
 * GET /api/nba/standings
 * Get current NBA standings
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} conference - Filter by conference (Eastern, Western)
 * @query {string} division - Filter by division
 * @query {string} season - Season year (defaults to current)
 */
router.get('/', 
    authenticate,
    rateLimiter.free,
    [
        query('conference').optional().isIn(['Eastern', 'Western']).withMessage('Invalid conference'),
        query('division').optional().isIn(['Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest']).withMessage('Invalid division'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format (e.g., 2023-24)')
    ],
    validateRequest,
    standingsController.getCurrentStandings
);

/**
 * GET /api/nba/standings/conference/:conference
 * Get standings for specific conference
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} conference - Conference name (Eastern, Western)
 * @query {string} season - Season year
 */
router.get('/conference/:conference', 
    authenticate,
    rateLimiter.free,
    [
        param('conference').isIn(['Eastern', 'Western']).withMessage('Invalid conference'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format')
    ],
    validateRequest,
    standingsController.getConferenceStandings
);

/**
 * GET /api/nba/standings/division/:division
 * Get standings for specific division
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} division - Division name
 * @query {string} season - Season year
 */
router.get('/division/:division', 
    authenticate,
    rateLimiter.free,
    [
        param('division').isIn(['Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest']).withMessage('Invalid division'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format')
    ],
    validateRequest,
    standingsController.getDivisionStandings
);

/**
 * GET /api/nba/standings/team/:teamId
 * Get specific team's standings position
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} teamId - Team ID or abbreviation
 * @query {string} season - Season year
 */
router.get('/team/:teamId', 
    authenticate,
    rateLimiter.free,
    [
        param('teamId').notEmpty().withMessage('Team ID is required'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format')
    ],
    validateRequest,
    standingsController.getTeamStandings
);

/**
 * GET /api/nba/standings/playoff-picture
 * Get current playoff picture and seeding
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} conference - Filter by conference
 * @query {string} season - Season year
 */
router.get('/playoff-picture', 
    authenticate,
    rateLimiter.free,
    [
        query('conference').optional().isIn(['Eastern', 'Western']).withMessage('Invalid conference'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format')
    ],
    validateRequest,
    standingsController.getPlayoffPicture
);

// =============================================================================
// STANDARD TIER ENDPOINTS (500 requests/hour)
// =============================================================================

/**
 * GET /api/nba/standings/historical
 * Get historical standings data
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} season - Season year (required)
 * @query {string} date - Specific date for standings
 * @query {string} conference - Filter by conference
 */
router.get('/historical', 
    authenticate,
    rateLimiter.standard,
    [
        query('season').notEmpty().withMessage('Season is required').isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('date').optional().isISO8601().withMessage('Invalid date format'),
        query('conference').optional().isIn(['Eastern', 'Western']).withMessage('Invalid conference')
    ],
    validateRequest,
    standingsController.getHistoricalStandings
);

/**
 * GET /api/nba/standings/trends
 * Get standings trends and movement
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} period - Time period (week, month, season)
 * @query {string} team - Filter by team
 * @query {string} metric - Trend metric (wins, losses, winPct, streak)
 */
router.get('/trends', 
    authenticate,
    rateLimiter.standard,
    [
        query('period').optional().isIn(['week', 'month', 'season']).withMessage('Invalid period'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('metric').optional().isIn(['wins', 'losses', 'winPct', 'streak', 'gamesBehind']).withMessage('Invalid metric')
    ],
    validateRequest,
    standingsController.getStandingsTrends
);

/**
 * GET /api/nba/standings/playoff-race
 * Get playoff race analysis and bubble teams
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} conference - Filter by conference
 * @query {number} bubble - Number of bubble teams to include
 */
router.get('/playoff-race', 
    authenticate,
    rateLimiter.standard,
    [
        query('conference').optional().isIn(['Eastern', 'Western']).withMessage('Invalid conference'),
        query('bubble').optional().isInt({ min: 1, max: 10 }).withMessage('Bubble must be between 1-10')
    ],
    validateRequest,
    standingsController.getPlayoffRace
);

/**
 * GET /api/nba/standings/head-to-head
 * Get head-to-head records between teams
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} teams - Comma-separated team IDs (2-4 teams)
 * @query {string} season - Season year
 */
router.get('/head-to-head', 
    authenticate,
    rateLimiter.standard,
    [
        query('teams')
            .notEmpty()
            .withMessage('Teams parameter is required')
            .custom((value) => {
                const teamIds = value.split(',');
                if (teamIds.length < 2 || teamIds.length > 4) {
                    throw new Error('Must provide 2-4 teams');
                }
                return true;
            }),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format')
    ],
    validateRequest,
    standingsController.getHeadToHeadRecord
);

/**
 * GET /api/nba/standings/streaks
 * Get current winning/losing streaks
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} type - Streak type (winning, losing, both)
 * @query {number} min - Minimum streak length
 * @query {string} conference - Filter by conference
 */
router.get('/streaks', 
    authenticate,
    rateLimiter.standard,
    [
        query('type').optional().isIn(['winning', 'losing', 'both']).withMessage('Invalid streak type'),
        query('min').optional().isInt({ min: 1, max: 20 }).withMessage('Min streak must be between 1-20'),
        query('conference').optional().isIn(['Eastern', 'Western']).withMessage('Invalid conference')
    ],
    validateRequest,
    standingsController.getCurrentStreaks
);

// =============================================================================
// PREMIUM TIER ENDPOINTS (2000 requests/hour)
// =============================================================================

/**
 * GET /api/nba/standings/projections
 * Get season projections and final standings predictions
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} model - Projection model (simple, advanced, ml)
 * @query {string} conference - Filter by conference
 * @query {boolean} playoffs - Include playoff projections
 */
router.get('/projections', 
    authenticate,
    rateLimiter.premium,
    [
        query('model').optional().isIn(['simple', 'advanced', 'ml']).withMessage('Invalid projection model'),
        query('conference').optional().isIn(['Eastern', 'Western']).withMessage('Invalid conference'),
        query('playoffs').optional().isBoolean().withMessage('Playoffs must be boolean')
    ],
    validateRequest,
    standingsController.getSeasonProjections
);

/**
 * GET /api/nba/standings/scenarios
 * Get playoff scenarios and magic numbers
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} team - Team to analyze scenarios for
 * @query {string} type - Scenario type (clinch, eliminate, tiebreaker)
 * @query {number} games - Number of games to simulate ahead
 */
router.get('/scenarios', 
    authenticate,
    rateLimiter.premium,
    [
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('type').optional().isIn(['clinch', 'eliminate', 'tiebreaker', 'draft']).withMessage('Invalid scenario type'),
        query('games').optional().isInt({ min: 1, max: 20 }).withMessage('Games must be between 1-20')
    ],
    validateRequest,
    standingsController.getPlayoffScenarios
);

/**
 * GET /api/nba/standings/power-rankings
 * Get power rankings based on advanced metrics
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} metrics - Metrics to include in rankings
 * @query {boolean} strength - Include strength of schedule
 * @query {string} period - Time period for analysis
 */
router.get('/power-rankings', 
    authenticate,
    rateLimiter.premium,
    [
        query('metrics').optional().isString().withMessage('Metrics must be comma-separated string'),
        query('strength').optional().isBoolean().withMessage('Strength must be boolean'),
        query('period').optional().isIn(['season', 'last30', 'last15', 'last10']).withMessage('Invalid period')
    ],
    validateRequest,
    standingsController.getPowerRankings
);

/**
 * GET /api/nba/standings/tiebreakers
 * Get tiebreaker analysis for teams with same record
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} teams - Teams involved in tiebreaker
 * @query {string} scenario - Tiebreaker scenario type
 */
router.get('/tiebreakers', 
    authenticate,
    rateLimiter.premium,
    [
        query('teams').optional().isString().withMessage('Teams must be comma-separated string'),
        query('scenario').optional().isIn(['division', 'conference', 'wildcard']).withMessage('Invalid tiebreaker scenario')
    ],
    validateRequest,
    standingsController.getTiebreakerAnalysis
);

/**
 * GET /api/nba/standings/draft-lottery
 * Get draft lottery odds and positioning
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} season - Season year
 * @query {boolean} odds - Include lottery odds
 * @query {string} team - Filter by team
 */
router.get('/draft-lottery', 
    authenticate,
    rateLimiter.premium,
    [
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('odds').optional().isBoolean().withMessage('Odds must be boolean'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation')
    ],
    validateRequest,
    standingsController.getDraftLotteryOdds
);

/**
 * GET /api/nba/standings/strength-of-schedule
 * Get strength of schedule analysis
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} team - Filter by team
 * @query {string} period - Analysis period (remaining, played, season)
 * @query {string} metric - SOS metric type
 */
router.get('/strength-of-schedule', 
    authenticate,
    rateLimiter.premium,
    [
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('period').optional().isIn(['remaining', 'played', 'season']).withMessage('Invalid period'),
        query('metric').optional().isIn(['winPct', 'netRating', 'combined']).withMessage('Invalid SOS metric')
    ],
    validateRequest,
    standingsController.getStrengthOfSchedule
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
            message: `Standings API endpoint ${req.originalUrl} not found`,
            availableEndpoints: [
                'GET /api/nba/standings - Get current standings',
                'GET /api/nba/standings/conference/:conference - Get conference standings',
                'GET /api/nba/standings/division/:division - Get division standings',
                'GET /api/nba/standings/team/:teamId - Get team standings',
                'GET /api/nba/standings/playoff-picture - Get playoff picture',
                'GET /api/nba/standings/historical - Get historical standings (Standard)',
                'GET /api/nba/standings/trends - Get standings trends (Standard)',
                'GET /api/nba/standings/playoff-race - Get playoff race (Standard)',
                'GET /api/nba/standings/head-to-head - Get head-to-head records (Standard)',
                'GET /api/nba/standings/streaks - Get current streaks (Standard)',
                'GET /api/nba/standings/projections - Get season projections (Premium)',
                'GET /api/nba/standings/scenarios - Get playoff scenarios (Premium)',
                'GET /api/nba/standings/power-rankings - Get power rankings (Premium)',
                'GET /api/nba/standings/tiebreakers - Get tiebreaker analysis (Premium)',
                'GET /api/nba/standings/draft-lottery - Get draft lottery odds (Premium)',
                'GET /api/nba/standings/strength-of-schedule - Get SOS analysis (Premium)'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
