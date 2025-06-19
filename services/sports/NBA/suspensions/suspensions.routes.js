const express = require('express');
const router = express.Router();
const suspensionsController = require('./suspensions.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { rateLimiter } = require('../../../../middleware/rateLimiter.middleware');
const { validateRequest } = require('../../../../middleware/validation.middleware');
const { body, param, query } = require('express-validator');

// =============================================================================
// NBA SUSPENSION API ROUTES - BONUS API (12/12)
// =============================================================================
// This file defines all NBA Suspension API endpoints with tier-based access
// FREE TIER: Active suspensions, basic info (100 req/hour)
// STANDARD TIER: Historical data, team impact, appeal tracking (500 req/hour)
// PREMIUM TIER: Predictive analytics, compliance tools, legal insights (2000 req/hour)
// =============================================================================

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'NBA Suspension API',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        note: 'BONUS API - 12 of 12 NBA APIs Complete! Your secret weapon! ⚖️🔥'
    });
});

// =============================================================================
// FREE TIER ENDPOINTS (100 requests/hour)
// =============================================================================

/**
 * GET /api/nba/suspensions
 * Get current active suspensions
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} status - Suspension status (active, pending, completed)
 * @query {string} team - Filter by team abbreviation
 * @query {string} severity - Suspension severity (minor, major, indefinite)
 * @query {number} limit - Number of results (max 50)
 */
router.get('/', 
    authenticate,
    rateLimiter.free,
    [
        query('status').optional().isIn(['active', 'pending', 'completed', 'under-review']).withMessage('Invalid suspension status'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('severity').optional().isIn(['minor', 'major', 'indefinite', 'season-ending']).withMessage('Invalid severity level'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
    ],
    validateRequest,
    suspensionsController.getActiveSuspensions
);

/**
 * GET /api/nba/suspensions/player/:playerId
 * Get suspension history for specific player
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} playerId - Player ID
 * @query {string} status - Filter by status
 * @query {boolean} career - Include full career history
 */
router.get('/player/:playerId', 
    authenticate,
    rateLimiter.free,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('status').optional().isIn(['active', 'completed', 'all']).withMessage('Invalid status'),
        query('career').optional().isBoolean().withMessage('Career must be boolean')
    ],
    validateRequest,
    suspensionsController.getPlayerSuspensions
);

/**
 * GET /api/nba/suspensions/team/:teamId
 * Get team suspension report
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} teamId - Team ID or abbreviation
 * @query {string} season - Season filter
 * @query {boolean} impact - Include team impact analysis
 */
router.get('/team/:teamId', 
    authenticate,
    rateLimiter.free,
    [
        param('teamId').notEmpty().withMessage('Team ID is required'),
        query('season').optional().isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('impact').optional().isBoolean().withMessage('Impact must be boolean')
    ],
    validateRequest,
    suspensionsController.getTeamSuspensions
);

/**
 * GET /api/nba/suspensions/recent
 * Get recent suspension announcements
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {number} days - Days back to search (max 30)
 * @query {string} type - Suspension type filter
 */
router.get('/recent', 
    authenticate,
    rateLimiter.free,
    [
        query('days').optional().isInt({ min: 1, max: 30 }).withMessage('Days must be between 1-30'),
        query('type').optional().isIn(['technical', 'flagrant', 'conduct', 'substance', 'domestic', 'other']).withMessage('Invalid suspension type')
    ],
    validateRequest,
    suspensionsController.getRecentSuspensions
);

/**
 * GET /api/nba/suspensions/summary
 * Get suspension summary and statistics
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} period - Time period (week, month, season)
 * @query {string} groupBy - Group by (team, type, severity)
 */
router.get('/summary', 
    authenticate,
    rateLimiter.free,
    [
        query('period').optional().isIn(['week', 'month', 'season', 'year']).withMessage('Invalid time period'),
        query('groupBy').optional().isIn(['team', 'type', 'severity', 'position']).withMessage('Invalid groupBy parameter')
    ],
    validateRequest,
    suspensionsController.getSuspensionSummary
);

// =============================================================================
// STANDARD TIER ENDPOINTS (500 requests/hour)
// =============================================================================

/**
 * GET /api/nba/suspensions/historical
 * Get historical suspension data and trends
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} season - Season year (required)
 * @query {string} type - Suspension type
 * @query {string} comparison - Year-over-year comparison
 * @query {string} trend - Trend analysis type
 */
router.get('/historical', 
    authenticate,
    rateLimiter.standard,
    [
        query('season').notEmpty().withMessage('Season is required').isLength({ min: 7, max: 7 }).withMessage('Invalid season format'),
        query('type').optional().isString().withMessage('Invalid suspension type'),
        query('comparison').optional().isBoolean().withMessage('Comparison must be boolean'),
        query('trend').optional().isIn(['monthly', 'quarterly', 'seasonal']).withMessage('Invalid trend type')
    ],
    validateRequest,
    suspensionsController.getHistoricalSuspensions
);

/**
 * GET /api/nba/suspensions/appeals
 * Get suspension appeal tracking and outcomes
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} status - Appeal status (pending, upheld, overturned, reduced)
 * @query {string} player - Filter by player
 * @query {boolean} outcomes - Include historical outcomes
 * @query {string} timeline - Appeal timeline tracking
 */
router.get('/appeals', 
    authenticate,
    rateLimiter.standard,
    [
        query('status').optional().isIn(['pending', 'upheld', 'overturned', 'reduced', 'all']).withMessage('Invalid appeal status'),
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('outcomes').optional().isBoolean().withMessage('Outcomes must be boolean'),
        query('timeline').optional().isIn(['filing', 'hearing', 'decision', 'all']).withMessage('Invalid timeline stage')
    ],
    validateRequest,
    suspensionsController.getAppealTracking
);

/**
 * GET /api/nba/suspensions/repeat-offenders
 * Get repeat offender analysis and tracking
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {number} minOffenses - Minimum number of offenses
 * @query {string} timeframe - Timeframe for analysis
 * @query {string} escalation - Escalation pattern analysis
 * @query {boolean} predictions - Include repeat offense predictions
 */
router.get('/repeat-offenders', 
    authenticate,
    rateLimiter.standard,
    [
        query('minOffenses').optional().isInt({ min: 2, max: 10 }).withMessage('Min offenses must be between 2-10'),
        query('timeframe').optional().isIn(['season', 'career', '3years', '5years']).withMessage('Invalid timeframe'),
        query('escalation').optional().isBoolean().withMessage('Escalation must be boolean'),
        query('predictions').optional().isBoolean().withMessage('Predictions must be boolean')
    ],
    validateRequest,
    suspensionsController.getRepeatOffenders
);

/**
 * GET /api/nba/suspensions/team-impact
 * Get comprehensive team impact analysis
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} team - Team to analyze
 * @query {string} metric - Impact metric (wins, performance, chemistry)
 * @query {string} position - Position impact analysis
 * @query {boolean} financial - Include financial impact
 */
router.get('/team-impact', 
    authenticate,
    rateLimiter.standard,
    [
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('metric').optional().isIn(['wins', 'performance', 'chemistry', 'stats', 'all']).withMessage('Invalid impact metric'),
        query('position').optional().isIn(['PG', 'SG', 'SF', 'PF', 'C']).withMessage('Invalid position'),
        query('financial').optional().isBoolean().withMessage('Financial must be boolean')
    ],
    validateRequest,
    suspensionsController.getTeamImpactAnalysis
);

/**
 * GET /api/nba/suspensions/by-violation
 * Get suspensions categorized by violation type
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} category - Violation category
 * @query {string} severity - Severity analysis
 * @query {boolean} trends - Include violation trends
 * @query {string} comparison - Compare across seasons
 */
router.get('/by-violation', 
    authenticate,
    rateLimiter.standard,
    [
        query('category').optional().isIn(['technical', 'flagrant', 'conduct', 'substance', 'domestic', 'gambling', 'other']).withMessage('Invalid violation category'),
        query('severity').optional().isIn(['level1', 'level2', 'escalated', 'all']).withMessage('Invalid severity level'),
        query('trends').optional().isBoolean().withMessage('Trends must be boolean'),
        query('comparison').optional().isIn(['season', 'career', 'league']).withMessage('Invalid comparison type')
    ],
    validateRequest,
    suspensionsController.getSuspensionsByViolation
);

/**
 * GET /api/nba/suspensions/reinstatement
 * Get reinstatement tracking and timelines
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} player - Player reinstatement tracking
 * @query {string} status - Reinstatement status
 * @query {boolean} conditions - Include reinstatement conditions
 * @query {string} timeline - Timeline analysis
 */
router.get('/reinstatement', 
    authenticate,
    rateLimiter.standard,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('status').optional().isIn(['eligible', 'pending', 'conditional', 'denied']).withMessage('Invalid reinstatement status'),
        query('conditions').optional().isBoolean().withMessage('Conditions must be boolean'),
        query('timeline').optional().isIn(['immediate', 'conditional', 'indefinite']).withMessage('Invalid timeline type')
    ],
    validateRequest,
    suspensionsController.getReinstatementTracking
);

// =============================================================================
// PREMIUM TIER ENDPOINTS (2000 requests/hour)
// =============================================================================

/**
 * GET /api/nba/suspensions/risk-assessment
 * Get AI-powered suspension risk assessment
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} player - Player ID for risk assessment
 * @query {string} team - Team-wide risk analysis
 * @query {string} factors - Risk factors to analyze
 * @query {string} model - Prediction model type
 */
router.get('/risk-assessment', 
    authenticate,
    rateLimiter.premium,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('factors').optional().isString().withMessage('Factors must be comma-separated string'),
        query('model').optional().isIn(['behavioral', 'statistical', 'hybrid', 'deep-learning']).withMessage('Invalid model type')
    ],
    validateRequest,
    suspensionsController.getSuspensionRiskAssessment
);

/**
 * GET /api/nba/suspensions/predictive-analytics
 * Get predictive suspension analytics using machine learning
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} entity - Entity to predict for (player, team, league)
 * @query {string} entityId - Entity ID
 * @query {string} prediction - Prediction type (likelihood, severity, timing)
 * @query {number} horizon - Prediction horizon in months
 */
router.get('/predictive-analytics', 
    authenticate,
    rateLimiter.premium,
    [
        query('entity').optional().isIn(['player', 'team', 'league', 'position']).withMessage('Invalid entity type'),
        query('entityId').optional().isString().withMessage('Invalid entity ID'),
        query('prediction').optional().isIn(['likelihood', 'severity', 'timing', 'type', 'all']).withMessage('Invalid prediction type'),
        query('horizon').optional().isInt({ min: 1, max: 12 }).withMessage('Horizon must be between 1-12 months')
    ],
    validateRequest,
    suspensionsController.getPredictiveAnalytics
);

/**
 * GET /api/nba/suspensions/compliance-dashboard
 * Get comprehensive compliance dashboard for organizations
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} organization - Organization type (team, league, media)
 * @query {string} alerts - Alert configuration
 * @query {boolean} realtime - Real-time monitoring
 * @query {string} reporting - Reporting configuration
 */
router.get('/compliance-dashboard', 
    authenticate,
    rateLimiter.premium,
    [
        query('organization').optional().isIn(['team', 'league', 'media', 'fantasy', 'betting']).withMessage('Invalid organization type'),
        query('alerts').optional().isString().withMessage('Alerts must be comma-separated string'),
        query('realtime').optional().isBoolean().withMessage('Realtime must be boolean'),
        query('reporting').optional().isIn(['daily', 'weekly', 'monthly', 'custom']).withMessage('Invalid reporting frequency')
    ],
    validateRequest,
    suspensionsController.getComplianceDashboard
);

/**
 * GET /api/nba/suspensions/legal-precedents
 * Get legal precedent analysis and case comparisons
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} caseType - Type of case to analyze
 * @query {string} outcome - Historical outcome analysis
 * @query {boolean} similarity - Include similar cases
 * @query {string} jurisdiction - Legal jurisdiction analysis
 */
router.get('/legal-precedents', 
    authenticate,
    rateLimiter.premium,
    [
        query('caseType').optional().isIn(['conduct', 'substance', 'domestic', 'gambling', 'performance']).withMessage('Invalid case type'),
        query('outcome').optional().isIn(['upheld', 'reduced', 'overturned', 'settled']).withMessage('Invalid outcome type'),
        query('similarity').optional().isBoolean().withMessage('Similarity must be boolean'),
        query('jurisdiction').optional().isIn(['nba', 'federal', 'state', 'international']).withMessage('Invalid jurisdiction')
    ],
    validateRequest,
    suspensionsController.getLegalPrecedents
);

/**
 * GET /api/nba/suspensions/fantasy-impact
 * Get fantasy sports impact analysis and recommendations
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} player - Player impact analysis
 * @query {string} platform - Fantasy platform (draftkings, fanduel, yahoo)
 * @query {boolean} alternatives - Include alternative players
 * @query {string} timeline - Impact timeline analysis
 */
router.get('/fantasy-impact', 
    authenticate,
    rateLimiter.premium,
    [
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('platform').optional().isIn(['draftkings', 'fanduel', 'yahoo', 'espn', 'all']).withMessage('Invalid fantasy platform'),
        query('alternatives').optional().isBoolean().withMessage('Alternatives must be boolean'),
        query('timeline').optional().isIn(['immediate', 'short-term', 'long-term']).withMessage('Invalid timeline')
    ],
    validateRequest,
    suspensionsController.getFantasyImpact
);

/**
 * GET /api/nba/suspensions/betting-implications
 * Get betting market implications and line movements
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} market - Betting market type
 * @query {string} player - Player-specific implications
 * @query {boolean} lineMovement - Include line movement analysis
 * @query {string} books - Sportsbook analysis
 */
router.get('/betting-implications', 
    authenticate,
    rateLimiter.premium,
    [
        query('market').optional().isIn(['spread', 'total', 'props', 'futures', 'all']).withMessage('Invalid betting market'),
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('lineMovement').optional().isBoolean().withMessage('LineMovement must be boolean'),
        query('books').optional().isString().withMessage('Books must be comma-separated string')
    ],
    validateRequest,
    suspensionsController.getBettingImplications
);

/**
 * GET /api/nba/suspensions/media-sentiment
 * Get media sentiment analysis around suspensions
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} suspension - Specific suspension case
 * @query {string} entity - Entity sentiment analysis
 * @query {string} sources - Media sources to analyze
 * @query {boolean} trending - Include trending sentiment
 */
router.get('/media-sentiment', 
    authenticate,
    rateLimiter.premium,
    [
        query('suspension').optional().isString().withMessage('Invalid suspension ID'),
        query('entity').optional().isIn(['player', 'team', 'league', 'officials']).withMessage('Invalid entity type'),
        query('sources').optional().isString().withMessage('Sources must be comma-separated string'),
        query('trending').optional().isBoolean().withMessage('Trending must be boolean')
    ],
    validateRequest,
    suspensionsController.getMediaSentiment
);

/**
 * GET /api/nba/suspensions/alerts-config
 * Configure and manage suspension alerts and notifications
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} alertType - Type of alert to configure
 * @query {string} delivery - Delivery method (webhook, email, sms)
 * @query {string} filters - Alert filters
 * @query {boolean} realtime - Real-time alert configuration
 */
router.get('/alerts-config', 
    authenticate,
    rateLimiter.premium,
    [
        query('alertType').optional().isIn(['breaking', 'appeal', 'reinstatement', 'risk', 'all']).withMessage('Invalid alert type'),
        query('delivery').optional().isIn(['webhook', 'email', 'sms', 'push']).withMessage('Invalid delivery method'),
        query('filters').optional().isString().withMessage('Filters must be JSON string'),
        query('realtime').optional().isBoolean().withMessage('Realtime must be boolean')
    ],
    validateRequest,
    suspensionsController.getAlertsConfiguration
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
            message: `Suspension API endpoint ${req.originalUrl} not found`,
            availableEndpoints: [
                'GET /api/nba/suspensions - Get active suspensions',
                'GET /api/nba/suspensions/player/:playerId - Get player suspensions',
                'GET /api/nba/suspensions/team/:teamId - Get team suspensions',
                'GET /api/nba/suspensions/recent - Get recent suspensions',
                'GET /api/nba/suspensions/summary - Get suspension summary',
                'GET /api/nba/suspensions/historical - Get historical data (Standard)',
                'GET /api/nba/suspensions/appeals - Get appeal tracking (Standard)',
                'GET /api/nba/suspensions/repeat-offenders - Get repeat offenders (Standard)',
                'GET /api/nba/suspensions/team-impact - Get team impact (Standard)',
                'GET /api/nba/suspensions/by-violation - Get by violation type (Standard)',
                'GET /api/nba/suspensions/reinstatement - Get reinstatement tracking (Standard)',
                'GET /api/nba/suspensions/risk-assessment - Get risk assessment (Premium)',
                'GET /api/nba/suspensions/predictive-analytics - Get predictive analytics (Premium)',
                'GET /api/nba/suspensions/compliance-dashboard - Get compliance tools (Premium)',
                'GET /api/nba/suspensions/legal-precedents - Get legal analysis (Premium)',
                'GET /api/nba/suspensions/fantasy-impact - Get fantasy impact (Premium)',
                'GET /api/nba/suspensions/betting-implications - Get betting analysis (Premium)',
                'GET /api/nba/suspensions/media-sentiment - Get media sentiment (Premium)',
                'GET /api/nba/suspensions/alerts-config - Configure alerts (Premium)'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
