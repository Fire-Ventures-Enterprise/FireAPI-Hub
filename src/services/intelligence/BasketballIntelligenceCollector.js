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
    new winston.transports.File({
      filename: "logs/basketball-intelligence.log",
    }),
  ],
});

class BasketballIntelligenceCollector {
  constructor() {
    this.sport = "basketball";
    this.factorOrder = [
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
    ];

    this.factorWeights = this.initializeFactorWeights();
    this.predictionModels = this.initializePredictionModels();

    logger.info("🏀 Basketball Intelligence Collector initialized");
  }

  // Initialize factor weights for basketball predictions
  initializeFactorWeights() {
    return {
      referee: 0.06,
      venue: 0.12,
      travelDistance: 0.08,
      timeChange: 0.05,
      injuries: 0.25,
      coaches: 0.1,
      coachesH2HRecords: 0.07,
      backToBackGames: 0.15,
      restDays: 0.08,
      regularSeason: 0.02,
      playoffs: 0.04,
      altitude: 0.03,
    };
  }

  // Initialize prediction models
  initializePredictionModels() {
    return {
      winProbability: "advanced_neural_network",
      pointsPredictor: "gradient_boosting",
      reboundPredictor: "random_forest",
      assistPredictor: "linear_regression",
    };
  }

  // Main intelligence collection method
  async collectBasketballIntelligence(gameData, requestedFactors = null) {
    const { teams, gameDate, league, season } = gameData;

    logger.info(
      `🏀 Collecting basketball intelligence: ${teams.homeTeam} vs ${teams.awayTeam}`
    );

    const intelligence = {
      sport: this.sport,
      gameInfo: {
        homeTeam: teams.homeTeam,
        awayTeam: teams.awayTeam,
        gameDate,
        league,
        season,
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
          logger.info(`🔍 Processing basketball factor: ${factor}`);

          intelligence.factors[factor] = await this.processFactor(
            factor,
            gameData
          );
          intelligence.confidence[factor] = this.calculateFactorConfidence(
            factor,
            intelligence.factors[factor]
          );

          logger.info(
            `✅ Basketball factor processed: ${factor} (confidence: ${intelligence.confidence[
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
        `✅ Basketball intelligence collection completed with confidence: ${intelligence.metadata.overallConfidence.toFixed(
          2
        )}`
      );

      return intelligence;
    } catch (error) {
      logger.error(
        `❌ Error collecting basketball intelligence: ${error.message}`
      );
      intelligence.metadata.status = "error";
      intelligence.metadata.error = error.message;
      throw error;
    }
  }

  // Process individual factors
  async processFactor(factor, gameData) {
    logger.info(`🔍 Processing basketball factor: ${factor}`);

    switch (factor) {
      case "referee":
        return await this.processReferee(gameData);
      case "venue":
        return await this.processVenue(gameData);
      case "travelDistance":
        return await this.processTravelDistance(gameData);
      case "timeChange":
        return await this.processTimeChange(gameData);
      case "injuries":
        return await this.processInjuries(gameData);
      case "coaches":
        return await this.processCoaches(gameData);
      case "coachesH2HRecords":
        return await this.processCoachesH2H(gameData);
      case "backToBackGames":
        return await this.processBackToBack(gameData);
      case "restDays":
        return await this.processRestDays(gameData);
      case "regularSeason":
        return await this.processSeasonType(gameData);
      case "playoffs":
        return await this.processPlayoffs(gameData);
      case "altitude":
        return await this.processAltitude(gameData);
      default:
        throw new Error(`Unknown basketball factor: ${factor}`);
    }
  }

  // Factor 1: Referee Analysis
  async processReferee(gameData) {
    logger.info("👨‍⚖️ Processing referee factor");

    const refereeAnalysis = {
      name: gameData.referee?.name || "TBD",
      experience: gameData.referee?.experience || 0,
      foulCallRate: gameData.referee?.foulRate || 42.5,
      technicalFoulRate: gameData.referee?.techRate || 0.8,
      homeWhistle: 0.52, // Home team foul call advantage
      consistency: 0.78,
      impact: {
        gameFlow: "normal",
        physicalPlay: "moderate",
        homeAdvantage: 0.02,
        overtimeProb: 0.08,
      },
    };

    // Analyze referee's historical impact
    if (gameData.referee?.stats) {
      refereeAnalysis.homeWhistle = this.calculateRefereeHomeBias(
        gameData.referee.stats
      );
      refereeAnalysis.foulCallRate =
        gameData.referee.stats.avgFoulsPerGame || 42.5;
      refereeAnalysis.consistency = this.calculateRefereeConsistency(
        gameData.referee.stats
      );
    }

    refereeAnalysis.impact = this.analyzeRefereeImpact(refereeAnalysis);

    return refereeAnalysis;
  }

  // Factor 2: Venue Analysis
  async processVenue(gameData) {
    logger.info("🏟️ Processing venue factor");

    const venueAnalysis = {
      name: gameData.venue?.name || "Unknown Arena",
      capacity: gameData.venue?.capacity || 20000,
      surface: gameData.venue?.surface || "hardwood",
      rimHeight: gameData.venue?.rimHeight || 10,
      lighting: gameData.venue?.lighting || "LED",
      acoustics: gameData.venue?.acoustics || "excellent",
      homeAdvantage: 0.62, // Higher than soccer due to closer crowd
      atmosphereRating: 8.5,
      impact: {
        homeTeamBoost: 0.12,
        crowdInfluence: 0.85,
        shootingEffect: 0.02,
        intimidationFactor: 0.75,
      },
    };

    // Calculate venue-specific impacts
    venueAnalysis.impact = this.analyzeVenueImpact(venueAnalysis);

    return venueAnalysis;
  }

  // Factor 3: Travel Distance Analysis
  async processTravelDistance(gameData) {
    logger.info("✈️ Processing travel distance factor");

    const travelAnalysis = {
      distance: gameData.travel?.distance || 0,
      travelMethod: gameData.travel?.method || "flight",
      travelTime: gameData.travel?.duration || "2 hours",
      timeZonesCrossed: gameData.travel?.timeZones || 0,
      fatigueLevel: this.calculateFatigueLevel(gameData.travel?.distance || 0),
      impact: {
        awayTeamFatigue: 0,
        shootingAccuracy: 0,
        energyLevel: 1.0,
        focusReduction: 0,
      },
    };

    // Calculate travel impact (more significant in basketball due to game frequency)
    travelAnalysis.impact = this.analyzeTravelImpact(travelAnalysis);

    return travelAnalysis;
  }

  // Factor 4: Time Change Analysis
  async processTimeChange(gameData) {
    logger.info("🕐 Processing time change factor");

    const timeChangeAnalysis = {
      homeTimezone: gameData.timezone?.home || "UTC",
      awayTimezone: gameData.timezone?.away || "UTC",
      hoursDifference: gameData.timezone?.difference || 0,
      direction: gameData.timezone?.direction || "none", // east/west
      circadianDisruption: this.calculateCircadianDisruption(
        gameData.timezone?.difference || 0
      ),
      impact: {
        awayTeamDisruption: 0,
        reactionTime: 1.0,
        decisionMaking: 1.0,
        energyLevel: 1.0,
      },
    };

    timeChangeAnalysis.impact =
      this.analyzeTimeChangeImpact(timeChangeAnalysis);

    return timeChangeAnalysis;
  }

  // Factor 5: Injuries Analysis
  async processInjuries(gameData) {
    logger.info("🏥 Processing injuries factor");

    const injuryAnalysis = {
      homeTeam: {
        starPlayerInjuries: gameData.injuries?.home?.stars || [],
        roleplayers: gameData.injuries?.home?.bench || [],
        totalInjured: gameData.injuries?.home?.total || 0,
        minutesLost: gameData.injuries?.home?.minutes || 0,
        positionsAffected: gameData.injuries?.home?.positions || [],
      },
      awayTeam: {
        starPlayerInjuries: gameData.injuries?.away?.stars || [],
        roleplayers: gameData.injuries?.away?.bench || [],
        totalInjured: gameData.injuries?.away?.total || 0,
        minutesLost: gameData.injuries?.away?.minutes || 0,
        positionsAffected: gameData.injuries?.away?.positions || [],
      },
      impact: {
        homeTeamWeakening: 0,
        awayTeamWeakening: 0,
        rotationChanges: false,
        depthConcerns: false,
      },
    };

    // Analyze injury impact (critical in basketball due to smaller rosters)
    injuryAnalysis.impact = this.analyzeInjuryImpact(injuryAnalysis);

    return injuryAnalysis;
  }

  // Factor 6: Coaches Analysis
  async processCoaches(gameData) {
    logger.info("👨‍💼 Processing coaches factor");

    const coachesAnalysis = {
      homeCoach: {
        name: gameData.coaches?.home?.name || "Unknown",
        experience: gameData.coaches?.home?.experience || 0,
        winPercentage: gameData.coaches?.home?.winRate || 0.5,
        playoffExperience: gameData.coaches?.home?.playoffWins || 0,
        timeoutStrategy: gameData.coaches?.home?.timeoutUse || "average",
        adjustmentRating: gameData.coaches?.home?.adjustments || 7.0,
      },
      awayCoach: {
        name: gameData.coaches?.away?.name || "Unknown",
        experience: gameData.coaches?.away?.experience || 0,
        winPercentage: gameData.coaches?.away?.winRate || 0.5,
        playoffExperience: gameData.coaches?.away?.playoffWins || 0,
        timeoutStrategy: gameData.coaches?.away?.timeoutUse || "average",
        adjustmentRating: gameData.coaches?.away?.adjustments || 7.0,
      },
      impact: {
        tacticalAdvantage: "neutral",
        timeoutEffectiveness: "average",
        clutchCoaching: "neutral",
        playerDevelopment: "equal",
      },
    };

    coachesAnalysis.impact = this.analyzeCoachingImpact(coachesAnalysis);

    return coachesAnalysis;
  }

  // Factor 7: Coaches H2H Records
  async processCoachesH2H(gameData) {
    logger.info("📊 Processing coaches H2H records");

    const h2hAnalysis = {
      totalMeetings: gameData.coachesH2H?.total || 0,
      homeCoachWins: gameData.coachesH2H?.homeWins || 0,
      awayCoachWins: gameData.coachesH2H?.awayWins || 0,
      averagePointDiff: gameData.coachesH2H?.avgDiff || 0,
      closeGames: gameData.coachesH2H?.closeGames || 0,
      psychologicalEdge: "neutral",
      impact: {
        mentalAdvantage: "neutral",
        tacticalFamiliarity: 0.5,
        strategyPreparation: "equal",
        confidenceLevel: 0.5,
      },
    };

    h2hAnalysis.impact = this.analyzeCoachH2HImpact(h2hAnalysis);

    return h2hAnalysis;
  }

  // Factor 8: Back-to-Back Games Analysis
  async processBackToBack(gameData) {
    logger.info("⏰ Processing back-to-back games factor");

    const b2bAnalysis = {
      homeTeamB2B: gameData.schedule?.homeB2B || false,
      awayTeamB2B: gameData.schedule?.awayB2B || false,
      consecutiveGames: {
        home: gameData.schedule?.homeConsecutive || 0,
        away: gameData.schedule?.awayConsecutive || 0,
      },
      previousGameIntensity: {
        home: gameData.schedule?.homePrevIntensity || "normal",
        away: gameData.schedule?.awayPrevIntensity || "normal",
      },
      impact: {
        homeTeamFatigue: 0,
        awayTeamFatigue: 0,
        shootingAccuracy: { home: 1.0, away: 1.0 },
        defensiveIntensity: { home: 1.0, away: 1.0 },
        benchUtilization: { home: "normal", away: "normal" },
      },
    };

    // Back-to-back games have significant impact in basketball
    b2bAnalysis.impact = this.analyzeBackToBackImpact(b2bAnalysis);

    return b2bAnalysis;
  }

  // Factor 9: Rest Days Analysis
  async processRestDays(gameData) {
    logger.info("😴 Processing rest days factor");

    const restAnalysis = {
      homeTeamRest: gameData.schedule?.homeRest || 1,
      awayTeamRest: gameData.schedule?.awayRest || 1,
      optimalRest: 2, // NBA optimal rest days
      restAdvantage: "neutral",
      impact: {
        energyLevel: { home: 1.0, away: 1.0 },
        freshness: { home: "normal", away: "normal" },
        injuryRisk: { home: "normal", away: "normal" },
        performanceBoost: { home: 0, away: 0 },
      },
    };

    restAnalysis.impact = this.analyzeRestImpact(restAnalysis);

    return restAnalysis;
  }

  // Factor 10: Regular Season Analysis
  async processSeasonType(gameData) {
    logger.info("📅 Processing season type");

    const seasonAnalysis = {
      isRegularSeason: gameData.season?.type === "regular",
      gamesPlayed: gameData.season?.gamesPlayed || 1,
      gamesRemaining: gameData.season?.gamesRemaining || 81,
      seasonStage: this.determineSeasonStage(gameData.season?.gamesPlayed || 1),
      playoffRace: gameData.season?.playoffContention || false,
      impact: {
        motivationLevel: this.calculateMotivationLevel(gameData.season),
        effortLevel: 0.75,
        rotationStrategy: "normal",
        riskTolerance: "moderate",
      },
    };

    return seasonAnalysis;
  }

  // Factor 11: Playoffs Analysis
  async processPlayoffs(gameData) {
    logger.info("🏆 Processing playoffs factor");

    const playoffsAnalysis = {
      isPlayoffs: gameData.season?.type === "playoffs",
      round: gameData.playoff?.round || null,
      gameNumber: gameData.playoff?.game || null,
      seriesScore: gameData.playoff?.series || null,
      eliminationGame: gameData.playoff?.elimination || false,
      impact: {
        intensityMultiplier: gameData.season?.type === "playoffs" ? 1.5 : 1.0,
        pressureLevel:
          gameData.season?.type === "playoffs" ? "maximum" : "normal",
        clutchFactor: gameData.season?.type === "playoffs" ? 1.3 : 1.0,
        experienceAdvantage: "neutral",
      },
    };

    return playoffsAnalysis;
  }

  // Factor 12: Altitude Analysis
  async processAltitude(gameData) {
    logger.info("⛰️ Processing altitude factor");

    const altitudeAnalysis = {
      venueAltitude: gameData.venue?.altitude || 0,
      homeTeamAcclimation: true,
      awayTeamAcclimation: this.calculateAcclimation(
        gameData.teams?.awayTeam,
        gameData.venue?.altitude || 0
      ),
      oxygenLevel: this.calculateOxygenLevel(gameData.venue?.altitude || 0),
      impact: {
        enduranceEffect: 0,
        shootingAccuracy: 0,
        ballFlight: "normal",
        fatigueFactor: 1.0,
      },
    };

    altitudeAnalysis.impact = this.analyzeAltitudeImpact(altitudeAnalysis);

    return altitudeAnalysis;
  }

  // Impact analysis methods
  analyzeRefereeImpact(referee) {
    let impact = {
      gameFlow: "normal",
      physicalPlay: "moderate",
      homeAdvantage: 0.02,
      overtimeProb: 0.08,
    };

    if (referee.foulCallRate > 45) {
      impact.gameFlow = "slow";
      impact.physicalPlay = "limited";
    } else if (referee.foulCallRate < 40) {
      impact.gameFlow = "fast";
      impact.physicalPlay = "physical";
    }

    impact.homeAdvantage = (referee.homeWhistle - 0.5) * 0.1;

    return impact;
  }

  analyzeVenueImpact(venue) {
    let impact = {
      homeTeamBoost: 0.12,
      crowdInfluence: 0.85,
      shootingEffect: 0.02,
      intimidationFactor: 0.75,
    };

    // Capacity effect
    if (venue.capacity > 18000) {
      impact.crowdInfluence += 0.1;
      impact.intimidationFactor += 0.1;
    }

    // Acoustics effect
    if (venue.acoustics === "excellent") {
      impact.homeTeamBoost += 0.02;
    }

    return impact;
  }

  analyzeBackToBackImpact(b2b) {
    let impact = {
      homeTeamFatigue: 0,
      awayTeamFatigue: 0,
      shootingAccuracy: { home: 1.0, away: 1.0 },
      defensiveIntensity: { home: 1.0, away: 1.0 },
    };

    if (b2b.homeTeamB2B) {
      impact.homeTeamFatigue = 0.15;
      impact.shootingAccuracy.home = 0.93;
      impact.defensiveIntensity.home = 0.88;
    }

    if (b2b.awayTeamB2B) {
      impact.awayTeamFatigue = 0.15;
      impact.shootingAccuracy.away = 0.93;
      impact.defensiveIntensity.away = 0.88;
    }

    return impact;
  }

  analyzeRestImpact(rest) {
    let impact = {
      energyLevel: { home: 1.0, away: 1.0 },
      freshness: { home: "normal", away: "normal" },
      performanceBoost: { home: 0, away: 0 },
    };

    // More than 3 days rest can cause rust
    if (rest.homeTeamRest > 3) {
      impact.energyLevel.home = 0.98; // Slight rust effect
    } else if (rest.homeTeamRest >= 2) {
      impact.energyLevel.home = 1.05; // Optimal rest
      impact.performanceBoost.home = 0.03;
    }

    if (rest.awayTeamRest > 3) {
      impact.energyLevel.away = 0.98;
    } else if (rest.awayTeamRest >= 2) {
      impact.energyLevel.away = 1.05;
      impact.performanceBoost.away = 0.03;
    }

    return impact;
  }

  // Generate predictions based on collected factors
  async generatePredictions(factors, gameData) {
    logger.info("🔮 Generating basketball predictions");

    const predictions = {
      winProbability: {
        home: 0.55,
        away: 0.45,
      },
      pointsTotal: {
        over: 0.52,
        under: 0.48,
        total: 215.5,
      },
      spread: {
        home: -3.5,
        confidence: 0.72,
      },
      performance: {
        homePoints: 109.2,
        awayPoints: 105.7,
        pace: 98.5,
        efficiency: "normal",
      },
    };

    // Apply factor influences
    predictions.winProbability = this.applyFactorInfluences(
      predictions.winProbability,
      factors
    );
    predictions.pointsTotal = this.adjustPointsPrediction(
      predictions.pointsTotal,
      factors
    );

    return predictions;
  }

  // Apply factor influences to win probability
  applyFactorInfluences(baseProbability, factors) {
    let homeBoost = 0;
    let awayBoost = 0;

    Object.entries(factors).forEach(([factorName, factorData]) => {
      const weight = this.factorWeights[factorName] || 0;
      const influence = this.calculateFactorInfluence(factorName, factorData);

      homeBoost += influence.home * weight;
      awayBoost += influence.away * weight;
    });

    const homeProb = Math.max(
      0.15,
      Math.min(0.85, baseProbability.home + homeBoost)
    );
    const awayProb = Math.max(0.15, 1 - homeProb);

    return { home: homeProb, away: awayProb };
  }

  // Calculate factor influence on game outcome
  calculateFactorInfluence(factorName, factorData) {
    let influence = { home: 0, away: 0 };

    switch (factorName) {
      case "venue":
        influence.home = factorData.impact?.homeTeamBoost || 0;
        break;
      case "backToBackGames":
        influence.home = -(factorData.impact?.homeTeamFatigue || 0);
        influence.away = -(factorData.impact?.awayTeamFatigue || 0);
        break;
      case "restDays":
        influence.home = factorData.impact?.performanceBoost?.home || 0;
        influence.away = factorData.impact?.performanceBoost?.away || 0;
        break;
      case "injuries":
        influence.home = -(factorData.impact?.homeTeamWeakening || 0);
        influence.away = -(factorData.impact?.awayTeamWeakening || 0);
        break;
    }

    return influence;
  }

  // Utility methods
  calculateFatigueLevel(distance) {
    if (distance < 500) return "minimal";
    if (distance < 1500) return "low";
    if (distance < 2500) return "moderate";
    return "high";
  }

  calculateCircadianDisruption(hoursDiff) {
    if (Math.abs(hoursDiff) <= 1) return "none";
    if (Math.abs(hoursDiff) <= 2) return "mild";
    if (Math.abs(hoursDiff) <= 3) return "moderate";
    return "severe";
  }

  determineSeasonStage(gamesPlayed) {
    if (gamesPlayed <= 20) return "early";
    if (gamesPlayed <= 60) return "middle";
    return "late";
  }

  // Calculate confidence for each factor
  calculateFactorConfidence(factor, factorData) {
    const baseConfidence = {
      referee: 0.75,
      venue: 0.95,
      travelDistance: 0.9,
      timeChange: 0.88,
      injuries: 0.8,
      coaches: 0.85,
      coachesH2HRecords: 0.7,
      backToBackGames: 0.98,
      restDays: 0.95,
      regularSeason: 0.98,
      playoffs: 0.95,
      altitude: 0.9,
    };

    let confidence = baseConfidence[factor] || 0.75;

    if (factorData.error) confidence *= 0.3;
    if (factorData.estimated) confidence *= 0.7;

    return confidence;
  }

  // Calculate overall confidence
  calculateOverallConfidence(confidenceScores) {
    const scores = Object.values(confidenceScores);
    if (scores.length === 0) return 0;

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

module.exports = { BasketballIntelligenceCollector };
