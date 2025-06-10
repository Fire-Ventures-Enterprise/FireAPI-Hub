const { EventEmitter } = require("events");
const winston = require("winston");
const cron = require("node-cron");

// Configure logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/scraping-orchestrator.log" }),
  ],
});

class ScrapingOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.activeScrapers = new Map();
    this.scrapingQueue = [];
    this.scrapingStats = {
      totalScrapes: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      averageTime: 0,
    };
    this.rateLimiter = new Map();
    this.maxConcurrentScrapes = process.env.MAX_CONCURRENT_SCRAPES || 10;

    this.initializeOrchestrator();
  }

  initializeOrchestrator() {
    logger.info("🕷️ Scraping Orchestrator initializing...");

    // Setup event listeners
    this.on("scrapeRequest", this.handleScrapeRequest.bind(this));
    this.on("scrapeComplete", this.handleScrapeComplete.bind(this));
    this.on("scrapeError", this.handleScrapeError.bind(this));

    // Setup scheduled scraping
    this.setupScheduledScraping();

    // Initialize scrapers
    this.initializeScrapers();

    logger.info("✅ Scraping Orchestrator initialized");
  }

  // Initialize all scraper services
  async initializeScrapers() {
    try {
      // We'll import these as we create them
      // const { SportsDataScraper } = require('./SportsDataScraper');
      // const { WeatherDataScraper } = require('./WeatherDataScraper');
      // const { NewsIntelligenceScraper } = require('./NewsIntelligenceScraper');

      logger.info("🔧 Scraper services initialized");
    } catch (error) {
      logger.error(`❌ Error initializing scrapers: ${error.message}`);
    }
  }

  // Handle scrape requests
  async handleScrapeRequest(request) {
    const {
      requestId,
      dataType,
      source,
      parameters,
      priority = "normal",
    } = request;

    logger.info(`📥 Scrape request: ${dataType} from ${source}`);

    // Check rate limiting
    if (this.isRateLimited(source)) {
      logger.warn(`⚠️ Rate limited: ${source}`);
      this.emit("scrapeError", { requestId, error: "Rate limited" });
      return;
    }

    // Check concurrent scrape limit
    if (this.activeScrapers.size >= this.maxConcurrentScrapes) {
      logger.info(`⏳ Queuing scrape request: ${requestId}`);
      this.scrapingQueue.push({
        requestId,
        dataType,
        source,
        parameters,
        priority,
      });
      return;
    }

    // Execute scrape
    await this.executeScrape(requestId, dataType, source, parameters);
  }

  // Execute scraping operation
  async executeScrape(requestId, dataType, source, parameters) {
    const scrapeId = `scrape_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const startTime = Date.now();

    this.activeScrapers.set(scrapeId, {
      requestId,
      dataType,
      source,
      parameters,
      startTime,
      status: "running",
    });

    logger.info(`🚀 Starting scrape: ${scrapeId} for ${dataType}`);

    try {
      let result;

      switch (dataType) {
        case "sports_data":
          result = await this.scrapeSportsData(source, parameters);
          break;
        case "weather_data":
          result = await this.scrapeWeatherData(source, parameters);
          break;
        case "news_intelligence":
          result = await this.scrapeNewsIntelligence(source, parameters);
          break;
        case "referee_data":
          result = await this.scrapeRefereeData(source, parameters);
          break;
        case "venue_data":
          result = await this.scrapeVenueData(source, parameters);
          break;
        case "injury_reports":
          result = await this.scrapeInjuryReports(source, parameters);
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      const duration = Date.now() - startTime;
      this.handleScrapeComplete({ scrapeId, requestId, result, duration });
    } catch (error) {
      logger.error(`❌ Scrape failed: ${scrapeId} - ${error.message}`);
      this.handleScrapeError({ scrapeId, requestId, error: error.message });
    }
  }

  // Sports data scraping
  async scrapeSportsData(source, parameters) {
    const { sport, teams, gameDate, predictionFactors } = parameters;

    logger.info(`⚽ Scraping sports data: ${sport} - ${teams.join(" vs ")}`);

    // Collect data in exact order for each sport
    const orderedData = {};
    const factorOrder = this.getSportFactorOrder(sport);

    for (const factor of factorOrder) {
      if (predictionFactors.includes(factor)) {
        orderedData[factor] = await this.scrapeSpecificFactor(
          sport,
          factor,
          teams,
          gameDate,
          source
        );
        logger.info(`✅ Scraped ${factor} for ${sport}`);

        // Respect rate limiting between factor scraping
        await this.delay(this.getDelayForSource(source));
      }
    }

    return {
      sport,
      teams,
      gameDate,
      factors: orderedData,
      source,
      scrapedAt: new Date(),
      factorOrder: factorOrder.filter((f) => predictionFactors.includes(f)),
    };
  }

  // Get sport-specific factor order
  getSportFactorOrder(sport) {
    const orders = {
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
      baseball: [
        "pitcher",
        "weather",
        "venue",
        "travelDistance",
        "timeChange",
        "injuries",
        "managers",
        "managersH2HRecords",
        "dayOrNightGame",
        "regularSeason",
        "playoffs",
        "windDirection",
      ],
      americanFootball: [
        "referee",
        "weather",
        "venue",
        "travelDistance",
        "timeChange",
        "injuries",
        "coaches",
        "coachesH2HRecords",
        "homeFieldAdvantage",
        "regularSeason",
        "playoffs",
        "temperature",
      ],
      hockey: [
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
        "iceConditions",
      ],
    };

    return orders[sport] || orders.soccer;
  }

  // Scrape specific prediction factor
  async scrapeSpecificFactor(sport, factor, teams, gameDate, source) {
    logger.info(`🔍 Scraping ${factor} for ${sport}: ${teams.join(" vs ")}`);

    switch (factor) {
      case "referee":
        return await this.scrapeRefereeInfo(sport, teams, gameDate, source);
      case "weather":
        return await this.scrapeWeatherInfo(teams, gameDate, source);
      case "venue":
        return await this.scrapeVenueInfo(teams, gameDate, source);
      case "injuries":
        return await this.scrapeInjuryInfo(teams, source);
      case "managers":
      case "coaches":
        return await this.scrapeCoachingInfo(teams, source);
      default:
        return await this.scrapeGenericFactor(factor, teams, gameDate, source);
    }
  }

  // Referee information scraping
  async scrapeRefereeInfo(sport, teams, gameDate, source) {
    // Simulate referee data scraping
    const refereeData = {
      name: "Sample Referee",
      experience: "10 years",
      homeTeamAdvantage: 0.52,
      cardAverage: 4.2,
      source,
      reliability: 0.89,
    };

    return refereeData;
  }

  // Weather information scraping
  async scrapeWeatherInfo(teams, gameDate, source) {
    // Get venue location for weather
    const venueLocation = await this.getVenueLocation(teams);

    const weatherData = {
      temperature: 72,
      humidity: 45,
      windSpeed: 8,
      windDirection: "NE",
      precipitation: 0,
      conditions: "Clear",
      location: venueLocation,
      source,
      reliability: 0.95,
    };

    return weatherData;
  }

  // Venue information scraping
  async scrapeVenueInfo(teams, gameDate, source) {
    const venueData = {
      name: "Sample Stadium",
      capacity: 80000,
      surface: "Grass",
      altitude: 1000,
      homeAdvantage: 0.58,
      source,
      reliability: 0.92,
    };

    return venueData;
  }

  // Injury reports scraping
  async scrapeInjuryInfo(teams, source) {
    const injuryData = {
      homeTeam: {
        injuries: [],
        doubtful: [],
        suspended: [],
      },
      awayTeam: {
        injuries: [],
        doubtful: [],
        suspended: [],
      },
      source,
      reliability: 0.85,
    };

    return injuryData;
  }

  // Weather data scraping
  async scrapeWeatherData(source, parameters) {
    const { location, timeframe } = parameters;

    logger.info(`🌤️ Scraping weather data for: ${location}`);

    // Weather scraping logic here
    return {
      location,
      timeframe,
      current: {
        temperature: 72,
        humidity: 45,
        conditions: "sunny",
      },
      forecast: [],
      source,
      scrapedAt: new Date(),
    };
  }

  // News intelligence scraping
  async scrapeNewsIntelligence(source, parameters) {
    const { topics, teams, timeframe } = parameters;

    logger.info(`📰 Scraping news intelligence: ${topics.join(", ")}`);

    return {
      topics,
      teams,
      timeframe,
      articles: [],
      sentiment: "neutral",
      keyInsights: [],
      source,
      scrapedAt: new Date(),
    };
  }

  // Generic factor scraping
  async scrapeGenericFactor(factor, teams, gameDate, source) {
    return {
      factor,
      value: `scraped_${factor}_data`,
      teams,
      gameDate,
      source,
      confidence: 0.8,
      scrapedAt: new Date(),
    };
  }

  // Rate limiting
  isRateLimited(source) {
    const now = Date.now();
    const sourceLimit = this.rateLimiter.get(source);

    if (!sourceLimit) {
      this.rateLimiter.set(source, { count: 1, resetTime: now + 60000 });
      return false;
    }

    if (now > sourceLimit.resetTime) {
      this.rateLimiter.set(source, { count: 1, resetTime: now + 60000 });
      return false;
    }

    const maxRequests = this.getMaxRequestsForSource(source);
    if (sourceLimit.count >= maxRequests) {
      return true;
    }

    sourceLimit.count++;
    return false;
  }

  getMaxRequestsForSource(source) {
    const limits = {
      "espn.com": 30,
      "weather.com": 60,
      "sportsreference.com": 20,
      default: 40,
    };

    return limits[source] || limits.default;
  }

  getDelayForSource(source) {
    const delays = {
      "espn.com": 2000,
      "weather.com": 1000,
      "sportsreference.com": 3000,
      default: 1500,
    };

    return delays[source] || delays.default;
  }

  // Handle scrape completion
  handleScrapeComplete(result) {
    const { scrapeId, requestId, result: data, duration } = result;

    this.activeScrapers.delete(scrapeId);
    this.scrapingStats.totalScrapes++;
    this.scrapingStats.successfulScrapes++;
    this.updateAverageTime(duration);

    logger.info(`✅ Scrape completed: ${scrapeId} (${duration}ms)`);

    // Emit completion event
    this.emit("scrapeComplete", { scrapeId, requestId, data, duration });

    // Process next in queue
    this.processQueue();
  }

  // Handle scrape errors
  handleScrapeError(error) {
    const { scrapeId, requestId, error: errorMessage } = error;

    this.activeScrapers.delete(scrapeId);
    this.scrapingStats.totalScrapes++;
    this.scrapingStats.failedScrapes++;

    logger.error(`❌ Scrape failed: ${scrapeId} - ${errorMessage}`);

    // Emit error event
    this.emit("scrapeError", { scrapeId, requestId, error: errorMessage });

    // Process next in queue
    this.processQueue();
  }

  // Process scraping queue
  processQueue() {
    if (
      this.scrapingQueue.length === 0 ||
      this.activeScrapers.size >= this.maxConcurrentScrapes
    ) {
      return;
    }

    // Sort by priority
    this.scrapingQueue.sort((a, b) => {
      const priorities = { high: 3, normal: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    const nextScrape = this.scrapingQueue.shift();
    if (nextScrape) {
      this.executeScrape(
        nextScrape.requestId,
        nextScrape.dataType,
        nextScrape.source,
        nextScrape.parameters
      );
    }
  }

  // Setup scheduled scraping
  setupScheduledScraping() {
    // Schedule regular data updates
    cron.schedule("*/15 * * * *", () => {
      logger.info("⏰ Running scheduled scraping...");
      this.runScheduledScrapes();
    });

    logger.info("📅 Scheduled scraping setup complete");
  }

  async runScheduledScrapes() {
    // Regular scheduled scrapes for fresh data
    const scheduledScrapes = [
      { dataType: "sports_data", source: "espn.com", priority: "normal" },
      { dataType: "weather_data", source: "weather.com", priority: "low" },
      {
        dataType: "news_intelligence",
        source: "sports_news.com",
        priority: "low",
      },
    ];

    for (const scrape of scheduledScrapes) {
      this.emit("scrapeRequest", {
        requestId: `scheduled_${Date.now()}`,
        ...scrape,
        parameters: { scheduled: true },
      });
    }
  }

  // Utility methods
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getVenueLocation(teams) {
    // Logic to determine venue location based on teams
    return "Sample City, State";
  }

  updateAverageTime(duration) {
    const total =
      this.scrapingStats.averageTime *
        (this.scrapingStats.successfulScrapes - 1) +
      duration;
    this.scrapingStats.averageTime =
      total / this.scrapingStats.successfulScrapes;
  }

  // Get orchestrator status
  getStatus() {
    return {
      activeScrapers: this.activeScrapers.size,
      queueLength: this.scrapingQueue.length,
      stats: this.scrapingStats,
      rateLimits: Object.fromEntries(this.rateLimiter),
      status: "operational",
    };
  }
}

module.exports = { ScrapingOrchestrator };
