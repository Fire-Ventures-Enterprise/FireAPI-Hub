const express = require('express');
const router = express.Router();
const newsController = require('./news.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { rateLimiter } = require('../../../../middleware/rateLimiter.middleware');
const { validateRequest } = require('../../../../middleware/validation.middleware');
const { body, param, query } = require('express-validator');

// =============================================================================
// NBA NEWS API ROUTES
// =============================================================================
// This file defines all NBA News API endpoints with tier-based access control
// FREE TIER: Latest news, team news, basic articles (100 req/hour)
// STANDARD TIER: Player news, filtered content, search (500 req/hour)
// PREMIUM TIER: Breaking news alerts, sentiment analysis, insider reports (2000 req/hour)
// =============================================================================

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'NBA News API',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// =============================================================================
// FREE TIER ENDPOINTS (100 requests/hour)
// =============================================================================

/**
 * GET /api/nba/news
 * Get latest NBA news articles
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {number} limit - Number of articles (max 50)
 * @query {string} category - News category filter
 * @query {string} source - News source filter
 * @query {string} language - Language preference
 */
router.get('/', 
    authenticate,
    rateLimiter.free,
    [
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50'),
        query('category').optional().isIn(['general', 'trades', 'injuries', 'playoffs', 'draft', 'free-agency']).withMessage('Invalid news category'),
        query('source').optional().isString().withMessage('Invalid news source'),
        query('language').optional().isIn(['en', 'es', 'fr']).withMessage('Unsupported language')
    ],
    validateRequest,
    newsController.getLatestNews
);

/**
 * GET /api/nba/news/team/:teamId
 * Get news articles for specific team
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} teamId - Team ID or abbreviation
 * @query {number} limit - Number of articles
 * @query {string} timeframe - Time period (today, week, month)
 */
router.get('/team/:teamId', 
    authenticate,
    rateLimiter.free,
    [
        param('teamId').notEmpty().withMessage('Team ID is required'),
        query('limit').optional().isInt({ min: 1, max: 30 }).withMessage('Limit must be between 1-30'),
        query('timeframe').optional().isIn(['today', 'week', 'month', 'season']).withMessage('Invalid timeframe')
    ],
    validateRequest,
    newsController.getTeamNews
);

/**
 * GET /api/nba/news/headlines
 * Get top NBA headlines
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} priority - Priority level (breaking, high, normal)
 * @query {number} hours - Hours back to search (max 48)
 */
router.get('/headlines', 
    authenticate,
    rateLimiter.free,
    [
        query('priority').optional().isIn(['breaking', 'high', 'normal', 'all']).withMessage('Invalid priority level'),
        query('hours').optional().isInt({ min: 1, max: 48 }).withMessage('Hours must be between 1-48')
    ],
    validateRequest,
    newsController.getHeadlines
);

/**
 * GET /api/nba/news/article/:articleId
 * Get specific news article details
 * Tier: FREE
 * Rate limit: 100/hour
 * @param {string} articleId - News article ID
 * @query {boolean} fullText - Include full article text
 */
router.get('/article/:articleId', 
    authenticate,
    rateLimiter.free,
    [
        param('articleId').notEmpty().withMessage('Article ID is required'),
        query('fullText').optional().isBoolean().withMessage('FullText must be boolean')
    ],
    validateRequest,
    newsController.getArticleById
);

/**
 * GET /api/nba/news/categories
 * Get available news categories and their counts
 * Tier: FREE
 * Rate limit: 100/hour
 * @query {string} timeframe - Time period for counts
 */
router.get('/categories', 
    authenticate,
    rateLimiter.free,
    [
        query('timeframe').optional().isIn(['today', 'week', 'month']).withMessage('Invalid timeframe')
    ],
    validateRequest,
    newsController.getNewsCategories
);

// =============================================================================
// STANDARD TIER ENDPOINTS (500 requests/hour)
// =============================================================================

/**
 * GET /api/nba/news/player/:playerId
 * Get news articles for specific player
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @param {string} playerId - Player ID
 * @query {number} limit - Number of articles
 * @query {string} type - News type (trades, injuries, performance, personal)
 * @query {string} timeframe - Time period
 */
router.get('/player/:playerId', 
    authenticate,
    rateLimiter.standard,
    [
        param('playerId').notEmpty().withMessage('Player ID is required'),
        query('limit').optional().isInt({ min: 1, max: 30 }).withMessage('Limit must be between 1-30'),
        query('type').optional().isIn(['trades', 'injuries', 'performance', 'personal', 'all']).withMessage('Invalid news type'),
        query('timeframe').optional().isIn(['today', 'week', 'month', 'season']).withMessage('Invalid timeframe')
    ],
    validateRequest,
    newsController.getPlayerNews
);

/**
 * GET /api/nba/news/search
 * Search NBA news articles
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} q - Search query (required)
 * @query {number} limit - Number of results
 * @query {string} sortBy - Sort criteria (relevance, date, popularity)
 * @query {string} dateFrom - Start date filter
 * @query {string} dateTo - End date filter
 */
router.get('/search', 
    authenticate,
    rateLimiter.standard,
    [
        query('q').notEmpty().withMessage('Search query is required').isLength({ min: 2, max: 100 }).withMessage('Query must be 2-100 characters'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50'),
        query('sortBy').optional().isIn(['relevance', 'date', 'popularity']).withMessage('Invalid sort criteria'),
        query('dateFrom').optional().isISO8601().withMessage('Invalid dateFrom format'),
        query('dateTo').optional().isISO8601().withMessage('Invalid dateTo format')
    ],
    validateRequest,
    newsController.searchNews
);

/**
 * GET /api/nba/news/trades
 * Get trade-related news and rumors
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} status - Trade status (rumor, confirmed, completed)
 * @query {string} team - Filter by team involvement
 * @query {string} player - Filter by player involvement
 * @query {number} limit - Number of articles
 */
router.get('/trades', 
    authenticate,
    rateLimiter.standard,
    [
        query('status').optional().isIn(['rumor', 'confirmed', 'completed', 'all']).withMessage('Invalid trade status'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('player').optional().isString().withMessage('Invalid player ID'),
        query('limit').optional().isInt({ min: 1, max: 30 }).withMessage('Limit must be between 1-30')
    ],
    validateRequest,
    newsController.getTradeNews
);

/**
 * GET /api/nba/news/injuries
 * Get injury-related news and reports
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} severity - Injury severity filter
 * @query {string} team - Filter by team
 * @query {string} position - Filter by position
 * @query {boolean} returnDates - Include expected return dates
 */
router.get('/injuries', 
    authenticate,
    rateLimiter.standard,
    [
        query('severity').optional().isIn(['minor', 'moderate', 'major', 'season-ending', 'all']).withMessage('Invalid severity level'),
        query('team').optional().isLength({ min: 2, max: 4 }).withMessage('Invalid team abbreviation'),
        query('position').optional().isIn(['PG', 'SG', 'SF', 'PF', 'C']).withMessage('Invalid position'),
        query('returnDates').optional().isBoolean().withMessage('ReturnDates must be boolean')
    ],
    validateRequest,
    newsController.getInjuryNews
);

/**
 * GET /api/nba/news/trending
 * Get trending NBA news topics
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} period - Trending period (hour, day, week)
 * @query {number} limit - Number of trending topics
 * @query {string} metric - Trending metric (views, shares, comments)
 */
router.get('/trending', 
    authenticate,
    rateLimiter.standard,
    [
        query('period').optional().isIn(['hour', 'day', 'week']).withMessage('Invalid trending period'),
        query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1-20'),
        query('metric').optional().isIn(['views', 'shares', 'comments', 'engagement']).withMessage('Invalid trending metric')
    ],
    validateRequest,
    newsController.getTrendingNews
);

/**
 * GET /api/nba/news/sources
 * Get news sources and their reliability scores
 * Tier: STANDARD
 * Rate limit: 500/hour
 * @query {string} type - Source type (official, media, insider, social)
 * @query {boolean} verified - Only verified sources
 */
router.get('/sources', 
    authenticate,
    rateLimiter.standard,
    [
        query('type').optional().isIn(['official', 'media', 'insider', 'social', 'all']).withMessage('Invalid source type'),
        query('verified').optional().isBoolean().withMessage('Verified must be boolean')
    ],
    validateRequest,
    newsController.getNewsSources
);

// =============================================================================
// PREMIUM TIER ENDPOINTS (2000 requests/hour)
// =============================================================================

/**
 * GET /api/nba/news/breaking
 * Get breaking news with real-time alerts
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {number} minutes - Minutes back to check (max 60)
 * @query {string} priority - Minimum priority level
 * @query {boolean} alerts - Include alert metadata
 * @query {string} webhook - Webhook URL for notifications
 */
router.get('/breaking', 
    authenticate,
    rateLimiter.premium,
    [
        query('minutes').optional().isInt({ min: 1, max: 60 }).withMessage('Minutes must be between 1-60'),
        query('priority').optional().isIn(['high', 'critical', 'all']).withMessage('Invalid priority level'),
        query('alerts').optional().isBoolean().withMessage('Alerts must be boolean'),
        query('webhook').optional().isURL().withMessage('Invalid webhook URL')
    ],
    validateRequest,
    newsController.getBreakingNews
);

/**
 * GET /api/nba/news/sentiment
 * Get sentiment analysis of NBA news
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} entity - Entity to analyze (team, player, league)
 * @query {string} entityId - Entity ID
 * @query {string} timeframe - Analysis timeframe
 * @query {string} sources - Source types to include
 */
router.get('/sentiment', 
    authenticate,
    rateLimiter.premium,
    [
        query('entity').optional().isIn(['team', 'player', 'league', 'trade', 'draft']).withMessage('Invalid entity type'),
        query('entityId').optional().isString().withMessage('Invalid entity ID'),
        query('timeframe').optional().isIn(['day', 'week', 'month', 'season']).withMessage('Invalid timeframe'),
        query('sources').optional().isString().withMessage('Sources must be comma-separated string')
    ],
    validateRequest,
    newsController.getSentimentAnalysis
);

/**
 * GET /api/nba/news/insider
 * Get insider reports and exclusive content
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} reporter - Filter by reporter/insider
 * @query {string} reliability - Minimum reliability score
 * @query {string} category - Insider content category
 * @query {boolean} verified - Only verified insider reports
 */
router.get('/insider', 
    authenticate,
    rateLimiter.premium,
    [
        query('reporter').optional().isString().withMessage('Invalid reporter name'),
        query('reliability').optional().isIn(['high', 'medium', 'low', 'all']).withMessage('Invalid reliability level'),
        query('category').optional().isIn(['trades', 'free-agency', 'draft', 'coaching', 'management']).withMessage('Invalid insider category'),
        query('verified').optional().isBoolean().withMessage('Verified must be boolean')
    ],
    validateRequest,
    newsController.getInsiderReports
);

/**
 * GET /api/nba/news/social-buzz
 * Get social media buzz and viral NBA content
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} platform - Social platform (twitter, instagram, tiktok, all)
 * @query {string} metric - Buzz metric (mentions, engagement, reach)
 * @query {string} entity - Entity being discussed
 * @query {number} hours - Hours back to analyze
 */
router.get('/social-buzz', 
    authenticate,
    rateLimiter.premium,
    [
        query('platform').optional().isIn(['twitter', 'instagram', 'tiktok', 'reddit', 'all']).withMessage('Invalid platform'),
        query('metric').optional().isIn(['mentions', 'engagement', 'reach', 'sentiment']).withMessage('Invalid buzz metric'),
        query('entity').optional().isString().withMessage('Invalid entity'),
        query('hours').optional().isInt({ min: 1, max: 24 }).withMessage('Hours must be between 1-24')
    ],
    validateRequest,
    newsController.getSocialBuzz
);

/**
 * GET /api/nba/news/predictions
 * Get AI-powered news predictions and trend forecasting
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} type - Prediction type (trade, signing, coaching, draft)
 * @query {string} confidence - Minimum confidence level
 * @query {string} timeframe - Prediction timeframe
 * @query {boolean} reasoning - Include AI reasoning
 */
router.get('/predictions', 
    authenticate,
    rateLimiter.premium,
    [
        query('type').optional().isIn(['trade', 'signing', 'coaching', 'draft', 'injury', 'all']).withMessage('Invalid prediction type'),
        query('confidence').optional().isIn(['high', 'medium', 'low', 'all']).withMessage('Invalid confidence level'),
        query('timeframe').optional().isIn(['week', 'month', 'season', 'offseason']).withMessage('Invalid timeframe'),
        query('reasoning').optional().isBoolean().withMessage('Reasoning must be boolean')
    ],
    validateRequest,
    newsController.getNewsPredictions
);

/**
 * GET /api/nba/news/analytics
 * Get comprehensive news analytics and insights
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} metric - Analytics metric (volume, sentiment, reach, impact)
 * @query {string} entity - Entity to analyze
 * @query {string} comparison - Comparison timeframe
 * @query {boolean} breakdown - Include detailed breakdown
 */
router.get('/analytics', 
    authenticate,
    rateLimiter.premium,
    [
        query('metric').optional().isIn(['volume', 'sentiment', 'reach', 'impact', 'engagement']).withMessage('Invalid analytics metric'),
        query('entity').optional().isString().withMessage('Invalid entity'),
        query('comparison').optional().isIn(['week', 'month', 'season', 'year']).withMessage('Invalid comparison period'),
        query('breakdown').optional().isBoolean().withMessage('Breakdown must be boolean')
    ],
    validateRequest,
    newsController.getNewsAnalytics
);

/**
 * GET /api/nba/news/personalized
 * Get personalized news feed based on user preferences
 * Tier: PREMIUM
 * Rate limit: 2000/hour
 * @query {string} interests - User interests (comma-separated)
 * @query {string} teams - Favorite teams
 * @query {string} players - Favorite players
 * @query {number} limit - Number of articles
 */
router.get('/personalized', 
    authenticate,
    rateLimiter.premium,
    [
        query('interests').optional().isString().withMessage('Interests must be comma-separated string'),
        query('teams').optional().isString().withMessage('Teams must be comma-separated string'),
        query('players').optional().isString().withMessage('Players must be comma-separated string'),
        query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
    ],
    validateRequest,
    newsController.getPersonalizedNews
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
            message: `News API endpoint ${req.originalUrl} not found`,
            availableEndpoints: [
                'GET /api/nba/news - Get latest NBA news',
                'GET /api/nba/news/team/:teamId - Get team news',
                'GET /api/nba/news/headlines - Get top headlines',
                'GET /api/nba/news/article/:articleId - Get article details',
                'GET /api/nba/news/categories - Get news categories',
                'GET /api/nba/news/player/:playerId - Get player news (Standard)',
                'GET /api/nba/news/search - Search news articles (Standard)',
                'GET /api/nba/news/trades - Get trade news (Standard)',
                'GET /api/nba/news/injuries - Get injury news (Standard)',
                'GET /api/nba/news/trending - Get trending topics (Standard)',
                'GET /api/nba/news/sources - Get news sources (Standard)',
                'GET /api/nba/news/breaking - Get breaking news (Premium)',
                'GET /api/nba/news/sentiment - Get sentiment analysis (Premium)',
                'GET /api/nba/news/insider - Get insider reports (Premium)',
                'GET /api/nba/news/social-buzz - Get social media buzz (Premium)',
                'GET /api/nba/news/predictions - Get AI predictions (Premium)',
                'GET /api/nba/news/analytics - Get news analytics (Premium)',
                'GET /api/nba/news/personalized - Get personalized feed (Premium)'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
