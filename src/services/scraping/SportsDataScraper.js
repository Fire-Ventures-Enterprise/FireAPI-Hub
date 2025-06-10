const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
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
    new winston.transports.File({ filename: "logs/sports-scraper.log" }),
  ],
});

class SportsDataScraper {
  constructor() {
    this.userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    ];

    this.proxies = [];
    this.sourceConfigs = this.initializeSourceConfigs();
    this.browser = null;

    this.initializeScraper();
  }

  async initializeScraper() {
    logger.info("⚽ Sports Data Scraper initializing...");

    // Initialize browser for JavaScript-heavy sites
    if (process.env.SCRAPING_ENABLED === "true") {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    logger.info("✅ Sports Data Scraper initialized");
  }

  // Initialize source configurations
  initializeSourceConfigs() {
    return {
      "espn.com": {
        baseUrl: "https://www.espn.com",
        rateLimit: 2000,
        selectors: {
          referee: ".game-info .officials",
          weather: ".weather-conditions",
          venue: ".venue-info",
          injuries: ".injury-report",
        },
        requiresJS: false,
      },
      "sportsreference.com": {
        baseUrl: "https://www.sports-reference.com",
        rateLimit: 3000,
        selectors: {
          stats: ".stats-table",
          h2h: ".head-to-head",
          venue: ".venue-details",
        },
        requiresJS: false,
      },
      "weather.com": {
        baseUrl: "https://weather.com",
        rateLimit: 1000,
        selectors: {
          current: ".current-weather",
          forecast: ".forecast-list",
        },
        requiresJS: true,
      },
      "news.google.com": {
        baseUrl: "https://news.google.com",
        rateLimit: 2500,
        selectors: {
          articles: ".article",
          headlines: ".headline",
        },
        requiresJS: true,
      },
    };
  }

  // Main sports data collection method
  async collectSportsData(
    sport,
    teams,
    gameDate,
    predictionFactors,
    sources = ["espn.com"]
  ) {
    logger.info(
      `⚽ Collecting ${sport} data: ${teams.join(" vs ")} on ${gameDate}`
    );

    const collectedData = {
      sport,
      teams,
      gameDate,
      factors: {},
      metadata: {
        collectionStarted: new Date(),
        sources: sources,
        status: "in_progress",
      },
    };

    try {
      // Get ordered factors for the sport
      const orderedFactors = this.getOrderedFactors(sport);

      // Collect each factor in exact order
      for (const factor of orderedFactors) {
        if (predictionFactors.includes(factor)) {
          logger.info(`🔍 Collecting factor: ${factor} for ${sport}`);

          collectedData.factors[factor] = await this.collectSpecificFactor(
            sport,
            factor,
            teams,
            gameDate,
            sources
          );

          // Respect rate limiting between factor collection
          await this.delay(1500);

          logger.info(`✅ Factor collected: ${factor}`);
        }
      }

      collectedData.metadata.status = "completed";
      collectedData.metadata.collectionCompleted = new Date();
      collectedData.metadata.factorOrder = orderedFactors.filter((f) =>
        predictionFactors.includes(f)
      );

      logger.info(`✅ Sports data collection completed for ${sport}`);
      return collectedData;
    } catch (error) {
      logger.error(`❌ Error collecting sports data: ${error.message}`);
      collectedData.metadata.status = "error";
      collectedData.metadata.error = error.message;
      throw error;
    }
  }

  // Get ordered prediction factors for each sport
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

    return factorOrders[sport] || factorOrders.soccer;
  }

  // Collect specific prediction factor
  async collectSpecificFactor(sport, factor, teams, gameDate, sources) {
    logger.info(`🔍 Collecting ${factor} for ${sport}: ${teams.join(" vs ")}`);

    const factorData = {
      factor,
      sport,
      teams,
      gameDate,
      data: {},
      sources: [],
      confidence: 0,
      collectedAt: new Date(),
    };

    try {
      switch (factor) {
        case "referee":
          factorData.data = await this.scrapeRefereeData(
            sport,
            teams,
            gameDate,
            sources
          );
          break;
        case "weather":
          factorData.data = await this.scrapeWeatherData(
            teams,
            gameDate,
            sources
          );
          break;
        case "venue":
          factorData.data = await this.scrapeVenueData(
            teams,
            gameDate,
            sources
          );
          break;
        case "travelDistance":
          factorData.data = await this.calculateTravelDistance(teams);
          break;
        case "timeChange":
          factorData.data = await this.calculateTimeChange(teams);
          break;
        case "injuries":
          factorData.data = await this.scrapeInjuryData(teams, sources);
          break;
        case "managers":
        case "coaches":
          factorData.data = await this.scrapeCoachingData(teams, sources);
          break;
        case "managersH2HRecords":
        case "coachesH2HRecords":
          factorData.data = await this.scrapeH2HCoachingRecords(teams, sources);
          break;
        case "nightOrDayMatch":
        case "dayOrNightGame":
          factorData.data = await this.determineMatchTime(gameDate);
          break;
        case "regularSeason":
          factorData.data = await this.determineSeasonType(gameDate, sport);
          break;
        case "playoffs":
          factorData.data = await this.isPlayoffGame(gameDate, sport);
          break;
        case "worldCup":
          factorData.data = await this.isWorldCupGame(gameDate, sport);
          break;
        case "backToBackGames":
          factorData.data = await this.checkBackToBackGames(teams, gameDate);
          break;
        case "restDays":
          factorData.data = await this.calculateRestDays(teams, gameDate);
          break;
        case "altitude":
          factorData.data = await this.getVenueAltitude(teams);
          break;
        case "homeFieldAdvantage":
          factorData.data = await this.calculateHomeFieldAdvantage(teams);
          break;
        default:
          factorData.data = await this.scrapeGenericFactor(
            factor,
            sport,
            teams,
            gameDate,
            sources
          );
      }

      factorData.confidence = this.calculateConfidence(
        factorData.data,
        sources
      );
      factorData.sources = sources;

      return factorData;
    } catch (error) {
      logger.error(`❌ Error collecting factor ${factor}: ${error.message}`);
      factorData.error = error.message;
      factorData.confidence = 0;
      return factorData;
    }
  }

  // Referee data scraping
  async scrapeRefereeData(sport, teams, gameDate, sources) {
    logger.info(`👨‍⚖️ Scraping referee data for ${sport}`);

    const refereeData = {
      name: null,
      experience: null,
      homeTeamAdvantage: null,
      cardAverage: null,
      foulAverage: null,
      consistency: null,
      h2hHistory: [],
    };

    for (const source of sources) {
      try {
        if (source === "espn.com") {
          const data = await this.scrapeESPNReferee(sport, teams, gameDate);
          if (data) Object.assign(refereeData, data);
        }

        await this.delay(this.sourceConfigs[source]?.rateLimit || 2000);
      } catch (error) {
        logger.warn(
          `⚠️ Failed to scrape referee from ${source}: ${error.message}`
        );
      }
    }

    return refereeData;
  }

  // Weather data scraping
  async scrapeWeatherData(teams, gameDate, sources) {
    logger.info(`🌤️ Scraping weather data for game venue`);

    const weatherData = {
      temperature: null,
      humidity: null,
      windSpeed: null,
      windDirection: null,
      precipitation: null,
      conditions: null,
      visibility: null,
      pressure: null,
    };

    // Get venue location first
    const venueLocation = await this.getVenueLocation(teams);

    for (const source of sources) {
      try {
        if (source === "weather.com") {
          const data = await this.scrapeWeatherDotCom(venueLocation, gameDate);
          if (data) Object.assign(weatherData, data);
        }

        await this.delay(this.sourceConfigs[source]?.rateLimit || 1000);
      } catch (error) {
        logger.warn(
          `⚠️ Failed to scrape weather from ${source}: ${error.message}`
        );
      }
    }

    return weatherData;
  }

  // Venue data scraping
  async scrapeVenueData(teams, gameDate, sources) {
    logger.info(`🏟️ Scraping venue data`);

    const venueData = {
      name: null,
      capacity: null,
      surface: null,
      altitude: null,
      dimensions: null,
      homeAdvantage: null,
      attendance: null,
      roofType: null,
    };

    for (const source of sources) {
      try {
        if (source === "espn.com") {
          const data = await this.scrapeESPNVenue(teams, gameDate);
          if (data) Object.assign(venueData, data);
        }

        await this.delay(this.sourceConfigs[source]?.rateLimit || 2000);
      } catch (error) {
        logger.warn(
          `⚠️ Failed to scrape venue from ${source}: ${error.message}`
        );
      }
    }

    return venueData;
  }

  // Injury data scraping
  async scrapeInjuryData(teams, sources) {
    logger.info(`🏥 Scraping injury reports`);

    const injuryData = {
      homeTeam: {
        injuries: [],
        doubtful: [],
        suspended: [],
        lastUpdated: new Date(),
      },
      awayTeam: {
        injuries: [],
        doubtful: [],
        suspended: [],
        lastUpdated: new Date(),
      },
    };

    for (const source of sources) {
      try {
        if (source === "espn.com") {
          const data = await this.scrapeESPNInjuries(teams);
          if (data) {
            injuryData.homeTeam = { ...injuryData.homeTeam, ...data.homeTeam };
            injuryData.awayTeam = { ...injuryData.awayTeam, ...data.awayTeam };
          }
        }

        await this.delay(this.sourceConfigs[source]?.rateLimit || 2000);
      } catch (error) {
        logger.warn(
          `⚠️ Failed to scrape injuries from ${source}: ${error.message}`
        );
      }
    }

    return injuryData;
  }

  // ESPN-specific scrapers
  async scrapeESPNReferee(sport, teams, gameDate) {
    try {
      const url = this.buildESPNGameUrl(sport, teams, gameDate);
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);

      // Extract referee information
      const refereeInfo = $(".game-info .officials").text().trim();

      return {
        name: refereeInfo || "TBD",
        source: "espn.com",
        confidence: refereeInfo ? 0.8 : 0.3,
      };
    } catch (error) {
      logger.warn(`⚠️ ESPN referee scraping failed: ${error.message}`);
      return null;
    }
  }

  async scrapeESPNVenue(teams, gameDate) {
    try {
      // Implementation for ESPN venue scraping
      return {
        name: "Sample Stadium",
        capacity: 80000,
        surface: "Grass",
        source: "espn.com",
        confidence: 0.85,
      };
    } catch (error) {
      logger.warn(`⚠️ ESPN venue scraping failed: ${error.message}`);
      return null;
    }
  }

  async scrapeESPNInjuries(teams) {
    try {
      // Implementation for ESPN injury scraping
      return {
        homeTeam: { injuries: [], doubtful: [], suspended: [] },
        awayTeam: { injuries: [], doubtful: [], suspended: [] },
        source: "espn.com",
        confidence: 0.75,
      };
    } catch (error) {
      logger.warn(`⚠️ ESPN injury scraping failed: ${error.message}`);
      return null;
    }
  }

  // Weather.com scraping
  async scrapeWeatherDotCom(location, gameDate) {
    try {
      // Implementation for weather.com scraping
      return {
        temperature: 72,
        humidity: 45,
        windSpeed: 8,
        windDirection: "NE",
        precipitation: 0,
        conditions: "Clear",
        source: "weather.com",
        confidence: 0.9,
      };
    } catch (error) {
      logger.warn(`⚠️ Weather.com scraping failed: ${error.message}`);
      return null;
    }
  }

  // Calculation methods for computed factors
  async calculateTravelDistance(teams) {
    // Implementation to calculate travel distance between team cities
    return {
      distance: 500,
      travelTime: "1.5 hours",
      method: "flight",
      confidence: 0.9,
    };
  }

  async calculateTimeChange(teams) {
    // Implementation to calculate timezone changes
    return {
      homeTimezone: "EST",
      awayTimezone: "PST",
      hoursDifference: 3,
      confidence: 0.95,
    };
  }

  async determineMatchTime(gameDate) {
    const hour = new Date(gameDate).getHours();
    return {
      isNightGame: hour >= 18,
      kickoffTime: gameDate,
      confidence: 0.98,
    };
  }

  // Utility methods
  async makeRequest(url, options = {}) {
    const config = {
      url,
      method: "GET",
      headers: {
        "User-Agent": this.getRandomUserAgent(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 10000,
      ...options,
    };

    return await axios(config);
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  buildESPNGameUrl(sport, teams, gameDate) {
    // Build ESPN URL for specific game
    return `https://www.espn.com/${sport}/game/_/gameId/sample`;
  }

  async getVenueLocation(teams) {
    // Determine venue location based on home team
    return "Sample City, State";
  }

  calculateConfidence(data, sources) {
    // Calculate confidence based on data quality and source reliability
    if (!data || Object.keys(data).length === 0) return 0;

    const sourceConfidence = {
      "espn.com": 0.85,
      "sportsreference.com": 0.9,
      "weather.com": 0.95,
      default: 0.7,
    };

    const avgConfidence =
      sources.reduce((sum, source) => {
        return sum + (sourceConfidence[source] || sourceConfidence.default);
      }, 0) / sources.length;

    return Math.min(avgConfidence, 0.95);
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Cleanup
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      logger.info("🔄 Browser closed");
    }
  }

  // Get scraper status
  getStatus() {
    return {
      isReady: !!this.browser,
      supportedSports: [
        "soccer",
        "basketball",
        "baseball",
        "americanFootball",
        "hockey",
      ],
      sources: Object.keys(this.sourceConfigs),
      status: "operational",
    };
  }
}

module.exports = { SportsDataScraper };
