const { EventEmitter } = require("events");
const winston = require("winston");

// Configure logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/fireapi-central.log" }),
  ],
});

class CentralDataOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.activeScrapes = new Map();
    this.dataCache = new Map();
    this.spokeConnections = new Map();

    this.initializeOrchestrator();
  }

  initializeOrchestrator() {
    logger.info("🔥 FireAPI Central Data Orchestrator initializing...");

    // Setup event listeners
    this.on("dataRequest", this.handleDataRequest.bind(this));
    this.on("scrapeComplete", this.handleScrapeComplete.bind(this));
    this.on("spokeConnect", this.handleSpokeConnection.bind(this));

    logger.info("✅ Central Data Orchestrator initialized");
  }

  // Handle data requests from spokes
  async handleDataRequest(request) {
    const { spokeId, dataType, parameters, requestId } = request;

    logger.info(`📥 Data request from spoke: ${spokeId}, type: ${dataType}`);

    try {
      // Check if data exists in cache
      const cacheKey = this.generateCacheKey(dataType, parameters);
      const cachedData = this.dataCache.get(cacheKey);

      if (cachedData && this.isCacheValid(cachedData)) {
        logger.info(`💾 Serving cached data for ${dataType}`);
        return this.sendDataToSpoke(spokeId, requestId, cachedData.data);
      }

      // Initiate data collection
      const collectionResult = await this.initiateDataCollection(
        dataType,
        parameters
      );

      // Cache the result
      this.cacheData(cacheKey, collectionResult);

      // Send to requesting spoke
      return this.sendDataToSpoke(spokeId, requestId, collectionResult);
    } catch (error) {
      logger.error(`❌ Error handling data request: ${error.message}`);
      this.sendErrorToSpoke(spokeId, requestId, error);
    }
  }

  // Initiate data collection based on type
  async initiateDataCollection(dataType, parameters) {
    logger.info(`🔄 Initiating data collection for: ${dataType}`);

    switch (dataType) {
      case "sports_data":
        return await this.collectSportsData(parameters);
      case "weather_data":
        return await this.collectWeatherData(parameters);
      case "news_intelligence":
        return await this.collectNewsIntelligence(parameters);
      case "cross_domain":
        return await this.collectCrossDomainData(parameters);
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  // Sports data collection
  async collectSportsData(parameters) {
    const { sport, teams, timeframe, predictionFactors } = parameters;

    logger.info(`⚽ Collecting sports data: ${sport} - ${teams}`);

    // This will connect to our scraping services
    const sportsData = {
      sport,
      teams,
      timeframe,
      collectedAt: new Date(),
      factors: await this.collectPredictionFactors(sport, predictionFactors),
      status: "success",
    };

    return sportsData;
  }

  // Collect prediction factors in exact order
  async collectPredictionFactors(sport, factors) {
    const orderedFactors = this.getOrderedFactors(sport);
    const collectedFactors = {};

    for (const factor of orderedFactors) {
      if (factors.includes(factor)) {
        collectedFactors[factor] = await this.collectSpecificFactor(
          sport,
          factor
        );
        logger.info(`✅ Collected factor: ${factor}`);
      }
    }

    return collectedFactors;
  }

  // Get ordered factors for each sport
  getOrderedFactors(sport) {
    const factorOrders = {
      soccer: [
        "referee",
        "weather",
        "venue",
        "travelDistance",
        "timeChange",
        "injuries",
        "managers",
        "managersH2HRecords",
        "nightOrDayMatch",
        "regularSeason",
        "playoffs",
        "worldCup",
      ],
      basketball: [
        "referee",
        "venue",
        "travelDistance",
        "timeChange",
        "injuries",
        "coaches",
        "coachesH2HRecords",
        "backToBackGames",
        "restDays",
        "regularSeason",
        "playoffs",
        "altitude",
      ],
    };

    return factorOrders[sport] || [];
  }

  // Collect specific prediction factor
  async collectSpecificFactor(sport, factor) {
    // This will integrate with our scraping services
    logger.info(`🔍 Collecting ${factor} for ${sport}`);

    // Placeholder - will be replaced with actual scraping logic
    return {
      factor,
      value: `${factor}_data_for_${sport}`,
      confidence: 0.85,
      source: "fireapi_scraper",
      timestamp: new Date(),
    };
  }

  // Weather data collection
  async collectWeatherData(parameters) {
    const { location, timeframe } = parameters;

    logger.info(`🌤️ Collecting weather data for: ${location}`);

    // Weather data collection logic
    return {
      location,
      timeframe,
      conditions: "sunny",
      temperature: 72,
      humidity: 45,
      windSpeed: 8,
      collectedAt: new Date(),
    };
  }

  // News intelligence collection
  async collectNewsIntelligence(parameters) {
    const { topics, sources, timeframe } = parameters;

    logger.info(`📰 Collecting news intelligence for: ${topics.join(", ")}`);

    // News intelligence logic
    return {
      topics,
      sources,
      timeframe,
      articles: [],
      sentiment: "neutral",
      collectedAt: new Date(),
    };
  }

  // Cross-domain data collection
  async collectCrossDomainData(parameters) {
    const { domains, correlationFactors } = parameters;

    logger.info(`🔗 Collecting cross-domain data: ${domains.join(" <-> ")}`);

    // Cross-domain correlation logic
    return {
      domains,
      correlations: correlationFactors,
      insights: [],
      confidence: 0.78,
      collectedAt: new Date(),
    };
  }

  // Cache management
  generateCacheKey(dataType, parameters) {
    return `${dataType}_${JSON.stringify(parameters)}`;
  }

  cacheData(key, data) {
    this.dataCache.set(key, {
      data,
      timestamp: new Date(),
      ttl: process.env.INTELLIGENCE_CACHE_TTL || 3600,
    });

    logger.info(`💾 Data cached with key: ${key}`);
  }

  isCacheValid(cachedData) {
    const now = new Date();
    const cacheAge = (now - cachedData.timestamp) / 1000; // seconds
    return cacheAge < cachedData.ttl;
  }

  // Spoke communication
  handleSpokeConnection(spokeInfo) {
    const { spokeId, spokeType, capabilities } = spokeInfo;

    this.spokeConnections.set(spokeId, {
      type: spokeType,
      capabilities,
      connectedAt: new Date(),
      lastActivity: new Date(),
    });

    logger.info(`🔌 Spoke connected: ${spokeId} (${spokeType})`);
  }

  sendDataToSpoke(spokeId, requestId, data) {
    logger.info(`📤 Sending data to spoke: ${spokeId}`);

    // This will integrate with our communication service
    const response = {
      requestId,
      spokeId,
      data,
      timestamp: new Date(),
      status: "success",
    };

    this.emit("dataResponse", response);
    return response;
  }

  sendErrorToSpoke(spokeId, requestId, error) {
    logger.error(`📤 Sending error to spoke: ${spokeId} - ${error.message}`);

    const errorResponse = {
      requestId,
      spokeId,
      error: error.message,
      timestamp: new Date(),
      status: "error",
    };

    this.emit("errorResponse", errorResponse);
    return errorResponse;
  }

  // Handle scrape completion
  handleScrapeComplete(scrapeResult) {
    const { scrapeId, dataType, result, duration } = scrapeResult;

    logger.info(`✅ Scrape completed: ${scrapeId} (${duration}ms)`);

    this.activeScrapes.delete(scrapeId);
    this.emit("dataCollected", { dataType, result });
  }

  // Get orchestrator status
  getStatus() {
    return {
      activeScrapes: this.activeScrapes.size,
      cacheSize: this.dataCache.size,
      connectedSpokes: this.spokeConnections.size,
      uptime: process.uptime(),
      status: "operational",
    };
  }
}

module.exports = { CentralDataOrchestrator };
