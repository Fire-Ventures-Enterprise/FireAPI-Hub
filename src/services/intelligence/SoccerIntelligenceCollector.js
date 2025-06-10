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
    new winston.transports.File({ filename: "logs/soccer-intelligence.log" }),
  ],
});

class SoccerIntelligenceCollector {
  constructor() {
    this.sport = "soccer";
    this.factorOrder = [
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
    ];

    this.factorWeights = this.initializeFactorWeights();
    this.predictionModels = this.initializePredictionModels();

    logger.info("⚽ Soccer Intelligence Collector initialized");
  }

  // Initialize factor weights for soccer predictions
  initializeFactorWeights() {
    return {
      referee: 0.08,
      weather: 0.12,
      venue: 0.15,
      travelDistance: 0.06,
      timeChange: 0.04,
      injuries: 0.2,
      managers: 0.1,
      managersH2HRecords: 0.08,
      nightOrDayMatch: 0.03,
      regularSeason: 0.05,
      playoffs: 0.06,
      worldCup: 0.03,
    };
  }

  // Initialize prediction models
  initializePredictionModels() {
    return {
      winProbability: "enhanced_logistic_regression",
      scorePredictor: "neural_network",
      goalScorer: "random_forest",
      cardPredictor: "gradient_boosting",
    };
  }

  // Main intelligence collection method
  async collectSoccerIntelligence(gameData, requestedFactors = null) {
    const { teams, gameDate, league, competition } = gameData;

    logger.info(
      `⚽ Collecting soccer intelligence: ${teams.homeTeam} vs ${teams.awayTeam}`
    );

    const intelligence = {
      sport: this.sport,
      gameInfo: {
        homeTeam: teams.homeTeam,
        awayTeam: teams.awayTeam,
        gameDate,
        league,
        competition,
      },
      factors: {},
      predictions: {},
      confidence: {},
      metadata: {
        collectionStarted: new Date(),
        factorOrder: this.factorOrder,
        status: "in_progress",
      },
    };

    try {
      // Use all factors if none specified
      const factorsToCollect = requestedFactors || this.factorOrder;

      // Collect factors in exact order
      for (const factor of this.factorOrder) {
        if (factorsToCollect.includes(factor)) {
          logger.info(`🔍 Processing soccer factor: ${factor}`);

          intelligence.factors[factor] = await this.processFactor(
            factor,
            gameData
          );
          intelligence.confidence[factor] = this.calculateFactorConfidence(
            factor,
            intelligence.factors[factor]
          );

          logger.info(
            `✅ Soccer factor processed: ${factor} (confidence: ${intelligence.confidence[
              factor
            ].toFixed(2)})`
          );
        }
      }

      // Generate predictions based on collected factors
      intelligence.predictions = await this.generatePredictions(
        intelligence.factors,
        gameData
      );

      // Calculate overall confidence
      intelligence.metadata.overallConfidence = this.calculateOverallConfidence(
        intelligence.confidence
      );
      intelligence.metadata.status = "completed";
      intelligence.metadata.collectionCompleted = new Date();

      logger.info(
        `✅ Soccer intelligence collection completed with confidence: ${intelligence.metadata.overallConfidence.toFixed(
          2
        )}`
      );

      return intelligence;
    } catch (error) {
      logger.error(`❌ Error collecting soccer intelligence: ${error.message}`);
      intelligence.metadata.status = "error";
      intelligence.metadata.error = error.message;
      throw error;
    }
  }

  // Process individual factors
  async processFactor(factor, gameData) {
    logger.info(`🔍 Processing soccer factor: ${factor}`);

    switch (factor) {
      case "referee":
        return await this.processReferee(gameData);
      case "weather":
        return await this.processWeather(gameData);
      case "venue":
        return await this.processVenue(gameData);
      case "travelDistance":
        return await this.processTravelDistance(gameData);
      case "timeChange":
        return await this.processTimeChange(gameData);
      case "injuries":
        return await this.processInjuries(gameData);
      case "managers":
        return await this.processManagers(gameData);
      case "managersH2HRecords":
        return await this.processManagersH2H(gameData);
      case "nightOrDayMatch":
        return await this.processMatchTime(gameData);
      case "regularSeason":
        return await this.processSeasonType(gameData);
      case "playoffs":
        return await this.processPlayoffs(gameData);
      case "worldCup":
        return await this.processWorldCup(gameData);
      default:
        throw new Error(`Unknown soccer factor: ${factor}`);
    }
  }

  // Factor 1: Referee Analysis
  async processReferee(gameData) {
    logger.info("👨‍⚖️ Processing referee factor");

    const refereeAnalysis = {
      name: gameData.referee?.name || "TBD",
      experience: gameData.referee?.experience || 0,
      homeAdvantage: 0.52, // Default neutral
      cardTendency: "moderate",
      consistency: 0.75,
      h2hHistory: [],
      impact: {
        homeTeamAdvantage: 0.02,
        cardProbability: 0.65,
        controversyRisk: 0.15,
      },
    };

    // Analyze referee's historical impact
    if (gameData.referee?.stats) {
      refereeAnalysis.homeAdvantage = this.calculateRefereeHomeAdvantage(
        gameData.referee.stats
      );
      refereeAnalysis.cardTendency = this.determineCardTendency(
        gameData.referee.stats
      );
      refereeAnalysis.consistency = this.calculateRefereeConsistency(
        gameData.referee.stats
      );
    }

    return refereeAnalysis;
  }

  // Factor 2: Weather Analysis
  async processWeather(gameData) {
    logger.info("🌤️ Processing weather factor");

    const weatherAnalysis = {
      temperature: gameData.weather?.temperature || 20,
      humidity: gameData.weather?.humidity || 50,
      windSpeed: gameData.weather?.windSpeed || 5,
      precipitation: gameData.weather?.precipitation || 0,
      conditions: gameData.weather?.conditions || "clear",
      impact: {
        gameStyle: "normal",
        scoringEffect: 0,
        physicalDemand: "moderate",
      },
    };

    // Analyze weather impact on game
    weatherAnalysis.impact = this.analyzeWeatherImpact(weatherAnalysis);

    return weatherAnalysis;
  }

  // Factor 3: Venue Analysis
  async processVenue(gameData) {
    logger.info("🏟️ Processing venue factor");

    const venueAnalysis = {
      name: gameData.venue?.name || "Unknown Stadium",
      capacity: gameData.venue?.capacity || 50000,
      surface: gameData.venue?.surface || "grass",
      dimensions: gameData.venue?.dimensions || { length: 105, width: 68 },
      altitude: gameData.venue?.altitude || 0,
      homeAdvantage: 0.58, // Default home advantage
      atmosphereRating: 8.0,
      impact: {
        homeTeamBoost: 0.08,
        crowdInfluence: 0.75,
        familiarityAdvantage: 0.65,
      },
    };

    // Calculate venue-specific impacts
    venueAnalysis.impact.homeTeamBoost =
      this.calculateVenueHomeAdvantage(venueAnalysis);
    venueAnalysis.impact.altitudeEffect = this.calculateAltitudeEffect(
      venueAnalysis.altitude
    );

    return venueAnalysis;
  }

  // Factor 4: Travel Distance Analysis
  async processTravelDistance(gameData) {
    logger.info("✈️ Processing travel distance factor");

    const travelAnalysis = {
      distance: gameData.travel?.distance || 0,
      travelMethod: gameData.travel?.method || "bus",
      travelTime: gameData.travel?.duration || "2 hours",
      fatigueLevel: "low",
      impact: {
        awayTeamFatigue: 0.02,
        performanceReduction: 0.01,
        jetLagEffect: 0,
      },
    };

    // Calculate travel impact
    travelAnalysis.impact = this.analyzeTravelImpact(travelAnalysis);

    return travelAnalysis;
  }

  // Factor 5: Time Change Analysis
  async processTimeChange(gameData) {
    logger.info("🕐 Processing time change factor");

    const timeChangeAnalysis = {
      homeTimezone: gameData.timezone?.home || "UTC",
      awayTimezone: gameData.timezone?.away || "UTC",
      hoursDifference: gameData.timezone?.difference || 0,
      jetLagSeverity: "none",
      impact: {
        awayTeamDisruption: 0,
        adaptationTime: "0 hours",
        performanceImpact: 0,
      },
    };

    // Calculate time change impact
    timeChangeAnalysis.impact =
      this.analyzeTimeChangeImpact(timeChangeAnalysis);

    return timeChangeAnalysis;
  }

  // Factor 6: Injuries Analysis
  async processInjuries(gameData) {
    logger.info("🏥 Processing injuries factor");

    const injuryAnalysis = {
      homeTeam: {
        keyPlayerInjuries: gameData.injuries?.home?.key || [],
        totalInjured: gameData.injuries?.home?.total || 0,
        impactLevel: "low",
        affectedPositions: [],
      },
      awayTeam: {
        keyPlayerInjuries: gameData.injuries?.away?.key || [],
        totalInjured: gameData.injuries?.away?.total || 0,
        impactLevel: "low",
        affectedPositions: [],
      },
      impact: {
        homeTeamWeakening: 0,
        awayTeamWeakening: 0,
        tacticalChanges: false,
      },
    };

    // Analyze injury impact
    injuryAnalysis.impact = this.analyzeInjuryImpact(injuryAnalysis);

    return injuryAnalysis;
  }

  // Factor 7: Managers Analysis
  async processManagers(gameData) {
    logger.info("👨‍💼 Processing managers factor");

    const managersAnalysis = {
      homeManager: {
        name: gameData.managers?.home?.name || "Unknown",
        experience: gameData.managers?.home?.experience || 0,
        tacticalStyle: gameData.managers?.home?.style || "balanced",
        winRate: gameData.managers?.home?.winRate || 0.5,
      },
      awayManager: {
        name: gameData.managers?.away?.name || "Unknown",
        experience: gameData.managers?.away?.experience || 0,
        tacticalStyle: gameData.managers?.away?.style || "balanced",
        winRate: gameData.managers?.away?.winRate || 0.5,
      },
      impact: {
        tacticalAdvantage: "neutral",
        experienceEdge: "neutral",
        motivationalFactor: 0.5,
      },
    };

    // Analyze managerial impact
    managersAnalysis.impact = this.analyzeManagerialImpact(managersAnalysis);

    return managersAnalysis;
  }

  // Factor 8: Managers H2H Records
  async processManagersH2H(gameData) {
    logger.info("📊 Processing managers H2H records");

    const h2hAnalysis = {
      totalMeetings: gameData.managersH2H?.total || 0,
      homeManagerWins: gameData.managersH2H?.homeWins || 0,
      awayManagerWins: gameData.managersH2H?.awayWins || 0,
      draws: gameData.managersH2H?.draws || 0,
      psychologicalEdge: "neutral",
      impact: {
        mentalAdvantage: "neutral",
        tacticalFamiliarity: 0.5,
        confidenceBoost: 0,
      },
    };

    // Analyze H2H impact
    h2hAnalysis.impact = this.analyzeManagerH2HImpact(h2hAnalysis);

    return h2hAnalysis;
  }

  // Factor 9: Night or Day Match
  async processMatchTime(gameData) {
    logger.info("🌅 Processing match time factor");

    const gameTime = new Date(gameData.gameDate);
    const hour = gameTime.getHours();

    const timeAnalysis = {
      kickoffTime: gameData.gameDate,
      hour: hour,
      isNightMatch: hour >= 18,
      lighting: hour >= 18 ? "artificial" : "natural",
      impact: {
        visibilityEffect: hour >= 18 ? -0.02 : 0.01,
        atmosphereBoost: hour >= 18 ? 0.03 : -0.01,
        playerPreference: "neutral",
      },
    };

    return timeAnalysis;
  }

  // Factor 10: Regular Season
  async processSeasonType(gameData) {
    logger.info("📅 Processing season type");

    const seasonAnalysis = {
      isRegularSeason:
        gameData.competition !== "playoffs" &&
        gameData.competition !== "worldcup",
      week: gameData.week || 1,
      seasonProgress: gameData.seasonProgress || 0.5,
      impact: {
        pressureLevel: gameData.competition === "regular" ? 0.3 : 0.8,
        rotationLikelihood: gameData.competition === "regular" ? 0.4 : 0.1,
        intensityLevel: gameData.competition === "regular" ? 0.7 : 0.95,
      },
    };

    return seasonAnalysis;
  }

  // Factor 11: Playoffs
  async processPlayoffs(gameData) {
    logger.info("🏆 Processing playoffs factor");

    const playoffsAnalysis = {
      isPlayoffs: gameData.competition === "playoffs",
      round: gameData.playoffRound || null,
      eliminationStage: gameData.isElimination || false,
      impact: {
        pressureMultiplier: gameData.competition === "playoffs" ? 2.0 : 1.0,
        intensityBoost: gameData.competition === "playoffs" ? 0.25 : 0,
        errorCostliness:
          gameData.competition === "playoffs" ? "high" : "normal",
      },
    };

    return playoffsAnalysis;
  }

  // Factor 12: World Cup
  async processWorldCup(gameData) {
    logger.info("🌍 Processing World Cup factor");

    const worldCupAnalysis = {
      isWorldCup: gameData.competition === "worldcup",
      stage: gameData.worldCupStage || null,
      nationalPride: gameData.competition === "worldcup",
      impact: {
        motivationBoost: gameData.competition === "worldcup" ? 0.3 : 0,
        pressureIntensity:
          gameData.competition === "worldcup" ? "maximum" : "normal",
        globalAttention: gameData.competition === "worldcup" ? true : false,
      },
    };

    return worldCupAnalysis;
  }

  // Impact analysis methods
  analyzeWeatherImpact(weather) {
    let impact = {
      gameStyle: "normal",
      scoringEffect: 0,
      physicalDemand: "moderate",
    };

    // Temperature impact
    if (weather.temperature < 5) {
      impact.gameStyle = "slower";
      impact.scoringEffect = -0.1;
      impact.physicalDemand = "high";
    } else if (weather.temperature > 30) {
      impact.gameStyle = "slower";
      impact.physicalDemand = "very_high";
    }

    // Wind impact
    if (weather.windSpeed > 20) {
      impact.scoringEffect = -0.05;
      impact.gameStyle = "ground_based";
    }

    // Rain impact
    if (weather.precipitation > 50) {
      impact.scoringEffect = -0.08;
      impact.gameStyle = "unpredictable";
    }

    return impact;
  }

  calculateVenueHomeAdvantage(venue) {
    let advantage = 0.58; // Base home advantage

    // Capacity effect
    if (venue.capacity > 70000) advantage += 0.05;
    if (venue.capacity < 30000) advantage -= 0.03;

    // Altitude effect
    if (venue.altitude > 2000) advantage += 0.03;

    return Math.min(Math.max(advantage, 0.45), 0.75);
  }

  analyzeTravelImpact(travel) {
    let impact = {
      awayTeamFatigue: 0,
      performanceReduction: 0,
      jetLagEffect: 0,
    };

    if (travel.distance > 1000) {
      impact.awayTeamFatigue = 0.05;
      impact.performanceReduction = 0.03;
    }

    if (travel.distance > 3000) {
      impact.jetLagEffect = 0.08;
      impact.performanceReduction = 0.05;
    }

    return impact;
  }

  // Generate predictions based on collected factors
  async generatePredictions(factors, gameData) {
    logger.info("🔮 Generating soccer predictions");

    const predictions = {
      winProbability: {
        home: 0.45,
        away: 0.35,
        draw: 0.2,
      },
      expectedScore: {
        home: 1.2,
        away: 0.9,
      },
      goals: {
        over2_5: 0.52,
        under2_5: 0.48,
      },
      cards: {
        homeTeam: 2.1,
        awayTeam: 2.3,
        total: 4.4,
      },
      corners: {
        homeTeam: 5.8,
        awayTeam: 4.2,
        total: 10.0,
      },
    };

    // Apply factor influences
    predictions.winProbability = this.applyFactorInfluences(
      predictions.winProbability,
      factors
    );
    predictions.expectedScore = this.adjustScorePrediction(
      predictions.expectedScore,
      factors
    );

    return predictions;
  }

  // Apply factor influences to win probability
  applyFactorInfluences(baseProbability, factors) {
    let homeBoost = 0;
    let awayBoost = 0;

    // Apply each factor's influence
    Object.entries(factors).forEach(([factorName, factorData]) => {
      const weight = this.factorWeights[factorName] || 0;
      const influence = this.calculateFactorInfluence(factorName, factorData);

      homeBoost += influence.home * weight;
      awayBoost += influence.away * weight;
    });

    // Adjust probabilities
    const homeProb = Math.max(
      0.1,
      Math.min(0.8, baseProbability.home + homeBoost)
    );
    const awayProb = Math.max(
      0.1,
      Math.min(0.8, baseProbability.away + awayBoost)
    );
    const drawProb = Math.max(0.1, 1 - homeProb - awayProb);

    // Normalize
    const total = homeProb + awayProb + drawProb;

    return {
      home: homeProb / total,
      away: awayProb / total,
      draw: drawProb / total,
    };
  }

  // Calculate factor influence on game outcome
  calculateFactorInfluence(factorName, factorData) {
    // Default influence
    let influence = { home: 0, away: 0 };

    switch (factorName) {
      case "venue":
        influence.home = factorData.impact?.homeTeamBoost || 0;
        break;
      case "weather":
        // Weather typically favors home team slightly due to familiarity
        influence.home = 0.02;
        break;
      case "injuries":
        influence.home = -(factorData.impact?.homeTeamWeakening || 0);
        influence.away = -(factorData.impact?.awayTeamWeakening || 0);
        break;
      case "travelDistance":
        influence.away = -(factorData.impact?.performanceReduction || 0);
        break;
      // Add more factor-specific influences
    }

    return influence;
  }

  // Calculate confidence for each factor
  calculateFactorConfidence(factor, factorData) {
    const baseConfidence = {
      referee: 0.7,
      weather: 0.9,
      venue: 0.95,
      travelDistance: 0.85,
      timeChange: 0.9,
      injuries: 0.75,
      managers: 0.8,
      managersH2HRecords: 0.7,
      nightOrDayMatch: 0.98,
      regularSeason: 0.95,
      playoffs: 0.95,
      worldCup: 0.98,
    };

    let confidence = baseConfidence[factor] || 0.75;

    // Adjust based on data quality
    if (factorData.error) confidence *= 0.3;
    if (factorData.source && factorData.source.includes("estimated"))
      confidence *= 0.7;

    return confidence;
  }

  // Calculate overall confidence
  calculateOverallConfidence(confidenceScores) {
    const scores = Object.values(confidenceScores);
    if (scores.length === 0) return 0;

    // Weighted average based on factor importance
    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(confidenceScores).forEach(([factor, confidence]) => {
      const weight = this.factorWeights[factor] || 0.05;
      weightedSum += confidence * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // Get collector status
  getStatus() {
    return {
      sport: this.sport,
      factorCount: this.factorOrder.length,
      factorOrder: this.factorOrder,
      weightsConfigured: Object.keys(this.factorWeights).length,
      status: "operational",
    };
  }
}

module.exports = { SoccerIntelligenceCollector };
