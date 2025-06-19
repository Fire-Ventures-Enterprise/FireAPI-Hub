const express = require('express');
const router = express.Router();
const weatherController = require('./weather.controller');
const { authenticate, tierRateLimit, logRequest } = require('../../../../middleware/auth.middleware');
const { asyncHandler } = require('../../../../middleware/error-handler.middleware');

// Apply authentication and logging to all routes
router.use(authenticate);
router.use(logRequest);

/**
 * @route   GET /api/sports/nba/weather/game/:gameId
 * @desc    Get weather data for specific NBA game
 * @access  Private (API Key required)
 * @params  gameId - NBA game identifier
 * @returns Weather conditions and impact analysis for the game
 */
router.get('/game/:gameId', 
    tierRateLimit('standard'), 
    asyncHandler(async (req, res) => {
        await weatherController.getGameWeather(req, res);
    })
);

/**
 * @route   GET /api/sports/nba/weather/venue/:venue
 * @desc    Get current weather data for specific NBA venue
 * @access  Private (API Key required)
 * @params  venue - NBA venue name (URL encoded)
 * @query   date - Optional date for historical/forecast data (YYYY-MM-DD)
 * @returns Current weather conditions at the venue
 */
router.get('/venue/:venue', 
    tierRateLimit('standard'), 
    asyncHandler(async (req, res) => {
        await weatherController.getVenueWeather(req, res);
    })
);

/**
 * @route   GET /api/sports/nba/weather/forecast
 * @desc    Get weather forecast for upcoming NBA games
 * @access  Private (API Key required)
 * @query   days - Number of days to forecast (default: 7, max: 14)
 * @returns Weather forecast for upcoming games
 */
router.get('/forecast', 
    tierRateLimit('premium'), 
    asyncHandler(async (req, res) => {
        // Validate days parameter
        const days = parseInt(req.query.days) || 7;
        if (days > 14) {
            return res.status(400).json({
                error: 'Invalid parameter',
                message: 'Forecast days cannot exceed 14',
                code: 'INVALID_FORECAST_DAYS'
            });
        }
        
        req.query.days = days;
        await weatherController.getWeatherForecast(req, res);
    })
);

/**
 * @route   GET /api/sports/nba/weather/venues
 * @desc    Get list of supported NBA venues for weather data
 * @access  Private (API Key required)
 * @returns List of NBA venues with location information
 */
router.get('/venues', 
    tierRateLimit('free'), 
    asyncHandler(async (req, res) => {
        const venues = [
            {
                name: 'Staples Center',
                city: 'Los Angeles',
                state: 'CA',
                team: ['Lakers', 'Clippers'],
                weatherSupport: true
            },
            {
                name: 'Chase Center',
                city: 'San Francisco',
                state: 'CA',
                team: ['Warriors'],
                weatherSupport: true
            },
            {
                name: 'TD Garden',
                city: 'Boston',
                state: 'MA',
                team: ['Celtics'],
                weatherSupport: true
            },
            {
                name: 'Madison Square Garden',
                city: 'New York',
                state: 'NY',
                team: ['Knicks'],
                weatherSupport: true
            },
            {
                name: 'United Center',
                city: 'Chicago',
                state: 'IL',
                team: ['Bulls'],
                weatherSupport: true
            }
        ];

        res.json({
            success: true,
            data: {
                totalVenues: venues.length,
                venues
            },
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * @route   GET /api/sports/nba/weather/impact/:gameId
 * @desc    Get detailed weather impact analysis for specific game
 * @access  Private (Premium API Key required)
 * @params  gameId - NBA game identifier
 * @returns Detailed weather impact analysis and recommendations
 */
router.get('/impact/:gameId', 
    tierRateLimit('premium'), 
    asyncHandler(async (req, res) => {
        const { gameId } = req.params;
        
        // This would typically call a more detailed analysis method
        // For now, we'll use the existing weather controller
        await weatherController.getGameWeather(req, res);
    })
);

/**
 * @route   GET /api/sports/nba/weather/historical/:venue
 * @desc    Get historical weather data for venue
 * @access  Private (Premium API Key required)
 * @params  venue - NBA venue name
 * @query   startDate - Start date (YYYY-MM-DD)
 * @query   endDate - End date (YYYY-MM-DD)
 * @returns Historical weather data for the venue
 */
router.get('/historical/:venue', 
    tierRateLimit('premium'), 
    asyncHandler(async (req, res) => {
        const { venue } = req.params;
        const { startDate, endDate } = req.query;
        
        // Validate date parameters
        if (!startDate || !endDate) {
            return res.status(400).json({
                error: 'Missing parameters',
                message: 'Both startDate and endDate are required',
                code: 'MISSING_DATE_PARAMS'
            });
        }

        // For now, return mock historical data
        // In production, this would query historical weather database
        res.json({
            success: true,
            data: {
                venue,
                period: {
                    startDate,
                    endDate
                },
                historicalData: {
                    averageTemperature: 72,
                    averageHumidity: 45,
                    totalDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)),
                    weatherPatterns: [
                        { date: startDate, temp: 70, humidity: 40, conditions: 'clear' },
                        { date: endDate, temp: 74, humidity: 50, conditions: 'partly_cloudy' }
                    ]
                }
            },
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * @route   GET /api/sports/nba/weather/alerts
 * @desc    Get active weather alerts that might affect NBA games
 * @access  Private (API Key required)
 * @returns Active weather alerts for NBA venues
 */
router.get('/alerts', 
    tierRateLimit('standard'), 
    asyncHandler(async (req, res) => {
        // Mock weather alerts
        // In production, this would check real weather alert services
        const alerts = [
            {
                venue: 'United Center',
                city: 'Chicago',
                alertType: 'winter_storm_warning',
                severity: 'moderate',
                message: 'Winter storm expected, may affect travel to venue',
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                affectedGames: []
            }
        ];

        res.json({
            success: true,
            data: {
                activeAlerts: alerts.length,
                alerts
            },
            timestamp: new Date().toISOString()
        });
    })
);

/**
 * @route   GET /api/sports/nba/weather/health
 * @desc    Health check for NBA Weather API
 * @access  Public
 * @returns Service health status
 */
router.get('/health', 
    asyncHandler(async (req, res) => {
        res.json({
            service: 'NBA Weather API',
            status: 'healthy',
            version: '1.0.0',
            endpoints: {
                '/game/:gameId': 'Get game weather',
                '/venue/:venue': 'Get venue weather',
                '/forecast': 'Get weather forecast',
                '/venues': 'List supported venues',
                '/impact/:gameId': 'Get impact analysis',
                '/historical/:venue': 'Get historical data',
                '/alerts': 'Get weather alerts'
            },
            timestamp: new Date().toISOString()
        });
    })
);

module.exports = router;
