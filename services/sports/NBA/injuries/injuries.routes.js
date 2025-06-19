const express = require('express');
const router = express.Router();
const injuriesController = require('./injuries.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { rateLimiter } = require('../../../../middleware/rateLimiter.middleware');
const { validateRequest } = require('../../../../middleware/validation.middleware');
const { body, param, query } = require('express-validator');

// =============================================================================
// NBA INJURY REPORTS API ROUTES - FINAL API (11/11)
// =============================================================================
// This file defines all NBA Injury Reports API endpoints with tier-based access
// FREE TIER: Current injuries, team reports, basic status (100 req/hour)
// STANDARD TIER: Historical data, return timelines, impact analysis (500 req/hour)
// PREMIUM TIER: Predictive analytics, risk assessment, recovery tracking (2000 req/hour)
// =============================================================================

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'NBA Injury Reports API',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        note: 'FINAL API - 11 of 11 NBA APIs Complete! 🏆'
    });
});

// =============================================================================
// FREE TIER ENDPOINTS (100 requests/hour)
// =============================================================================

/**
 * GET /api/nba/injuries
 * Get current NBA injury reports
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} status - Injury status (active, recovering, questionable)
 * @query {string} severity - Injury severity (minor, moderate, major)
 * @query {string} team - Filter by team abbreviation
 * @query {number} limit - Number of reports (max 50)
 */
router.get('/', 
    authenticate,
    rateLimiter.free,
    [
        query('status').optional().isIn(['active', 'recovering', 'questionable', 'out', 'day-to-day']).withMessage('Invalid injury status'),
        query('severity').optional().isIn(['minor', 'moderate', 'major', 'season-ending']).withMessage('Invalid severity level'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
    ],
    validateRequest,
    injuriesController.getCurrentInjuries
);

/**
 * GET /api/nba/injuries/team/:teamId
 * Get injury report for specific team
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} teamId - Team ID or abbreviation
 * @query {string} status - Filter by injury status
 * @query {boolean} impact - Include impact on team performance
 */
router.get('/team/:teamId', 
    authenticate,
    rateLimiter.free,
    [
        param('teamId').notEmpty().withMessage('Team ID is required'),
        query('status').optional().isIn(['active', 'recovering', 'questionable', 'all']).withMessage('Invalid status'),
        query('impact').optional().isBoolean().withMessage('Impact must be boolean')
    ],
    validateRequest,
    injuriesController.getTeamInjuries
);

/**
 * GET /api/nba/injuries/player/:playerId
 * Get injury history for specific player
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} playerId - Player ID
 * @query {string} status - Current injury status
 * @query {boolean} history - Include injury history
 */
router.get('/player/:playerId', 
    authenticate,
    rateLimiter.free,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('status').optional().isIn(['healthy', 'injured', 'recovering', 'questionable']).withMessage('Invalid status'),
        query('history').optional().isBoolean().withMessage('History must be boolean')
    ],
    validateRequest,
    injuriesController.getPlayerInjuries
);

/**
 * GET /api/nba/injuries/daily-report
 * Get daily injury report summary
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} date - Specific date (YYYY-MM-DD, defaults to today)
 * @query {string} format - Report format (summary, detailed)
 */
router.get('/daily-report', 
    authenticate,
    rateLimiter.free,
    [
        query('date').optional().isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
        query('format').optional().isIn(['summary', 'detailed']).withMessage('Invalid report format')
    ],
    validateRequest,
    injuriesController.getDailyReport
);

/**
 * GET /api/nba/injuries/by-position
 * Get injuries grouped by player position
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} position - Filter by position (PG, SG, SF, PF, C)
 * @query {string} severity - Filter by severity
 */
router.get('/by-position', 
    authenticate,
    rateLimiter.free,
    [
        query('position').optional().isIn(['PG', 'SG', 'SF', 'PF', 'C']).withMessage('Invalid position'),
        query('severity').optional().isIn(['minor', 'moderate', 'major', 'season-ending']).withMessage('Invalid severity')
    ],
    validateRequest,
    injuriesController.getInjuriesByPosition
);

// =============================================================================
// STANDARD TIER ENDPOINTS (500 requests/hour)
// =============================================================================

/**
 * GET /api/nba/injuries/historical
 * Get historical injury data and trends
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} season - Season year (required)
 * @query {string} team - Filter by team
 * @query {string} injuryType - Filter by injury type
 * @query {string} timeframe - Time period analysis
 */
router.get('/historical', 
    authenticate,
    rateLimiter.standard,
    [
        query('season').notEmpty().withMessage('Season is required').isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('injuryType').optional().isString().withMessage('Invalid injury type'),
        query('timeframe').optional().isIn(['month', 'quarter', 'season', 'playoffs']).withMessage('Invalid timeframe')
    ],
    validateRequest,
    injuriesController.getHistoricalInjuries
);

/**
 * GET /api/nba/injuries/return-timeline
 * Get expected return timelines for injured players
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} team - Filter by team
 * @query {string} position - Filter by position
 * @query {number} weeks - Timeline window in weeks
 * @query {string} confidence - Confidence level for predictions
 */
router.get('/return-timeline', 
    authenticate,
    rateLimiter.standard,
    [
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('position').optional().isIn(['PG', 'SG', 'SF', 'PF', 'C']).withMessage('Invalid position'),
        query('weeks').optional().isInt({ min: 1, max: 20 }).withMessage('Weeks must be between 1-20'),
        query('confidence').optional().isIn(['high', 'medium', 'low', 'all']).withMessage('Invalid confidence level')
    ],
    validateRequest,
    injuriesController.getReturnTimeline
);

/**
 * GET /api/nba/injuries/impact-analysis
 * Get injury impact on team and player performance
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} entity - Analysis entity (team, player)
 * @query {string} entityId - Entity ID
 * @query {string} metric - Impact metric (wins, stats, efficiency)
 * @query {string} period - Analysis period
 */
router.get('/impact-analysis', 
    authenticate,
    rateLimiter.standard,
    [
        query('entity').optional().isIn(['team', 'player', 'position']).withMessage('Invalid entity type'),
        query('entityId').optional().isString().withMessage('Invalid entity ID'),
        query('metric').optional().isIn(['wins', 'stats', 'efficiency', 'performance', 'all']).withMessage('Invalid impact metric'),
        query('period').optional().isIn(['week', 'month', 'season']).withMessage('Invalid analysis period')
    ],
    validateRequest,
    injuriesController.getImpactAnalysis
);

/**
 * GET /api/nba/injuries/by-type
 * Get injuries categorized by injury type
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} type - Injury type filter
 * @query {string} bodyPart - Body part filter
 * @query {boolean} trending - Show trending injury types
 * @query {string} season - Season filter
 */
router.get('/by-type', 
    authenticate,
    rateLimiter.standard,
    [
        query('type').optional().isString().withMessage('Invalid injury type'),
        query('bodyPart').optional().isIn(['knee', 'ankle', 'shoulder', 'back', 'hamstring', 'foot', 'wrist', 'hip']).withMessage('Invalid body part'),
        query('trending').optional().isBoolean().withMessage('Trending must be boolean'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format')
    ],
    validateRequest,
    injuriesController.getInjuriesByType
);

/**
 * GET /api/nba/injuries/recovery-tracking
 * Track recovery progress for injured players
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} player - Player ID to track
 * @query {string} stage - Recovery stage filter
 * @query {boolean} milestones - Include recovery milestones
 * @query {string} timeframe - Tracking timeframe
 */
router.get('/recovery-tracking', 
    authenticate,
    rateLimiter.standard,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('stage').optional().isIn(['initial', 'treatment', 'rehabilitation', 'conditioning', 'return']).withMessage('Invalid recovery stage'),
        query('milestones').optional().isBoolean().withMessage('Milestones must be boolean'),
        query('timeframe').optional().isIn(['week', 'month', 'full']).withMessage('Invalid timeframe')
    ],
    validateRequest,
    injuriesController.getRecoveryTracking
);

/**
 * GET /api/nba/injuries/statistics
 * Get comprehensive injury statistics and trends
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} metric - Statistical metric
 * @query {string} groupBy - Group statistics by (team, position, type, month)
 * @query {string} season - Season filter
 * @query {boolean} comparison - Include year-over-year comparison
 */
router.get('/statistics', 
    authenticate,
    rateLimiter.standard,
    [
        query('metric').optional().isIn(['frequency', 'duration', 'severity', 'recovery-time']).withMessage('Invalid metric'),
        query('groupBy').optional().isIn(['team', 'position', 'type', 'month', 'age']).withMessage('Invalid groupBy parameter'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('comparison').optional().isBoolean().withMessage('Comparison must be boolean')
    ],
    validateRequest,
    injuriesController.getInjuryStatistics
);

// =============================================================================
// PREMIUM TIER ENDPOINTS (2000 requests/hour)
// =============================================================================

/**
 * GET /api/nba/injuries/risk-assessment
 * Get AI-powered injury risk assessment for players
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} player - Player ID for assessment
 * @query {string} team - Team-wide risk assessment
 * @query {string} factors - Risk factors to analyze
 * @query {string} timeframe - Assessment timeframe
 */
router.get('/risk-assessment', 
    authenticate,
    rateLimiter.premium,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('factors').optional().isString().withMessage('Factors must be comma-separated string'),
        query('timeframe').optional().isIn(['week', 'month', 'season', 'career']).withMessage('Invalid timeframe')
    ],
    validateRequest,
    injuriesController.getRiskAssessment
);

/**
 * GET /api/nba/injuries/predictive-analytics
 * Get predictive injury analytics using machine learning
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} entity - Entity to predict for (player, team, position)
 * @query {string} entityId - Entity ID
 * @query {string} prediction - Prediction type (likelihood, timeline, impact)
 * @query {string} model - ML model type (basic, advanced, ensemble)
 */
router.get('/predictive-analytics', 
    authenticate,
    rateLimiter.premium,
    [
        query('entity').optional().isIn(['player', 'team', 'position', 'league']).withMessage('Invalid entity type'),
        query('entityId').optional().isString().withMessage('Invalid entity ID'),
        query('prediction').optional().isIn(['likelihood', 'timeline', 'impact', 'recovery', 'all']).withMessage('Invalid prediction type'),
        query('model').optional().isIn(['basic', 'advanced', 'ensemble', 'deep-learning']).withMessage('Invalid model type')
    ],
    validateRequest,
    injuriesController.getPredictiveAnalytics
);

/**
 * GET /api/nba/injuries/load-management
 * Get load management recommendations and analysis
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} player - Player ID for recommendations
 * @query {string} team - Team-wide load management
 * @query {string} schedule - Schedule analysis (upcoming, back-to-back)
 * @query {boolean} recommendations - Include AI recommendations
 */
router.get('/load-management', 
    authenticate,
    rateLimiter.premium,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('schedule').optional().isIn(['upcoming', 'back-to-back', 'road-trip', 'season']).withMessage('Invalid schedule type'),
        query('recommendations').optional().isBoolean().withMessage('Recommendations must be boolean')
    ],
    validateRequest,
    injuriesController.getLoadManagement
);

/**
 * GET /api/nba/injuries/rehabilitation-plans
 * Get personalized rehabilitation plans and progress tracking
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} player - Player ID (required for personalized plans)
 * @query {string} injuryType - Injury type for generic plans
 * @query {string} phase - Rehabilitation phase
 * @query {boolean} customized - Include customized recommendations
 */
router.get('/rehabilitation-plans', 
    authenticate,
    rateLimiter.premium,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('injuryType').optional().isString().withMessage('Invalid injury type'),
        query('phase').optional().isIn(['acute', 'subacute', 'recovery', 'return-to-play']).withMessage('Invalid rehabilitation phase'),
        query('customized').optional().isBoolean().withMessage('Customized must be boolean')
    ],
    validateRequest,
    injuriesController.getRehabilitationPlans
);

/**
 * GET /api/nba/injuries/prevention-insights
 * Get injury prevention insights and recommendations
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} focus - Prevention focus area
 * @query {string} position - Position-specific insights
 * @query {string} age - Age group analysis
 * @query {boolean} actionable - Include actionable recommendations
 */
router.get('/prevention-insights', 
    authenticate,
    rateLimiter.premium,
    [
        query('focus').optional().isIn(['strength', 'flexibility', 'conditioning', 'nutrition', 'sleep', 'all']).withMessage('Invalid focus area'),
        query('position').optional().isIn(['PG', 'SG', 'SF', 'PF', 'C']).withMessage('Invalid position'),
        query('age').optional().isIn(['rookie', 'young', 'prime', 'veteran']).withMessage('Invalid age group'),
        query('actionable').optional().isBoolean().withMessage('Actionable must be boolean')
    ],
    validateRequest,
    injuriesController.getPreventionInsights
);

/**
 * GET /api/nba/injuries/medical-alerts
 * Get real-time medical alerts and urgent updates
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} severity - Alert severity level
 * @query {string} team - Filter by team
 * @query {number} hours - Hours back to check for alerts
 * @query {string} webhook - Webhook URL for notifications
 */
router.get('/medical-alerts', 
    authenticate,
    rateLimiter.premium,
    [
        query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('hours').optional().isInt({ min: 1, max: 48 }).withMessage('Hours must be between 1-48'),
        query('webhook').optional().isURL().withMessage('Invalid webhook URL')
    ],
    validateRequest,
    injuriesController.getMedicalAlerts
);

/**
 * GET /api/nba/injuries/comparative-analysis
 * Get comparative injury analysis across teams, positions, or eras
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} comparison - Comparison type (teams, positions, eras, seasons)
 * @query {string} entities - Entities to compare (comma-separated)
 * @query {string} metrics - Metrics for comparison
 * @query {boolean} visualizations - Include visualization data
 */
router.get('/comparative-analysis', 
    authenticate,
    rateLimiter.premium,
    [
        query('comparison').optional().isIn(['teams', 'positions', 'eras', 'seasons', 'players']).withMessage('Invalid comparison type'),
        query('entities').optional().isString().withMessage('Entities must be comma-separated string'),
        query('metrics').optional().isString().withMessage('Metrics must be comma-separated string'),
        query('visualizations').optional().isBoolean().withMessage('Visualizations must be boolean')
    ],
    validateRequest,
    injuriesController.getComparativeAnalysis
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
            message: `Injury Reports API endpoint ${req.originalUrl} not found`,
            availableEndpoints: [
                'GET /api/nba/injuries - Get current injury reports',
                'GET /api/nba/injuries/team/:teamId - Get team injuries',
                'GET /api/nba/injuries/player/:playerId - Get player injuries',
                'GET /api/nba/injuries/daily-report - Get daily injury report',
                'GET /api/nba/injuries/by-position - Get injuries by position',
                'GET /api/nba/injuries/historical - Get historical data (Standard)',
                'GET /api/nba/injuries/return-timeline - Get return timelines (Standard)',
                'GET /api/nba/injuries/impact-analysis - Get impact analysis (Standard)',
                'GET /api/nba/injuries/by-type - Get injuries by type (Standard)',
                'GET /api/nba/injuries/recovery-tracking - Get recovery tracking (Standard)',
                'GET /api/nba/injuries/statistics - Get injury statistics (Standard)',
                'GET /api/nba/injuries/risk-assessment - Get risk assessment (Premium)',
                'GET /api/nba/injuries/predictive-analytics - Get predictive analytics (Premium)',
                'GET /api/nba/injuries/load-management - Get load management (Premium)',
                'GET /api/nba/injuries/rehabilitation-plans - Get rehab plans (Premium)',
                'GET /api/nba/injuries/prevention-insights - Get prevention insights (Premium)',
                'GET /api/nba/injuries/medical-alerts - Get medical alerts (Premium)',
                'GET /api/nba/injuries/comparative-analysis - Get comparative analysis (Premium)'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
