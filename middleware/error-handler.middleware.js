const winston = require('winston');

// Configure logger specifically for error handling
const errorLogger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: 'logs/error.log',
            level: 'error'
        })
    ]
});

// Custom error classes
class APIError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
    }
}

class ValidationError extends APIError {
    constructor(message, field = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
        this.field = field;
    }
}

class NotFoundError extends APIError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

class RateLimitError extends APIError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        this.name = 'RateLimitError';
    }
}

class AuthenticationError extends APIError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}

class ExternalAPIError extends APIError {
    constructor(service, message = 'External service unavailable') {
        super(`${service}: ${message}`, 503, 'EXTERNAL_API_ERROR');
        this.name = 'ExternalAPIError';
        this.service = service;
    }
}

// Error handler middleware
const errorHandler = (error, req, res, next) => {
    // Default error values
    let statusCode = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details = null;

    // Log the error with full context
    errorLogger.error('NBA API Error occurred', {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code || 'unknown'
        },
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            params: req.params,
            query: req.query,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        },
        timestamp: new Date().toISOString()
    });

    // Handle different error types
    if (error instanceof APIError) {
        statusCode = error.statusCode;
        message = error.message;
        code = error.code;
        
        if (error instanceof ValidationError) {
            details = { field: error.field };
        } else if (error instanceof ExternalAPIError) {
            details = { service: error.service };
        }
    } else if (error.name === 'ValidationError') {
        // Mongoose validation error
        statusCode = 400;
        message = 'Validation failed';
        code = 'VALIDATION_ERROR';
        details = {
            fields: Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            }))
        };
    } else if (error.name === 'CastError') {
        // MongoDB cast error (invalid ObjectId, etc.)
        statusCode = 400;
        message = 'Invalid data format';
        code = 'CAST_ERROR';
        details = { field: error.path, value: error.value };
    } else if (error.name === 'MongoError' && error.code === 11000) {
        // MongoDB duplicate key error
        statusCode = 409;
        message = 'Resource already exists';
        code = 'DUPLICATE_ERROR';
        details = { field: Object.keys(error.keyValue)[0] };
    } else if (error.code === 'ECONNREFUSED') {
        // External service connection error
        statusCode = 503;
        message = 'External service unavailable';
        code = 'SERVICE_UNAVAILABLE';
    } else if (error.code === 'ENOTFOUND') {
        // DNS resolution error
        statusCode = 503;
        message = 'External service not found';
        code = 'SERVICE_NOT_FOUND';
    } else if (error.name === 'SyntaxError' && error.status === 400) {
        // JSON parsing error
        statusCode = 400;
        message = 'Invalid JSON format';
        code = 'JSON_PARSE_ERROR';
    } else if (error.name === 'TokenExpiredError') {
        // JWT token expired
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
        // JWT token invalid
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    }

    // Prepare error response based on environment
    const errorResponse = {
        error: {
            message,
            code,
            timestamp: new Date().toISOString(),
            requestId: req.id || 'unknown'
        }
    };

    // Add details if available
    if (details) {
        errorResponse.error.details = details;
    }

    // Add stack trace in development environment
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = error.stack;
        errorResponse.error.originalError = error.message;
    }

    // Add helpful suggestions for common errors
    if (statusCode === 401) {
        errorResponse.suggestion = 'Please check your API key or authentication token';
    } else if (statusCode === 404) {
        errorResponse.suggestion = 'Please verify the endpoint URL and parameters';
    } else if (statusCode === 429) {
        errorResponse.suggestion = 'Please wait before making additional requests or upgrade your plan';
    } else if (statusCode === 503) {
        errorResponse.suggestion = 'Please try again later as external services may be temporarily unavailable';
    }

    // Set appropriate headers
    res.set({
        'Content-Type': 'application/json',
        'X-Error-Code': code,
        'X-Request-ID': req.id || 'unknown'
    });

    // Send error response
    res.status(statusCode).json(errorResponse);
};

// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`NBA API endpoint '${req.originalUrl}' not found`);
    next(error);
};

// Process uncaught exceptions
process.on('uncaughtException', (error) => {
    errorLogger.error('UNCAUGHT EXCEPTION - Shutting down...', {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        }
    });
    
    process.exit(1);
});

// Process unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    errorLogger.error('UNHANDLED REJECTION - Shutting down...', {
        reason,
        promise
    });
    
    process.exit(1);
});

module.exports = {
    errorHandler,
    asyncHandler,
    notFoundHandler,
    
    // Custom error classes
    APIError,
    ValidationError,
    NotFoundError,
    RateLimitError,
    AuthenticationError,
    ExternalAPIError
};
