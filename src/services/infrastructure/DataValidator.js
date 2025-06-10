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
    new winston.transports.File({ filename: "logs/data-validator.log" }),
  ],
});

class DataValidator {
  constructor() {
    this.validationRules = new Map();
    this.validationStats = new Map();
    this.anomalyDetectors = new Map();
    this.confidenceThresholds = new Map();

    this.initializeValidator();
  }

  initializeValidator() {
    logger.info("🔍 Data Validator initializing...");

    // Initialize validation rules for each sport and data type
    this.setupValidationRules();

    // Initialize anomaly detection
    this.setupAnomalyDetection();

    // Initialize confidence thresholds
    this.setupConfidenceThresholds();

    // Initialize statistics tracking
    this.setupValidationStats();

    logger.info("✅ Data Validator initialized");
  }

  // Setup validation rules for different data types
  setupValidationRules() {
    // Soccer validation rules
    this.validationRules.set("soccer", {
      referee: {
        required: ["name"],
        optional: ["experience", "homeAdvantage", "cardTendency"],
        types: {
          name: "string",
          experience: "number",
          homeAdvantage: "number",
          cardTendency: "string",
        },
        ranges: {
          experience: { min: 0, max: 50 },
          homeAdvantage: { min: 0.3, max: 0.7 },
        },
        validValues: {
          cardTendency: ["strict", "moderate", "lenient"],
        },
      },
      weather: {
        required: ["temperature", "conditions"],
        optional: ["humidity", "windSpeed", "precipitation"],
        types: {
          temperature: "number",
          humidity: "number",
          windSpeed: "number",
          precipitation: "number",
          conditions: "string",
        },
        ranges: {
          temperature: { min: -20, max: 50 },
          humidity: { min: 0, max: 100 },
          windSpeed: { min: 0, max: 100 },
          precipitation: { min: 0, max: 100 },
        },
        validValues: {
          conditions: ["clear", "cloudy", "rainy", "snowy", "foggy", "stormy"],
        },
      },
      venue: {
        required: ["name", "capacity"],
        optional: ["surface", "altitude", "homeAdvantage"],
        types: {
          name: "string",
          capacity: "number",
          surface: "string",
          altitude: "number",
          homeAdvantage: "number",
        },
        ranges: {
          capacity: { min: 1000, max: 150000 },
          altitude: { min: -500, max: 5000 },
          homeAdvantage: { min: 0.4, max: 0.8 },
        },
        validValues: {
          surface: ["grass", "artificial", "hybrid"],
        },
      },
      injuries: {
        required: ["homeTeam", "awayTeam"],
        optional: [],
        types: {
          homeTeam: "object",
          awayTeam: "object",
        },
        nestedValidation: {
          homeTeam: {
            required: ["injuries", "doubtful", "suspended"],
            types: {
              injuries: "array",
              doubtful: "array",
              suspended: "array",
            },
          },
        },
      },
    });

    // Basketball validation rules
    this.validationRules.set("basketball", {
      referee: {
        required: ["name"],
        optional: ["experience", "foulCallRate", "technicalFoulRate"],
        types: {
          name: "string",
          experience: "number",
          foulCallRate: "number",
          technicalFoulRate: "number",
        },
        ranges: {
          experience: { min: 0, max: 40 },
          foulCallRate: { min: 15, max: 60 },
          technicalFoulRate: { min: 0, max: 5 },
        },
      },
      venue: {
        required: ["name", "capacity"],
        optional: ["surface", "homeAdvantage"],
        types: {
          name: "string",
          capacity: "number",
          surface: "string",
          homeAdvantage: "number",
        },
        ranges: {
          capacity: { min: 5000, max: 25000 },
          homeAdvantage: { min: 0.5, max: 0.75 },
        },
        validValues: {
          surface: ["hardwood", "synthetic"],
        },
      },
      backToBackGames: {
        required: ["homeTeamB2B", "awayTeamB2B"],
        optional: ["consecutiveGames"],
        types: {
          homeTeamB2B: "boolean",
          awayTeamB2B: "boolean",
          consecutiveGames: "object",
        },
      },
      restDays: {
        required: ["homeTeamRest", "awayTeamRest"],
        optional: ["optimalRest"],
        types: {
          homeTeamRest: "number",
          awayTeamRest: "number",
          optimalRest: "number",
        },
        ranges: {
          homeTeamRest: { min: 0, max: 10 },
          awayTeamRest: { min: 0, max: 10 },
          optimalRest: { min: 1, max: 5 },
        },
      },
    });

    // Add more sports as needed
    logger.info(
      "📋 Validation rules configured for sports:",
      Array.from(this.validationRules.keys())
    );
  }

  // Setup anomaly detection patterns
  setupAnomalyDetection() {
    this.anomalyDetectors.set("temperature", {
      seasonalRanges: {
        spring: { min: 5, max: 25 },
        summer: { min: 15, max: 40 },
        fall: { min: 0, max: 20 },
        winter: { min: -10, max: 15 },
      },
    });

    this.anomalyDetectors.set("capacity", {
      sportRanges: {
        soccer: { min: 10000, max: 100000 },
        basketball: { min: 5000, max: 25000 },
        baseball: { min: 15000, max: 60000 },
        americanFootball: { min: 30000, max: 120000 },
        hockey: { min: 8000, max: 25000 },
      },
    });

    this.anomalyDetectors.set("homeAdvantage", {
      sportRanges: {
        soccer: { min: 0.45, max: 0.75 },
        basketball: { min: 0.55, max: 0.75 },
        baseball: { min: 0.5, max: 0.7 },
        americanFootball: { min: 0.55, max: 0.8 },
        hockey: { min: 0.52, max: 0.72 },
      },
    });

    logger.info("🚨 Anomaly detection patterns configured");
  }

  // Setup confidence thresholds
  setupConfidenceThresholds() {
    this.confidenceThresholds.set("minimum", 0.3);
    this.confidenceThresholds.set("acceptable", 0.6);
    this.confidenceThresholds.set("reliable", 0.8);
    this.confidenceThresholds.set("excellent", 0.95);
  }

  // Setup validation statistics
  setupValidationStats() {
    const sports = [
      "soccer",
      "basketball",
      "baseball",
      "americanFootball",
      "hockey",
    ];

    sports.forEach((sport) => {
      this.validationStats.set(sport, {
        totalValidations: 0,
        successfulValidations: 0,
        failedValidations: 0,
        anomaliesDetected: 0,
        averageConfidence: 0,
        lastValidation: null,
      });
    });
  }

  // Main validation method
  async validateData(sport, dataType, data, source = "unknown") {
    const validationId = this.generateValidationId();

    logger.info(
      `🔍 Validating ${sport} ${dataType} data from ${source} (ID: ${validationId})`
    );

    const validation = {
      validationId,
      sport,
      dataType,
      source,
      timestamp: new Date(),
      status: "processing",
      errors: [],
      warnings: [],
      anomalies: [],
      confidence: 0,
      quality: "unknown",
    };

    try {
      // Step 1: Structure validation
      const structureValidation = await this.validateStructure(
        sport,
        dataType,
        data
      );
      validation.errors.push(...structureValidation.errors);
      validation.warnings.push(...structureValidation.warnings);

      // Step 2: Data type validation
      const typeValidation = await this.validateDataTypes(
        sport,
        dataType,
        data
      );
      validation.errors.push(...typeValidation.errors);
      validation.warnings.push(...typeValidation.warnings);

      // Step 3: Range validation
      const rangeValidation = await this.validateRanges(sport, dataType, data);
      validation.errors.push(...rangeValidation.errors);
      validation.warnings.push(...rangeValidation.warnings);

      // Step 4: Business logic validation
      const businessValidation = await this.validateBusinessLogic(
        sport,
        dataType,
        data
      );
      validation.errors.push(...businessValidation.errors);
      validation.warnings.push(...businessValidation.warnings);

      // Step 5: Anomaly detection
      const anomalyValidation = await this.detectAnomalies(
        sport,
        dataType,
        data
      );
      validation.anomalies.push(...anomalyValidation.anomalies);

      // Step 6: Calculate confidence and quality
      validation.confidence = this.calculateDataConfidence(validation, data);
      validation.quality = this.determineDataQuality(validation);

      // Update validation status
      validation.status = validation.errors.length > 0 ? "failed" : "passed";

      // Update statistics
      this.updateValidationStats(sport, validation);

      logger.info(
        `✅ Validation completed: ${validationId} - ${
          validation.status
        } (confidence: ${validation.confidence.toFixed(2)})`
      );

      return validation;
    } catch (error) {
      logger.error(`❌ Validation error: ${error.message}`);
      validation.status = "error";
      validation.errors.push(`Validation process error: ${error.message}`);
      return validation;
    }
  }

  // Validate data structure
  async validateStructure(sport, dataType, data) {
    const result = { errors: [], warnings: [] };

    const rules = this.validationRules.get(sport)?.[dataType];
    if (!rules) {
      result.warnings.push(
        `No validation rules found for ${sport} ${dataType}`
      );
      return result;
    }

    // Check required fields
    rules.required?.forEach((field) => {
      if (
        !(field in data) ||
        data[field] === null ||
        data[field] === undefined
      ) {
        result.errors.push(`Missing required field: ${field}`);
      }
    });

    // Check for unexpected fields
    const allowedFields = [
      ...(rules.required || []),
      ...(rules.optional || []),
    ];
    Object.keys(data).forEach((field) => {
      if (
        !allowedFields.includes(field) &&
        field !== "metadata" &&
        field !== "source"
      ) {
        result.warnings.push(`Unexpected field found: ${field}`);
      }
    });

    return result;
  }

  // Validate data types
  async validateDataTypes(sport, dataType, data) {
    const result = { errors: [], warnings: [] };

    const rules = this.validationRules.get(sport)?.[dataType];
    if (!rules?.types) return result;

    Object.entries(rules.types).forEach(([field, expectedType]) => {
      if (field in data) {
        const actualType = this.getDataType(data[field]);
        if (actualType !== expectedType) {
          result.errors.push(
            `Type mismatch for ${field}: expected ${expectedType}, got ${actualType}`
          );
        }
      }
    });

    return result;
  }

  // Validate value ranges
  async validateRanges(sport, dataType, data) {
    const result = { errors: [], warnings: [] };

    const rules = this.validationRules.get(sport)?.[dataType];
    if (!rules?.ranges) return result;

    Object.entries(rules.ranges).forEach(([field, range]) => {
      if (field in data && typeof data[field] === "number") {
        if (data[field] < range.min || data[field] > range.max) {
          result.errors.push(
            `Value out of range for ${field}: ${data[field]} (valid: ${range.min}-${range.max})`
          );
        }
      }
    });

    // Validate enum values
    if (rules.validValues) {
      Object.entries(rules.validValues).forEach(([field, validValues]) => {
        if (field in data && !validValues.includes(data[field])) {
          result.errors.push(
            `Invalid value for ${field}: ${
              data[field]
            } (valid: ${validValues.join(", ")})`
          );
        }
      });
    }

    return result;
  }

  // Validate business logic
  async validateBusinessLogic(sport, dataType, data) {
    const result = { errors: [], warnings: [] };

    // Sport-specific business logic validation
    switch (sport) {
      case "soccer":
        result.errors.push(...this.validateSoccerBusinessLogic(dataType, data));
        break;
      case "basketball":
        result.errors.push(
          ...this.validateBasketballBusinessLogic(dataType, data)
        );
        break;
    }

    return result;
  }

  // Soccer-specific business logic
  validateSoccerBusinessLogic(dataType, data) {
    const errors = [];

    switch (dataType) {
      case "weather":
        // Rain and high wind should affect game conditions
        if (data.precipitation > 70 && data.windSpeed > 30) {
          errors.push("Extreme weather conditions may indicate data error");
        }
        break;

      case "venue":
        // Stadium capacity should be reasonable for soccer
        if (data.capacity && (data.capacity < 5000 || data.capacity > 120000)) {
          errors.push(`Unusual stadium capacity: ${data.capacity}`);
        }
        break;

      case "referee":
        // Home advantage shouldn't be too extreme
        if (
          data.homeAdvantage &&
          (data.homeAdvantage < 0.3 || data.homeAdvantage > 0.8)
        ) {
          errors.push(`Extreme referee home advantage: ${data.homeAdvantage}`);
        }
        break;
    }

    return errors;
  }

  // Basketball-specific business logic
  validateBasketballBusinessLogic(dataType, data) {
    const errors = [];

    switch (dataType) {
      case "restDays":
        // Both teams can't have more than 7 days rest (unusual)
        if (data.homeTeamRest > 7 && data.awayTeamRest > 7) {
          errors.push("Both teams having more than 7 days rest is unusual");
        }
        break;

      case "venue":
        // Basketball arena capacity should be within typical range
        if (data.capacity && (data.capacity < 3000 || data.capacity > 30000)) {
          errors.push(`Unusual arena capacity: ${data.capacity}`);
        }
        break;

      case "backToBackGames":
        // Validate consecutive games logic
        if (data.consecutiveGames) {
          if (
            data.consecutiveGames.home > 5 ||
            data.consecutiveGames.away > 5
          ) {
            errors.push("More than 5 consecutive games is highly unusual");
          }
        }
        break;
    }

    return errors;
  }

  // Detect anomalies in data
  async detectAnomalies(sport, dataType, data) {
    const result = { anomalies: [] };

    // Temperature anomaly detection
    if (dataType === "weather" && data.temperature !== undefined) {
      const tempAnomaly = this.detectTemperatureAnomaly(data.temperature);
      if (tempAnomaly) result.anomalies.push(tempAnomaly);
    }

    // Capacity anomaly detection
    if (dataType === "venue" && data.capacity !== undefined) {
      const capacityAnomaly = this.detectCapacityAnomaly(sport, data.capacity);
      if (capacityAnomaly) result.anomalies.push(capacityAnomaly);
    }

    // Home advantage anomaly detection
    if (data.homeAdvantage !== undefined) {
      const homeAdvantageAnomaly = this.detectHomeAdvantageAnomaly(
        sport,
        data.homeAdvantage
      );
      if (homeAdvantageAnomaly) result.anomalies.push(homeAdvantageAnomaly);
    }

    // Statistical anomaly detection
    const statAnomaly = await this.detectStatisticalAnomalies(
      sport,
      dataType,
      data
    );
    if (statAnomaly) result.anomalies.push(...statAnomaly);

    return result;
  }

  // Temperature anomaly detection
  detectTemperatureAnomaly(temperature) {
    const detector = this.anomalyDetectors.get("temperature");
    const currentSeason = this.getCurrentSeason();
    const seasonRange = detector.seasonalRanges[currentSeason];

    if (
      temperature < seasonRange.min - 10 ||
      temperature > seasonRange.max + 10
    ) {
      return {
        type: "temperature",
        severity: "high",
        message: `Temperature ${temperature}°C is unusual for ${currentSeason}`,
        expected: seasonRange,
      };
    }

    return null;
  }

  // Capacity anomaly detection
  detectCapacityAnomaly(sport, capacity) {
    const detector = this.anomalyDetectors.get("capacity");
    const sportRange = detector.sportRanges[sport];

    if (!sportRange) return null;

    if (capacity < sportRange.min * 0.5 || capacity > sportRange.max * 1.5) {
      return {
        type: "capacity",
        severity: "medium",
        message: `Capacity ${capacity} is unusual for ${sport}`,
        expected: sportRange,
      };
    }

    return null;
  }

  // Calculate data confidence
  calculateDataConfidence(validation, data) {
    let confidence = 1.0;

    // Reduce confidence for errors
    confidence -= validation.errors.length * 0.15;

    // Reduce confidence for warnings
    confidence -= validation.warnings.length * 0.05;

    // Reduce confidence for anomalies
    confidence -= validation.anomalies.length * 0.1;

    // Boost confidence for complete data
    const completeness = this.calculateDataCompleteness(data);
    confidence *= completeness;

    // Boost confidence for data freshness
    if (data.timestamp || data.collectedAt) {
      const freshness = this.calculateDataFreshness(
        data.timestamp || data.collectedAt
      );
      confidence *= freshness;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Calculate data completeness
  calculateDataCompleteness(data) {
    const totalFields = Object.keys(data).length;
    const completedFields = Object.values(data).filter(
      (value) => value !== null && value !== undefined && value !== ""
    ).length;

    return totalFields > 0 ? completedFields / totalFields : 0;
  }

  // Calculate data freshness
  calculateDataFreshness(timestamp) {
    const now = new Date();
    const dataTime = new Date(timestamp);
    const ageInHours = (now - dataTime) / (1000 * 60 * 60);

    if (ageInHours <= 1) return 1.0;
    if (ageInHours <= 6) return 0.95;
    if (ageInHours <= 24) return 0.85;
    if (ageInHours <= 72) return 0.7;
    return 0.5;
  }

  // Determine data quality level
  determineDataQuality(validation) {
    const confidence = validation.confidence;
    const errorCount = validation.errors.length;
    const anomalyCount = validation.anomalies.length;

    if (errorCount > 0) return "poor";
    if (confidence >= 0.95 && anomalyCount === 0) return "excellent";
    if (confidence >= 0.8) return "good";
    if (confidence >= 0.6) return "acceptable";
    return "poor";
  }

  // Utility methods
  getDataType(value) {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";
    return typeof value;
  }

  getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "fall";
    return "winter";
  }

  generateValidationId() {
    return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update validation statistics
  updateValidationStats(sport, validation) {
    const stats = this.validationStats.get(sport);
    if (stats) {
      stats.totalValidations++;
      if (validation.status === "passed") {
        stats.successfulValidations++;
      } else {
        stats.failedValidations++;
      }
      stats.anomaliesDetected += validation.anomalies.length;
      stats.averageConfidence =
        (stats.averageConfidence * (stats.totalValidations - 1) +
          validation.confidence) /
        stats.totalValidations;
      stats.lastValidation = new Date();
    }
  }

  // Statistical anomaly detection (placeholder for advanced algorithms)
  async detectStatisticalAnomalies(sport, dataType, data) {
    // This would implement more sophisticated anomaly detection
    // using historical data patterns, machine learning models, etc.
    return [];
  }

  // Get validation status
  getValidationStatus() {
    return {
      supportedSports: Array.from(this.validationRules.keys()),
      totalValidations: Array.from(this.validationStats.values()).reduce(
        (sum, stat) => sum + stat.totalValidations,
        0
      ),
      successRate: this.calculateOverallSuccessRate(),
      averageConfidence: this.calculateOverallAverageConfidence(),
      stats: Object.fromEntries(this.validationStats),
      confidenceThresholds: Object.fromEntries(this.confidenceThresholds),
      status: "operational",
    };
  }

  calculateOverallSuccessRate() {
    const stats = Array.from(this.validationStats.values());
    const totalValidations = stats.reduce(
      (sum, stat) => sum + stat.totalValidations,
      0
    );
    const totalSuccesses = stats.reduce(
      (sum, stat) => sum + stat.successfulValidations,
      0
    );
    return totalValidations > 0 ? totalSuccesses / totalValidations : 0;
  }

  calculateOverallAverageConfidence() {
    const stats = Array.from(this.validationStats.values());
    const validStats = stats.filter((stat) => stat.totalValidations > 0);
    if (validStats.length === 0) return 0;

    const totalConfidence = validStats.reduce(
      (sum, stat) => sum + stat.averageConfidence,
      0
    );
    return totalConfidence / validStats.length;
  }
}

module.exports = { DataValidator };
