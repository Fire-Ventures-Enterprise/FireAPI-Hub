const express = require('express');
const router = express.Router();
const advancedStatsController = require('./advanced-stats.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { rateLimiter } = require('../../../../middleware/rateLimiter.middleware');
const { validateRequest } = require('../../../../middleware/validation.middleware');
const { body, param, query } = require('express-validator');

// =============================================================================
// NBA ADVANCED STATS API ROUTES
// =============================================================================
// This file defines all NBA Advanced Statistics API endpoints with tier-based access
// FREE TIER: Basic efficiency ratings, team ratings (100 req/hour)
// STANDARD TIER: Player efficiency, advanced team metrics (500 req/hour)
// PREMIUM TIER: Machine learning insights, predictive analytics (2000 req/hour)
// =============================================================================

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'NBA Advanced Stats API',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// =============================================================================
// FREE TIER ENDPOINTS (100 requests/hour)
// =============================================================================

/**
 * GET /api/nba/advanced-stats/team-ratings
 * Get basic team efficiency ratings
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} season - Season year (defaults to current)
 * @query {string} team - Filter by team abbreviation
 * @query {string} metric - Specific rating (offensive, defensive, net)
 */
router.get('/team-ratings', 
    authenticate,
    rateLimiter.free,
    [
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format (e.g., 2023-24)'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('metric').optional().isIn(['offensive', 'defensive', 'net', 'all']).withMessage('Invalid rating metric')
    ],
    validateRequest,
    advancedStatsController.getTeamRatings
);

/**
 * GET /api/nba/advanced-stats/league-leaders
 * Get league leaders in advanced statistics
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} stat - Advanced stat category
 * @query {number} limit - Number of leaders to return (max 50)
 * @query {string} position - Filter by position
 * @query {number} minGames - Minimum games played
 */
router.get('/league-leaders', 
    authenticate,
    rateLimiter.free,
    [
        query('stat').optional().isIn(['PER', 'TS%', 'eFG%', 'BPM', 'VORP', 'WS', 'USG%']).withMessage('Invalid advanced stat'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50'),
        query('position').optional().isIn(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F']).withMessage('Invalid position'),
        query('minGames').optional().isInt({ min: 1, max: 82 }).withMessage('Min games must be between 1-82')
    ],
    validateRequest,
    advancedStatsController.getLeagueLeaders
);

/**
 * GET /api/nba/advanced-stats/team/:teamId/efficiency
 * Get team efficiency metrics
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} teamId - Team ID or abbreviation
 * @query {string} season - Season year
 * @query {string} split - Data split (home, away, total)
 */
router.get('/team/:teamId/efficiency', 
    authenticate,
    rateLimiter.free,
    [
        param('teamId').notEmpty().withMessage('Team ID is required'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('split').optional().isIn(['home', 'away', 'total']).withMessage('Invalid split type')
    ],
    validateRequest,
    advancedStatsController.getTeamEfficiency
);

/**
 * GET /api/nba/advanced-stats/pace
 * Get league pace statistics
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} team - Filter by team
 * @query {string} season - Season year
 * @query {string} sort - Sort order (asc, desc)
 */
router.get('/pace', 
    authenticate,
    rateLimiter.free,
    [
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('sort').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order')
    ],
    validateRequest,
    advancedStatsController.getPaceStats
);

// =============================================================================
// STANDARD TIER ENDPOINTS (500 requests/hour)
// =============================================================================

/**
 * GET /api/nba/advanced-stats/player/:playerId/efficiency
 * Get player efficiency rating and advanced metrics
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} playerId - Player ID
 * @query {string} season - Season year
 * @query {string} gameType - Game type (regular, playoffs, both)
 * @query {boolean} perGame - Per game averages
 */
router.get('/player/:playerId/efficiency', 
    authenticate,
    rateLimiter.standard,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('gameType').optional().isIn(['regular', 'playoffs', 'both']).withMessage('Invalid game type'),
        query('perGame').optional().isBoolean().withMessage('PerGame must be boolean')
    ],
    validateRequest,
    advancedStatsController.getPlayerEfficiency
);

/**
 * GET /api/nba/advanced-stats/four-factors
 * Get four factors analysis (eFG%, TOV%, ORB%, FT Rate)
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} team - Filter by team
 * @query {string} season - Season year
 * @query {string} opponent - Against specific opponent
 */
router.get('/four-factors', 
    authenticate,
    rateLimiter.standard,
    [
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('opponent').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid opponent abbreviation')
    ],
    validateRequest,
    advancedStatsController.getFourFactors
);

/**
 * GET /api/nba/advanced-stats/shot-quality
 * Get shot quality and shooting efficiency metrics
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} player - Filter by player ID
 * @query {string} team - Filter by team
 * @query {string} zone - Court zone analysis
 * @query {string} situation - Game situation filter
 */
router.get('/shot-quality', 
    authenticate,
    rateLimiter.standard,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('zone').optional().isIn(['paint', 'midrange', 'three', 'all']).withMessage('Invalid court zone'),
        query('situation').optional().isIn(['open', 'contested', 'clutch', 'all']).withMessage('Invalid situation')
    ],
    validateRequest,
    advancedStatsController.getShotQuality
);

/**
 * GET /api/nba/advanced-stats/defensive-impact
 * Get defensive impact metrics and ratings
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} player - Filter by player ID
 * @query {string} team - Filter by team
 * @query {string} metric - Specific defensive metric
 * @query {number} minMinutes - Minimum minutes played
 */
router.get('/defensive-impact', 
    authenticate,
    rateLimiter.standard,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('metric').optional().isIn(['DBPM', 'DWS', 'DRTG', 'STL%', 'BLK%']).withMessage('Invalid defensive metric'),
        query('minMinutes').optional().isInt({ min: 100, max: 3000 }).withMessage('Min minutes must be between 100-3000')
    ],
    validateRequest,
    advancedStatsController.getDefensiveImpact
);

/**
 * GET /api/nba/advanced-stats/clutch-performance
 * Get clutch time performance metrics
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} player - Filter by player ID
 * @query {string} team - Filter by team
 * @query {string} definition - Clutch time definition
 * @query {string} season - Season year
 */
router.get('/clutch-performance', 
    authenticate,
    rateLimiter.standard,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('definition').optional().isIn(['last5min', 'last2min', 'last30sec']).withMessage('Invalid clutch definition'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format')
    ],
    validateRequest,
    advancedStatsController.getClutchPerformance
);

/**
 * GET /api/nba/advanced-stats/usage-rates
 * Get usage rate and possession-based metrics
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} team - Filter by team
 * @query {string} position - Filter by position
 * @query {number} minUSG - Minimum usage rate
 * @query {string} sort - Sort by metric
 */
router.get('/usage-rates', 
    authenticate,
    rateLimiter.standard,
    [
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('position').optional().isIn(['PG', 'SG', 'SF', 'PF', 'C']).withMessage('Invalid position'),
        query('minUSG').optional().isFloat({ min: 10, max: 40 }).withMessage('Min usage rate must be between 10-40'),
        query('sort').optional().isIn(['USG%', 'AST%', 'TOV%', 'ORB%', 'DRB%']).withMessage('Invalid sort metric')
    ],
    validateRequest,
    advancedStatsController.getUsageRates
);

// =============================================================================
// PREMIUM TIER ENDPOINTS (2000 requests/hour)
// =============================================================================

/**
 * GET /api/nba/advanced-stats/player-impact
 * Get comprehensive player impact metrics using machine learning
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} player - Player ID (required)
 * @query {string} metrics - Specific impact metrics to include
 * @query {string} context - Game context analysis
 * @query {boolean} onOff - Include on/off court analysis
 */
router.get('/player-impact', 
    authenticate,
    rateLimiter.premium,
    [
        query('player').notEmpty().withMessage('Player ID is required'),
        query('metrics').optional().isString().withMessage('Metrics must be comma-separated string'),
        query('context').optional().isIn(['team', 'lineups', 'matchups', 'all']).withMessage('Invalid context'),
        query('onOff').optional().isBoolean().withMessage('OnOff must be boolean')
    ],
    validateRequest,
    advancedStatsController.getPlayerImpact
);

/**
 * GET /api/nba/advanced-stats/lineup-analytics
 * Get advanced lineup analytics and combinations
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} team - Team abbreviation (required)
 * @query {number} minMinutes - Minimum minutes played together
 * @query {string} metric - Primary metric for analysis
 * @query {number} size - Lineup size (3, 4, 5 players)
 */
router.get('/lineup-analytics', 
    authenticate,
    rateLimiter.premium,
    [
        query('team').notEmpty().withMessage('Team is required').isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('minMinutes').optional().isInt({ min: 10, max: 500 }).withMessage('Min minutes must be between 10-500'),
        query('metric').optional().isIn(['NetRtg', 'OffRtg', 'DefRtg', 'Pace', 'PIE']).withMessage('Invalid metric'),
        query('size').optional().isInt({ min: 3, max: 5 }).withMessage('Lineup size must be 3, 4, or 5')
    ],
    validateRequest,
    advancedStatsController.getLineupAnalytics
);

/**
 * GET /api/nba/advanced-stats/matchup-analysis
 * Get detailed matchup analysis and advantages
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} team1 - First team abbreviation
 * @query {string} team2 - Second team abbreviation
 * @query {string} focus - Analysis focus area
 * @query {boolean} historical - Include historical matchups
 */
router.get('/matchup-analysis', 
    authenticate,
    rateLimiter.premium,
    [
        query('team1').notEmpty().withMessage('Team1 is required').isLength({ min: 2, max: 4 }).withMessage('Invalid team1 abbreviation'),
        query('team2').notEmpty().withMessage('Team2 is required').isLength({ min: 2, max: 4 }).withMessage('Invalid team2 abbreviation'),
        query('focus').optional().isIn(['offense', 'defense', 'pace', 'rebounding', 'turnovers']).withMessage('Invalid focus area'),
        query('historical').optional().isBoolean().withMessage('Historical must be boolean')
    ],
    validateRequest,
    advancedStatsController.getMatchupAnalysis
);

/**
 * GET /api/nba/advanced-stats/predictive-metrics
 * Get predictive analytics and future performance indicators
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} entity - Entity to analyze (player, team)
 * @query {string} entityId - Entity ID
 * @query {string} prediction - Prediction type
 * @query {number} games - Number of games to predict
 */
router.get('/predictive-metrics', 
    authenticate,
    rateLimiter.premium,
    [
        query('entity').notEmpty().withMessage('Entity is required').isIn(['player', 'team']).withMessage('Entity must be player or team'),
        query('entityId').notEmpty().withMessage('Entity ID is required'),
        query('prediction').optional().isIn(['performance', 'injury', 'efficiency', 'impact']).withMessage('Invalid prediction type'),
        query('games').optional().isInt({ min: 1, max: 20 }).withMessage('Games must be between 1-20')
    ],
    validateRequest,
    advancedStatsController.getPredictiveMetrics
);

/**
 * GET /api/nba/advanced-stats/win-probability
 * Get win probability models and game impact analysis
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} gameId - Game ID for live analysis
 * @query {string} situation - Game situation
 * @query {boolean} live - Live updating probabilities
 * @query {string} model - Probability model type
 */
router.get('/win-probability', 
    authenticate,
    rateLimiter.premium,
    [
        query('gameId').optional().isString().withMessage('Invalid game ID'),
        query('situation').optional().isIn(['current', 'clutch', 'overtime', 'final']).withMessage('Invalid situation'),
        query('live').optional().isBoolean().withMessage('Live must be boolean'),
        query('model').optional().isIn(['basic', 'advanced', 'ml']).withMessage('Invalid model type')
    ],
    validateRequest,
    advancedStatsController.getWinProbability
);

/**
 * GET /api/nba/advanced-stats/similarity-scores
 * Get player/team similarity analysis using machine learning
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} entity - Entity type (player, team)
 * @query {string} entityId - Entity ID to find similarities for
 * @query {string} era - Era for comparison (current, historical, all)
 * @query {number} limit - Number of similar entities to return
 */
router.get('/similarity-scores', 
    authenticate,
    rateLimiter.premium,
    [
        query('entity').notEmpty().withMessage('Entity is required').isIn(['player', 'team']).withMessage('Entity must be player or team'),
        query('entityId').notEmpty().withMessage('Entity ID is required'),
        query('era').optional().isIn(['current', 'historical', 'all']).withMessage('Invalid era'),
        query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1-20')
    ],
    validateRequest,
    advancedStatsController.getSimilarityScores
);

/**
 * GET /api/nba/advanced-stats/value-metrics
 * Get comprehensive value metrics (WAR, BPM, RAPTOR, etc.)
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} player - Player ID
 * @query {string} team - Team abbreviation
 * @query {string} metrics - Specific value metrics
 * @query {string} timeframe - Analysis timeframe
 */
router.get('/value-metrics', 
    authenticate,
    rateLimiter.premium,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('metrics').optional().isString().withMessage('Metrics must be comma-separated string'),
        query('timeframe').optional().isIn(['season', 'career', 'recent', 'peak']).withMessage('Invalid timeframe')
    ],
    validateRequest,
    advancedStatsController.getValueMetrics
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
            message: `Advanced Stats API endpoint ${req.originalUrl} not found`,
            availableEndpoints: [
                'GET /api/nba/advanced-stats/team-ratings - Get team efficiency ratings',
                'GET /api/nba/advanced-stats/league-leaders - Get league leaders',
                'GET /api/nba/advanced-stats/team/:teamId/efficiency - Get team efficiency',
                'GET /api/nba/advanced-stats/pace - Get pace statistics',
                'GET /api/nba/advanced-stats/player/:playerId/efficiency - Get player efficiency (Standard)',
                'GET /api/nba/advanced-stats/four-factors - Get four factors analysis (Standard)',
                'GET /api/nba/advanced-stats/shot-quality - Get shot quality metrics (Standard)',
                'GET /api/nba/advanced-stats/defensive-impact - Get defensive impact (Standard)',
                'GET /api/nba/advanced-stats/clutch-performance - Get clutch performance (Standard)',
                'GET /api/nba/advanced-stats/usage-rates - Get usage rates (Standard)',
                'GET /api/nba/advanced-stats/player-impact - Get player impact (Premium)',
                'GET /api/nba/advanced-stats/lineup-analytics - Get lineup analytics (Premium)',
                'GET /api/nba/advanced-stats/matchup-analysis - Get matchup analysis (Premium)',
                'GET /api/nba/advanced-stats/predictive-metrics - Get predictive metrics (Premium)',
                'GET /api/nba/advanced-stats/win-probability - Get win probability (Premium)',
                'GET /api/nba/advanced-stats/similarity-scores - Get similarity analysis (Premium)',
                'GET /api/nba/advanced-stats/value-metrics - Get value metrics (Premium)'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
