const winston = require("winston");
const {
  SoccerIntelligenceCollector,
} = require("./SoccerIntelligenceCollector");
const {
  BasketballIntelligenceCollector,
} = require("./BasketballIntelligenceCollector");

// Configure logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/intelligence-engine.log" }),
  ],
});

class IntelligenceEngine {
  constructor() {
    this.collectors = new Map();
    this.predictionCache = new Map();
    this.modelVersions = new Map();
    this.performanceMetrics = new Map();

    this.initializeEngine();
  }

  async initializeEngine() {
    logger.info("🧠 Intelligence Engine initializing...");

    try {
      // Initialize sport-specific collectors
      this.collectors.set("soccer", new SoccerIntelligenceCollector());
      this.collectors.set("basketball", new BasketballIntelligenceCollector());

      // TODO: Add other sports as we create them
      // this.collectors.set('baseball', new BaseballIntelligenceCollector());
      // this.collectors.set('americanFootball', new AmericanFootballIntelligenceCollector());
      // this.collectors.set('hockey', new HockeyIntelligenceCollector());

      // Initialize model versions
      this.modelVersions.set("soccer", "2.1.0");
      this.modelVersions.set("basketball", "2.0.5");

      // Initialize performance tracking
      this.initializePerformanceTracking();

      logger.info(
        "✅ Intelligence Engine initialized with collectors:",
        Array.from(this.collectors.keys())
      );
    } catch (error) {
      logger.error(
        "❌ Failed to initialize Intelligence Engine:",
        error.message
      );
      throw error;
    }
  }

  // Main intelligence processing method
  async processIntelligenceRequest(request) {
    const {
      sport,
      gameData,
      requestedFactors,
      predictionTypes,
      priority = "normal",
    } = request;
    const requestId = this.generateRequestId();

    logger.info(`🧠 Processing intelligence request ${requestId} for ${sport}`);

    const response = {
      requestId,
      sport,
      gameInfo: gameData,
      intelligence: {},
      predictions: {},
      metadata: {
        requestReceived: new Date(),
        priority,
        status: "processing",
      },
    };

    try {
      // Validate sport support
      if (!this.collectors.has(sport)) {
        throw new Error(
          `Sport '${sport}' not supported. Available: ${Array.from(
            this.collectors.keys()
          ).join(", ")}`
        );
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(sport, gameData, requestedFactors);
      const cachedResult = this.predictionCache.get(cacheKey);

      if (cachedResult && this.isCacheValid(cachedResult)) {
        logger.info(`💾 Serving cached intelligence for ${sport}`);
        return this.formatCachedResponse(cachedResult, requestId);
      }

      // Get sport-specific collector
      const collector = this.collectors.get(sport);

      // Collect intelligence
      logger.info(`🔍 Collecting ${sport} intelligence...`);
      const startTime = Date.now();

      response.intelligence = await collector.collectSportIntelligence(
        gameData,
        requestedFactors
      );

      const collectionTime = Date.now() - startTime;

      // Generate predictions
      logger.info(`🔮 Generating ${sport} predictions...`);
      response.predictions = await this.generateUnifiedPredictions(
        sport,
        response.intelligence,
        predictionTypes
      );

      // Add cross-sport insights if applicable
      response.crossSportInsights = await this.generateCrossSportInsights(
        sport,
        response.intelligence
      );

      // Update metadata
      response.metadata.status = "completed";
      response.metadata.processingTime = Date.now() - startTime;
      response.metadata.collectionTime = collectionTime;
      response.metadata.modelVersion = this.modelVersions.get(sport);
      response.metadata.processedAt = new Date();

      // Cache the result
      this.cacheResult(cacheKey, response);

      // Update performance metrics
      this.updatePerformanceMetrics(
        sport,
        collectionTime,
        response.intelligence.metadata.overallConfidence
      );

      logger.info(
        `✅ Intelligence processing completed for ${sport} in ${response.metadata.processingTime}ms`
      );

      return response;
    } catch (error) {
      logger.error(
        `❌ Error processing intelligence request: ${error.message}`
      );
      response.metadata.status = "error";
      response.metadata.error = error.message;
      response.metadata.processedAt = new Date();

      throw error;
    }
  }

  // Collect intelligence using sport-specific collector
  async collectSportIntelligence(sport, gameData, requestedFactors) {
    const collector = this.collectors.get(sport);

    if (!collector) {
      throw new Error(`No collector available for sport: ${sport}`);
    }

    // Use the collector's main method (different names for each sport)
    switch (sport) {
      case "soccer":
        return await collector.collectSoccerIntelligence(
          gameData,
          requestedFactors
        );
      case "basketball":
        return await collector.collectBasketballIntelligence(
          gameData,
          requestedFactors
        );
      case "baseball":
        return await collector.collectBaseballIntelligence(
          gameData,
          requestedFactors
        );
      case "americanFootball":
        return await collector.collectFootballIntelligence(
          gameData,
          requestedFactors
        );
      case "hockey":
        return await collector.collectHockeyIntelligence(
          gameData,
          requestedFactors
        );
      default:
        throw new Error(
          `Unknown sport intelligence collection method: ${sport}`
        );
    }
  }

  // Generate unified predictions across all sports
  async generateUnifiedPredictions(
    sport,
    intelligence,
    predictionTypes = ["all"]
  ) {
    logger.info(`🔮 Generating unified predictions for ${sport}`);

    const predictions = {
      primary: {},
      secondary: {},
      advanced: {},
      confidence: {},
      metadata: {
        generatedAt: new Date(),
        sport,
        modelVersion: this.modelVersions.get(sport),
        predictionTypes,
      },
    };

    try {
      // Generate sport-specific primary predictions
      predictions.primary = await this.generatePrimaryPredictions(
        sport,
        intelligence
      );

      // Generate secondary predictions if requested
      if (
        predictionTypes.includes("all") ||
        predictionTypes.includes("secondary")
      ) {
        predictions.secondary = await this.generateSecondaryPredictions(
          sport,
          intelligence
        );
      }

      // Generate advanced analytics if requested
      if (
        predictionTypes.includes("all") ||
        predictionTypes.includes("advanced")
      ) {
        predictions.advanced = await this.generateAdvancedAnalytics(
          sport,
          intelligence
        );
      }

      // Calculate prediction confidence scores
      predictions.confidence = this.calculatePredictionConfidence(
        sport,
        intelligence,
        predictions
      );

      // Add prediction insights
      predictions.insights = this.generatePredictionInsights(
        sport,
        intelligence,
        predictions
      );

      return predictions;
    } catch (error) {
      logger.error(`❌ Error generating predictions: ${error.message}`);
      predictions.error = error.message;
      return predictions;
    }
  }

  // Generate primary predictions for each sport
  async generatePrimaryPredictions(sport, intelligence) {
    const factors = intelligence.factors;
    const confidence = intelligence.confidence;

    switch (sport) {
      case "soccer":
        return {
          matchResult: {
            homeWin: this.calculateSoccerWinProbability(factors, "home"),
            awayWin: this.calculateSoccerWinProbability(factors, "away"),
            draw: this.calculateSoccerDrawProbability(factors),
          },
          goals: {
            totalGoals: this.predictTotalGoals(factors),
            homeGoals: this.predictTeamGoals(factors, "home"),
            awayGoals: this.predictTeamGoals(factors, "away"),
          },
          cards: {
            totalCards: this.predictTotalCards(factors),
            homeCards: this.predictTeamCards(factors, "home"),
            awayCards: this.predictTeamCards(factors, "away"),
          },
        };

      case "basketball":
        return {
          gameResult: {
            homeWin: this.calculateBasketballWinProbability(factors, "home"),
            awayWin: this.calculateBasketballWinProbability(factors, "away"),
          },
          points: {
            totalPoints: this.predictTotalPoints(factors),
            homePoints: this.predictTeamPoints(factors, "home"),
            awayPoints: this.predictTeamPoints(factors, "away"),
          },
          spread: {
            pointSpread: this.calculatePointSpread(factors),
            confidence: this.calculateSpreadConfidence(factors),
          },
        };

      default:
        throw new Error(
          `Primary predictions not implemented for sport: ${sport}`
        );
    }
  }

  // Generate secondary predictions
  async generateSecondaryPredictions(sport, intelligence) {
    const factors = intelligence.factors;

    switch (sport) {
      case "soccer":
        return {
          corners: {
            totalCorners: this.predictCorners(factors),
            homeCorners: this.predictTeamCorners(factors, "home"),
            awayCorners: this.predictTeamCorners(factors, "away"),
          },
          possession: {
            homePossession: this.predictPossession(factors, "home"),
            awayPossession: this.predictPossession(factors, "away"),
          },
          shots: {
            totalShots: this.predictTotalShots(factors),
            shotsOnTarget: this.predictShotsOnTarget(factors),
          },
        };

      case "basketball":
        return {
          rebounds: {
            totalRebounds: this.predictTotalRebounds(factors),
            homeRebounds: this.predictTeamRebounds(factors, "home"),
            awayRebounds: this.predictTeamRebounds(factors, "away"),
          },
          assists: {
            totalAssists: this.predictTotalAssists(factors),
            homeAssists: this.predictTeamAssists(factors, "home"),
            awayAssists: this.predictTeamAssists(factors, "away"),
          },
          pace: {
            gamePace: this.predictGamePace(factors),
            possessions: this.predictPossessions(factors),
          },
        };

      default:
        return {};
    }
  }

  // Generate advanced analytics
  async generateAdvancedAnalytics(sport, intelligence) {
    const factors = intelligence.factors;

    return {
      factorImpact: this.analyzeFactorImpacts(sport, factors),
      scenarioAnalysis: this.performScenarioAnalysis(sport, factors),
      keyInsights: this.generateKeyInsights(sport, factors),
      riskFactors: this.identifyRiskFactors(sport, factors),
      opportunityFactors: this.identifyOpportunities(sport, factors),
    };
  }

  // Soccer-specific prediction methods
  calculateSoccerWinProbability(factors, team) {
    let baseProb = team === "home" ? 0.45 : 0.35;

    // Apply factor influences
    if (factors.venue && team === "home") {
      baseProb += factors.venue.impact.homeTeamBoost || 0;
    }

    if (factors.injuries) {
      const injuryImpact =
        team === "home"
          ? -(factors.injuries.impact.homeTeamWeakening || 0)
          : -(factors.injuries.impact.awayTeamWeakening || 0);
      baseProb += injuryImpact;
    }

    if (factors.weather) {
      baseProb += factors.weather.impact.scoringEffect || 0;
    }

    return Math.max(0.1, Math.min(0.8, baseProb));
  }

  calculateSoccerDrawProbability(factors) {
    let drawProb = 0.2;

    // Weather conditions can increase draw probability
    if (factors.weather && factors.weather.impact.scoringEffect < 0) {
      drawProb += Math.abs(factors.weather.impact.scoringEffect) * 0.5;
    }

    // Defensive managers increase draw probability
    if (
      factors.managers &&
      factors.managers.impact.tacticalAdvantage === "defensive"
    ) {
      drawProb += 0.05;
    }

    return Math.max(0.1, Math.min(0.4, drawProb));
  }

  predictTotalGoals(factors) {
    let baseGoals = 2.6;

    // Weather impact
    if (factors.weather) {
      baseGoals += factors.weather.impact.scoringEffect || 0;
    }

    // Venue impact
    if (factors.venue && factors.venue.impact.scoringEffect) {
      baseGoals += factors.venue.impact.scoringEffect;
    }

    // Injury impact
    if (factors.injuries) {
      const injuryImpact =
        (factors.injuries.impact.homeTeamWeakening +
          factors.injuries.impact.awayTeamWeakening) /
        2;
      baseGoals -= injuryImpact * 0.5;
    }

    return Math.max(1.0, Math.min(5.0, baseGoals));
  }

  // Basketball-specific prediction methods
  calculateBasketballWinProbability(factors, team) {
    let baseProb = team === "home" ? 0.55 : 0.45;

    // Back-to-back impact
    if (factors.backToBackGames) {
      const fatigueImpact =
        team === "home"
          ? -(factors.backToBackGames.impact.homeTeamFatigue || 0)
          : -(factors.backToBackGames.impact.awayTeamFatigue || 0);
      baseProb += fatigueImpact;
    }

    // Rest days impact
    if (factors.restDays) {
      const restBoost =
        team === "home"
          ? factors.restDays.impact.performanceBoost.home || 0
          : factors.restDays.impact.performanceBoost.away || 0;
      baseProb += restBoost;
    }

    // Venue impact
    if (factors.venue && team === "home") {
      baseProb += factors.venue.impact.homeTeamBoost || 0;
    }

    return Math.max(0.15, Math.min(0.85, baseProb));
  }

  predictTotalPoints(factors) {
    let basePoints = 215.5;

    // Pace factors
    if (factors.backToBackGames) {
      const avgFatigue =
        (factors.backToBackGames.impact.homeTeamFatigue +
          factors.backToBackGames.impact.awayTeamFatigue) /
        2;
      basePoints -= avgFatigue * 20; // Fatigue reduces scoring
    }

    // Rest impact
    if (factors.restDays) {
      const avgBoost =
        (factors.restDays.impact.performanceBoost.home +
          factors.restDays.impact.performanceBoost.away) /
        2;
      basePoints += avgBoost * 15;
    }

    // Altitude impact
    if (factors.altitude && factors.altitude.impact.enduranceEffect) {
      basePoints += factors.altitude.impact.enduranceEffect * 10;
    }

    return Math.max(180, Math.min(250, basePoints));
  }

  calculatePointSpread(factors) {
    let spread = -3.5; // Home team favored by default

    // Adjust based on factors
    if (factors.venue) {
      spread -= (factors.venue.impact.homeTeamBoost || 0) * 20;
    }

    if (factors.injuries) {
      const injuryDiff =
        factors.injuries.impact.awayTeamWeakening -
        factors.injuries.impact.homeTeamWeakening;
      spread -= injuryDiff * 15;
    }

    return Math.round(spread * 2) / 2; // Round to nearest 0.5
  }

  // Cross-sport insights
  async generateCrossSportInsights(sport, intelligence) {
    const insights = {
      weatherPatterns: this.analyzeCrossWeatherPatterns(intelligence),
      venueComparisons: this.generateVenueComparisons(sport, intelligence),
      injuryTrends: this.analyzeCrossInjuryTrends(intelligence),
      applicableFactors: this.identifyApplicableFactors(sport, intelligence),
    };

    return insights;
  }

  // Cache management
  generateCacheKey(sport, gameData, factors) {
    const key = `${sport}_${gameData.teams.homeTeam}_${
      gameData.teams.awayTeam
    }_${gameData.gameDate}_${JSON.stringify(factors || [])}`;
    return Buffer.from(key).toString("base64").substring(0, 50);
  }

  cacheResult(cacheKey, result) {
    this.predictionCache.set(cacheKey, {
      result,
      timestamp: new Date(),
      ttl: 1800, // 30 minutes
    });

    logger.info(`💾 Cached intelligence result: ${cacheKey}`);
  }

  isCacheValid(cachedData) {
    const now = new Date();
    const age = (now - cachedData.timestamp) / 1000;
    return age < cachedData.ttl;
  }

  // Performance tracking
  initializePerformanceTracking() {
    this.performanceMetrics.set("soccer", {
      avgTime: 0,
      totalRequests: 0,
      avgConfidence: 0,
    });
    this.performanceMetrics.set("basketball", {
      avgTime: 0,
      totalRequests: 0,
      avgConfidence: 0,
    });
  }

  updatePerformanceMetrics(sport, processingTime, confidence) {
    const metrics = this.performanceMetrics.get(sport);
    if (metrics) {
      metrics.totalRequests++;
      metrics.avgTime =
        (metrics.avgTime * (metrics.totalRequests - 1) + processingTime) /
        metrics.totalRequests;
      metrics.avgConfidence =
        (metrics.avgConfidence * (metrics.totalRequests - 1) + confidence) /
        metrics.totalRequests;
    }
  }

  // Utility methods
  generateRequestId() {
    return `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  calculatePredictionConfidence(sport, intelligence, predictions) {
    const factorConfidence = intelligence.metadata.overallConfidence || 0.75;
    const modelConfidence = this.getModelConfidence(sport);

    return {
      overall: (factorConfidence + modelConfidence) / 2,
      factors: factorConfidence,
      model: modelConfidence,
      dataQuality: this.assessDataQuality(intelligence),
    };
  }

  getModelConfidence(sport) {
    const modelConfidences = {
      soccer: 0.82,
      basketball: 0.85,
      baseball: 0.78,
      americanFootball: 0.8,
      hockey: 0.77,
    };

    return modelConfidences[sport] || 0.75;
  }

  assessDataQuality(intelligence) {
    const factors = intelligence.factors;
    const totalFactors = Object.keys(factors).length;
    let qualityScore = 0;

    Object.values(factors).forEach((factor) => {
      if (!factor.error && factor.confidence > 0.7) {
        qualityScore += 1;
      } else if (!factor.error) {
        qualityScore += 0.5;
      }
    });

    return totalFactors > 0 ? qualityScore / totalFactors : 0;
  }

  // Status and monitoring
  getEngineStatus() {
    return {
      availableSports: Array.from(this.collectors.keys()),
      modelVersions: Object.fromEntries(this.modelVersions),
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      cacheSize: this.predictionCache.size,
      status: "operational",
      uptime: process.uptime(),
    };
  }

  // Placeholder methods for missing prediction functions
  predictTeamGoals(factors, team) {
    return 1.3;
  }
  predictTotalCards(factors) {
    return 4.2;
  }
  predictTeamCards(factors, team) {
    return 2.1;
  }
  predictCorners(factors) {
    return 10.2;
  }
  predictTeamCorners(factors, team) {
    return 5.1;
  }
  predictPossession(factors, team) {
    return 50;
  }
  predictTotalShots(factors) {
    return 22;
  }
  predictShotsOnTarget(factors) {
    return 8;
  }
  predictTeamPoints(factors, team) {
    return 107.5;
  }
  predictTotalRebounds(factors) {
    return 85;
  }
  predictTeamRebounds(factors, team) {
    return 42.5;
  }
  predictTotalAssists(factors) {
    return 45;
  }
  predictTeamAssists(factors, team) {
    return 22.5;
  }
  predictGamePace(factors) {
    return 98.5;
  }
  predictPossessions(factors) {
    return 197;
  }
  calculateSpreadConfidence(factors) {
    return 0.75;
  }
  analyzeFactorImpacts(sport, factors) {
    return {};
  }
  performScenarioAnalysis(sport, factors) {
    return {};
  }
  generateKeyInsights(sport, factors) {
    return [];
  }
  identifyRiskFactors(sport, factors) {
    return [];
  }
  identifyOpportunities(sport, factors) {
    return [];
  }
  analyzeCrossWeatherPatterns(intelligence) {
    return {};
  }
  generateVenueComparisons(sport, intelligence) {
    return {};
  }
  analyzeCrossInjuryTrends(intelligence) {
    return {};
  }
  identifyApplicableFactors(sport, intelligence) {
    return [];
  }
  generatePredictionInsights(sport, intelligence, predictions) {
    return [];
  }
  formatCachedResponse(cachedResult, requestId) {
    return { ...cachedResult.result, requestId };
  }
}

module.exports = { IntelligenceEngine };
