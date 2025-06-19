const mongoose = require('mongoose');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

class DatabaseConnection {
    constructor() {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
    }

    async connect() {
        try {
            // MongoDB connection options
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10, // Maintain up to 10 socket connections
                serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                family: 4, // Use IPv4, skip trying IPv6
                bufferCommands: false, // Disable mongoose buffering
                bufferMaxEntries: 0 // Disable mongoose buffering
            };

            // Connect to MongoDB Atlas
            await mongoose.connect(process.env.MONGODB_URI, options);
            
            this.isConnected = true;
            this.connectionAttempts = 0;
            
            logger.info('🔥 FireAPI-Hub successfully connected to MongoDB Atlas');
            logger.info(`📊 Database: ${mongoose.connection.name}`);
            logger.info(`🌐 Host: ${mongoose.connection.host}`);
            
            // Connection event listeners
            this.setupEventListeners();
            
            return true;
        } catch (error) {
            this.connectionAttempts++;
            logger.error(`❌ MongoDB connection attempt ${this.connectionAttempts} failed:`, error.message);
            
            if (this.connectionAttempts < this.maxRetries) {
                logger.info(`🔄 Retrying connection in 5 seconds... (${this.connectionAttempts}/${this.maxRetries})`);
                setTimeout(() => this.connect(), 5000);
            } else {
                logger.error('💥 Max connection attempts reached. Database connection failed.');
                process.exit(1);
            }
            
            return false;
        }
    }

    setupEventListeners() {
        // Connection events
        mongoose.connection.on('connected', () => {
            this.isConnected = true;
            logger.info('🟢 MongoDB connection established');
        });

        mongoose.connection.on('error', (error) => {
            this.isConnected = false;
            logger.error('🔴 MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            this.isConnected = false;
            logger.warn('🟡 MongoDB connection disconnected');
            
            // Attempt to reconnect
            if (this.connectionAttempts < this.maxRetries) {
                setTimeout(() => this.connect(), 5000);
            }
        });

        // Process events
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    async disconnect() {
        try {
            await mongoose.connection.close();
            this.isConnected = false;
            logger.info('🔵 MongoDB connection closed gracefully');
        } catch (error) {
            logger.error('❌ Error closing MongoDB connection:', error);
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name,
            collections: Object.keys(mongoose.connection.collections)
        };
    }

    async healthCheck() {
        try {
            const adminDb = mongoose.connection.db.admin();
            const result = await adminDb.ping();
            
            return {
                status: 'healthy',
                connected: this.isConnected,
                ping: result.ok === 1 ? 'success' : 'failed',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Create and export database instance
const database = new DatabaseConnection();

module.exports = {
    database,
    mongoose,
    connect: () => database.connect(),
    disconnect: () => database.disconnect(),
    getStatus: () => database.getConnectionStatus(),
    healthCheck: () => database.healthCheck()
};
