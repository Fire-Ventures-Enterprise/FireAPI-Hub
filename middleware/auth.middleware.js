const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// API Key validation middleware
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
        logger.warn('API request without API key', {
            ip: req.ip,
            endpoint: req.path,
            timestamp: new Date().toISOString()
        });
        
        return res.status(401).json({
            error: 'API key required',
            message: 'Please provide a valid API key in headers or query parameters',
            code: 'MISSING_API_KEY'
        });
    }

    // Validate API key format (basic validation)
    if (apiKey.length < 32) {
        logger.warn('Invalid API key format', {
            ip: req.ip,
            endpoint: req.path,
            apiKey: apiKey.substring(0, 8) + '...',
            timestamp: new Date().toISOString()
        });
        
        return res.status(401).json({
            error: 'Invalid API key',
            message: 'API key format is invalid',
            code: 'INVALID_API_KEY_FORMAT'
        });
    }

    // Store API key in request for logging
    req.apiKey = apiKey;
    
    // Log successful API key validation
    logger.info('API key validated', {
        ip: req.ip,
        endpoint: req.path,
        apiKey: apiKey.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
    });

    next();
};

// JWT token validation middleware
const validateJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.headers['x-access-token'];
    
    if (!token) {
        logger.warn('JWT request without token', {
            ip: req.ip,
            endpoint: req.path,
            timestamp: new Date().toISOString()
        });
        
        return res.status(401).json({
            error: 'Access token required',
            message: 'Please provide a valid JWT token',
            code: 'MISSING_JWT_TOKEN'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        
        logger.info('JWT token validated', {
            userId: decoded.id,
            userEmail: decoded.email,
            ip: req.ip,
            endpoint: req.path,
            timestamp: new Date().toISOString()
        });
        
        next();
    } catch (error) {
        logger.error('JWT validation failed', {
            error: error.message,
            ip: req.ip,
            endpoint: req.path,
            timestamp: new Date().toISOString()
        });
        
        return res.status(403).json({
            error: 'Invalid token',
            message: 'JWT token is invalid or expired',
            code: 'INVALID_JWT_TOKEN'
        });
    }
};

// Flexible authentication middleware (API key OR JWT)
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const token = req.headers.authorization?.split(' ')[1] || req.headers['x-access-token'];
    
    if (apiKey) {
        // Use API key authentication
        validateApiKey(req, res, next);
    } else if (token) {
        // Use JWT authentication
        validateJWT(req, res, next);
    } else {
        logger.warn('Authentication attempt without credentials', {
            ip: req.ip,
            endpoint: req.path,
            timestamp: new Date().toISOString()
        });
        
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide either an API key or JWT token',
            code: 'NO_AUTHENTICATION'
        });
    }
};

// Premium tier rate limiting
const premiumRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes for premium
    message: {
        error: 'Rate limit exceeded',
        message: 'Premium tier: 1000 requests per 15 minutes exceeded',
        code: 'PREMIUM_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Standard tier rate limiting
const standardRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes for standard
    message: {
        error: 'Rate limit exceeded',
        message: 'Standard tier: 100 requests per 15 minutes exceeded',
        code: 'STANDARD_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Free tier rate limiting
const freeRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour for free tier
    message: {
        error: 'Rate limit exceeded',
        message: 'Free tier: 10 requests per hour exceeded. Upgrade for more requests.',
        code: 'FREE_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Tier-based rate limiting middleware
const tierRateLimit = (tier = 'free') => {
    switch (tier.toLowerCase()) {
        case 'premium':
            return premiumRateLimit;
        case 'standard':
            return standardRateLimit;
        case 'free':
        default:
            return freeRateLimit;
    }
};

// Request logging middleware
const logRequest = (req, res, next) => {
    const startTime = Date.now();
    
    // Log incoming request
    logger.info('Incoming NBA API request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('NBA API response', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
    });

    next();
};

module.exports = {
    authenticate,
    validateApiKey,
    validateJWT,
    tierRateLimit,
    premiumRateLimit,
    standardRateLimit,
    freeRateLimit,
    logRequest
};
