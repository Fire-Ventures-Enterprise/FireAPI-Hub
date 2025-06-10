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
    new winston.transports.File({ filename: "logs/source-monitor.log" }),
  ],
});

class SourceMonitor {
  constructor() {
    this.sources = new Map();
    this.healthMetrics = new Map();
    this.performanceHistory = new Map();
    this.alertThresholds = new Map();
    this.monitoringIntervals = new Map();
    this.alertCallbacks = new Set();

    this.initializeMonitor();
  }

  initializeMonitor() {
    logger.info("📊 Source Monitor initializing...");

    // Initialize data sources
    this.initializeDataSources();

    // Setup alert thresholds
    this.setupAlertThresholds();

    // Start monitoring services
    this.startMonitoring();

    // Setup automated health checks
    this.setupHealthChecks();

    logger.info("✅ Source Monitor initialized");
  }

  // Initialize monitored data sources
  initializeDataSources() {
    const sources = [
      // Sports data sources
      {
        id: "espn",
        name: "ESPN",
        baseUrl: "https://www.espn.com",
        type: "sports",
        priority: "high",
        dataTypes: ["scores", "schedules", "rosters", "injuries", "stats"],
        rateLimit: 60, // requests per minute
        timeout: 10000,
        expectedResponseTime: 2000,
      },
      {
        id: "sportsreference",
        name: "Sports Reference",
        baseUrl: "https://www.sports-reference.com",
        type: "sports",
        priority: "high",
        dataTypes: ["historical_stats", "advanced_metrics", "team_info"],
        rateLimit: 30,
        timeout: 15000,
        expectedResponseTime: 3000,
      },
      {
        id: "nba_official",
        name: "NBA Official",
        baseUrl: "https://www.nba.com",
        type: "sports",
        priority: "medium",
        dataTypes: ["schedules", "player_stats", "team_stats"],
        rateLimit: 40,
        timeout: 12000,
        expectedResponseTime: 2500,
      },
      {
        id: "fifa_official",
        name: "FIFA Official",
        baseUrl: "https://www.fifa.com",
        type: "sports",
        priority: "medium",
        dataTypes: ["tournaments", "rankings", "fixtures"],
        rateLimit: 20,
        timeout: 10000,
        expectedResponseTime: 3000,
      },

      // Weather data sources
      {
        id: "weather_com",
        name: "Weather.com",
        baseUrl: "https://weather.com",
        type: "weather",
        priority: "high",
        dataTypes: ["current_weather", "forecasts", "alerts"],
        rateLimit: 100,
        timeout: 8000,
        expectedResponseTime: 1500,
      },
      {
        id: "openweather",
        name: "OpenWeatherMap",
        baseUrl: "https://api.openweathermap.org",
        type: "weather",
        priority: "medium",
        dataTypes: ["current_weather", "forecasts"],
        rateLimit: 60,
        timeout: 5000,
        expectedResponseTime: 1000,
      },

      // News and information sources
      {
        id: "sports_news",
        name: "Sports News Sites",
        baseUrl: "https://news.google.com",
        type: "news",
        priority: "low",
        dataTypes: ["injury_reports", "team_news", "breaking_news"],
        rateLimit: 50,
        timeout: 10000,
        expectedResponseTime: 2000,
      },

      // Venue and travel sources
      {
        id: "venue_data",
        name: "Venue Information",
        baseUrl: "https://various-venue-sources.com",
        type: "venue",
        priority: "medium",
        dataTypes: ["stadium_info", "capacity", "location"],
        rateLimit: 30,
        timeout: 8000,
        expectedResponseTime: 2500,
      },
    ];

    sources.forEach((source) => {
      this.sources.set(source.id, {
        ...source,
        status: "unknown",
        lastCheck: null,
        consecutiveFailures: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastResponseTime: 0,
        reliability: 1.0,
        healthScore: 100,
        isActive: true,
      });

      // Initialize health metrics
      this.healthMetrics.set(source.id, {
        uptime: 0,
        downtime: 0,
        responseTimeHistory: [],
        errorHistory: [],
        lastErrors: [],
        performanceTrend: "stable",
      });

      // Initialize performance history
      this.performanceHistory.set(source.id, {
        hourly: new Array(24)
          .fill(null)
          .map(() => ({ requests: 0, failures: 0, avgResponseTime: 0 })),
        daily: new Array(30)
          .fill(null)
          .map(() => ({ requests: 0, failures: 0, avgResponseTime: 0 })),
        currentHour: new Date().getHours(),
        currentDay: new Date().getDate(),
      });
    });

    logger.info(`📋 Initialized monitoring for ${sources.length} data sources`);
  }

  // Setup alert thresholds
  setupAlertThresholds() {
    this.alertThresholds.set("response_time", {
      warning: 5000, // 5 seconds
      critical: 10000, // 10 seconds
    });

    this.alertThresholds.set("failure_rate", {
      warning: 0.1, // 10% failure rate
      critical: 0.25, // 25% failure rate
    });

    this.alertThresholds.set("consecutive_failures", {
      warning: 3,
      critical: 5,
    });

    this.alertThresholds.set("health_score", {
      warning: 70,
      critical: 50,
    });

    this.alertThresholds.set("reliability", {
      warning: 0.8, // 80%
      critical: 0.6, // 60%
    });

    logger.info("⚠️ Alert thresholds configured");
  }

  // Start monitoring services
  startMonitoring() {
    // Monitor every 5 minutes
    cron.schedule("*/5 * * * *", () => {
      this.performHealthChecks();
    });

    // Generate reports every hour
    cron.schedule("0 * * * *", () => {
      this.generateHourlyReport();
    });

    // Daily cleanup and analytics
    cron.schedule("0 0 * * *", () => {
      this.performDailyMaintenance();
    });

    logger.info("⏰ Monitoring schedules configured");
  }

  // Setup health checks
  setupHealthChecks() {
    // Quick health check every minute for high-priority sources
    cron.schedule("* * * * *", () => {
      this.quickHealthCheck();
    });

    logger.info("🏥 Health check schedules configured");
  }

  // Record a data source request
  recordRequest(sourceId, success, responseTime, error = null) {
    const source = this.sources.get(sourceId);
    if (!source) {
      logger.warn(`⚠️ Unknown source: ${sourceId}`);
      return;
    }

    // Update source metrics
    source.totalRequests++;
    source.lastResponseTime = responseTime;
    source.lastCheck = new Date();

    if (success) {
      source.successfulRequests++;
      source.consecutiveFailures = 0;
      source.status = "healthy";
    } else {
      source.failedRequests++;
      source.consecutiveFailures++;
      source.status = "unhealthy";

      // Record error
      const healthMetrics = this.healthMetrics.get(sourceId);
      if (healthMetrics) {
        healthMetrics.lastErrors.push({
          timestamp: new Date(),
          error: error || "Unknown error",
          responseTime,
        });

        // Keep only last 10 errors
        if (healthMetrics.lastErrors.length > 10) {
          healthMetrics.lastErrors.shift();
        }
      }
    }

    // Update average response time
    source.averageResponseTime =
      (source.averageResponseTime * (source.totalRequests - 1) + responseTime) /
      source.totalRequests;

    // Update reliability
    source.reliability =
      source.totalRequests > 0
        ? source.successfulRequests / source.totalRequests
        : 1.0;

    // Update health score
    source.healthScore = this.calculateHealthScore(sourceId);

    // Update performance history
    this.updatePerformanceHistory(sourceId, success, responseTime);

    // Check for alerts
    this.checkAlerts(sourceId);

    logger.debug(
      `📊 Recorded request for ${sourceId}: ${
        success ? "success" : "failure"
      } (${responseTime}ms)`
    );
  }

  // Calculate health score
  calculateHealthScore(sourceId) {
    const source = this.sources.get(sourceId);
    if (!source) return 0;

    let score = 100;

    // Reliability factor (60% weight)
    score *= source.reliability * 0.6 + 0.4;

    // Response time factor (20% weight)
    const responseTimeFactor = Math.max(
      0,
      1 - source.averageResponseTime / source.expectedResponseTime
    );
    score *= responseTimeFactor * 0.2 + 0.8;

    // Consecutive failures penalty (20% weight)
    const failurePenalty = Math.min(source.consecutiveFailures * 0.1, 0.5);
    score *= 1 - failurePenalty;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Update performance history
  updatePerformanceHistory(sourceId, success, responseTime) {
    const history = this.performanceHistory.get(sourceId);
    if (!history) return;

    const currentHour = new Date().getHours();
    const currentDay = new Date().getDate();

    // Update hourly data
    if (history.currentHour !== currentHour) {
      // Move to next hour
      history.hourly.shift();
      history.hourly.push({ requests: 0, failures: 0, avgResponseTime: 0 });
      history.currentHour = currentHour;
    }

    const hourlyData = history.hourly[history.hourly.length - 1];
    hourlyData.requests++;
    if (!success) hourlyData.failures++;
    hourlyData.avgResponseTime =
      (hourlyData.avgResponseTime * (hourlyData.requests - 1) + responseTime) /
      hourlyData.requests;

    // Update daily data
    if (history.currentDay !== currentDay) {
      // Move to next day
      history.daily.shift();
      history.daily.push({ requests: 0, failures: 0, avgResponseTime: 0 });
      history.currentDay = currentDay;
    }

    const dailyData = history.daily[history.daily.length - 1];
    dailyData.requests++;
    if (!success) dailyData.failures++;
    dailyData.avgResponseTime =
      (dailyData.avgResponseTime * (dailyData.requests - 1) + responseTime) /
      dailyData.requests;
  }

  // Perform health checks on all sources
  async performHealthChecks() {
    logger.info("🏥 Performing comprehensive health checks...");

    const healthCheckPromises = Array.from(this.sources.keys()).map(
      (sourceId) => this.checkSourceHealth(sourceId)
    );

    const results = await Promise.allSettled(healthCheckPromises);

    let healthyCount = 0;
    let unhealthyCount = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.healthy) {
        healthyCount++;
      } else {
        unhealthyCount++;
      }
    });

    logger.info(
      `🏥 Health check completed: ${healthyCount} healthy, ${unhealthyCount} unhealthy sources`
    );
  }

  // Quick health check for high-priority sources
  async quickHealthCheck() {
    const highPrioritySources = Array.from(this.sources.values())
      .filter((source) => source.priority === "high" && source.isActive)
      .map((source) => source.id);

    for (const sourceId of highPrioritySources) {
      try {
        await this.checkSourceHealth(sourceId, true);
      } catch (error) {
        logger.warn(
          `⚠️ Quick health check failed for ${sourceId}: ${error.message}`
        );
      }
    }
  }

  // Check individual source health
  async checkSourceHealth(sourceId, isQuickCheck = false) {
    const source = this.sources.get(sourceId);
    if (!source) return { healthy: false, error: "Source not found" };

    try {
      const startTime = Date.now();

      // Simple HTTP GET to check if source is responsive
      const response = await this.makeHealthCheckRequest(source);

      const responseTime = Date.now() - startTime;
      const healthy = response.status >= 200 && response.status < 400;

      // Record the health check
      this.recordRequest(sourceId, healthy, responseTime);

      return {
        healthy,
        responseTime,
        status: response.status,
        isQuickCheck,
      };
    } catch (error) {
      const responseTime = Date.now() - Date.now();
      this.recordRequest(sourceId, false, responseTime, error.message);

      return {
        healthy: false,
        error: error.message,
        isQuickCheck,
      };
    }
  }

  // Make health check request (simplified for monitoring)
  async makeHealthCheckRequest(source) {
    // This would use the ProxyManager for actual requests
    // Simplified for monitoring purposes
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Health check timeout"));
      }, source.timeout);

      // Simulate health check response
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({ status: 200 });
      }, Math.random() * 1000 + 500);
    });
  }

  // Check for alerts
  checkAlerts(sourceId) {
    const source = this.sources.get(sourceId);
    if (!source) return;

    const alerts = [];

    // Response time alerts
    const responseThresholds = this.alertThresholds.get("response_time");
    if (source.lastResponseTime > responseThresholds.critical) {
      alerts.push({
        type: "response_time",
        severity: "critical",
        message: `Response time ${source.lastResponseTime}ms exceeds critical threshold`,
        sourceId,
        value: source.lastResponseTime,
        threshold: responseThresholds.critical,
      });
    } else if (source.lastResponseTime > responseThresholds.warning) {
      alerts.push({
        type: "response_time",
        severity: "warning",
        message: `Response time ${source.lastResponseTime}ms exceeds warning threshold`,
        sourceId,
        value: source.lastResponseTime,
        threshold: responseThresholds.warning,
      });
    }

    // Consecutive failures alerts
    const failureThresholds = this.alertThresholds.get("consecutive_failures");
    if (source.consecutiveFailures >= failureThresholds.critical) {
      alerts.push({
        type: "consecutive_failures",
        severity: "critical",
        message: `${source.consecutiveFailures} consecutive failures detected`,
        sourceId,
        value: source.consecutiveFailures,
        threshold: failureThresholds.critical,
      });
    } else if (source.consecutiveFailures >= failureThresholds.warning) {
      alerts.push({
        type: "consecutive_failures",
        severity: "warning",
        message: `${source.consecutiveFailures} consecutive failures detected`,
        sourceId,
        value: source.consecutiveFailures,
        threshold: failureThresholds.warning,
      });
    }

    // Health score alerts
    const healthThresholds = this.alertThresholds.get("health_score");
    if (source.healthScore <= healthThresholds.critical) {
      alerts.push({
        type: "health_score",
        severity: "critical",
        message: `Health score ${source.healthScore} is critically low`,
        sourceId,
        value: source.healthScore,
        threshold: healthThresholds.critical,
      });
    } else if (source.healthScore <= healthThresholds.warning) {
      alerts.push({
        type: "health_score",
        severity: "warning",
        message: `Health score ${source.healthScore} is below warning threshold`,
        sourceId,
        value: source.healthScore,
        threshold: healthThresholds.warning,
      });
    }

    // Trigger alerts
    alerts.forEach((alert) => this.triggerAlert(alert));
  }

  // Trigger alert
  triggerAlert(alert) {
    logger.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);

    // Call registered alert callbacks
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        logger.error(`❌ Alert callback error: ${error.message}`);
      }
    });
  }

  // Generate hourly report
  generateHourlyReport() {
    logger.info("📊 Generating hourly monitoring report...");

    const report = {
      timestamp: new Date(),
      period: "hourly",
      sources: {},
      summary: {
        totalSources: this.sources.size,
        healthySources: 0,
        unhealthySources: 0,
        averageHealthScore: 0,
        averageResponseTime: 0,
        totalRequests: 0,
      },
    };

    let totalHealthScore = 0;
    let totalResponseTime = 0;
    let totalRequests = 0;

    this.sources.forEach((source, sourceId) => {
      const isHealthy =
        source.status === "healthy" && source.consecutiveFailures === 0;

      if (isHealthy) {
        report.summary.healthySources++;
      } else {
        report.summary.unhealthySources++;
      }

      totalHealthScore += source.healthScore;
      totalResponseTime += source.averageResponseTime;
      totalRequests += source.totalRequests;

      report.sources[sourceId] = {
        name: source.name,
        status: source.status,
        healthScore: source.healthScore,
        reliability: source.reliability,
        averageResponseTime: source.averageResponseTime,
        totalRequests: source.totalRequests,
        consecutiveFailures: source.consecutiveFailures,
      };
    });

    report.summary.averageHealthScore = Math.round(
      totalHealthScore / this.sources.size
    );
    report.summary.averageResponseTime = Math.round(
      totalResponseTime / this.sources.size
    );
    report.summary.totalRequests = totalRequests;

    logger.info(
      `📊 Hourly report: ${report.summary.healthySources}/${report.summary.totalSources} sources healthy, avg health score: ${report.summary.averageHealthScore}`
    );

    return report;
  }

  // Perform daily maintenance
  performDailyMaintenance() {
    logger.info("🧹 Performing daily maintenance...");

    // Clean up old performance data
    this.cleanupPerformanceHistory();

    // Reset daily counters
    this.resetDailyCounters();

    // Generate daily analytics
    this.generateDailyAnalytics();

    logger.info("✅ Daily maintenance completed");
  }

  // Cleanup old performance history
  cleanupPerformanceHistory() {
    this.healthMetrics.forEach((metrics, sourceId) => {
      // Keep only last 100 response times
      if (metrics.responseTimeHistory.length > 100) {
        metrics.responseTimeHistory = metrics.responseTimeHistory.slice(-100);
      }

      // Keep only last 50 errors
      if (metrics.errorHistory.length > 50) {
        metrics.errorHistory = metrics.errorHistory.slice(-50);
      }
    });
  }

  // Reset daily counters
  resetDailyCounters() {
    // Reset any daily-specific counters if needed
    logger.info("🔄 Daily counters reset");
  }

  // Generate daily analytics
  generateDailyAnalytics() {
    const analytics = {
      date: new Date().toISOString().split("T")[0],
      topPerformingSources: this.getTopPerformingSources(),
      worstPerformingSources: this.getWorstPerformingSources(),
      reliabilityTrends: this.calculateReliabilityTrends(),
      responseTimeTrends: this.calculateResponseTimeTrends(),
    };

    logger.info(
      "📈 Daily analytics generated:",
      JSON.stringify(analytics, null, 2)
    );
    return analytics;
  }

  // Get top performing sources
  getTopPerformingSources(count = 5) {
    return Array.from(this.sources.values())
      .sort((a, b) => b.healthScore - a.healthScore)
      .slice(0, count)
      .map((source) => ({
        id: source.id,
        name: source.name,
        healthScore: source.healthScore,
        reliability: source.reliability,
      }));
  }

  // Get worst performing sources
  getWorstPerformingSources(count = 5) {
    return Array.from(this.sources.values())
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, count)
      .map((source) => ({
        id: source.id,
        name: source.name,
        healthScore: source.healthScore,
        reliability: source.reliability,
        consecutiveFailures: source.consecutiveFailures,
      }));
  }

  // Register alert callback
  registerAlertCallback(callback) {
    this.alertCallbacks.add(callback);
    logger.info("📞 Alert callback registered");
  }

  // Unregister alert callback
  unregisterAlertCallback(callback) {
    this.alertCallbacks.delete(callback);
    logger.info("📞 Alert callback unregistered");
  }

  // Get monitoring status
  getMonitoringStatus() {
    const healthySources = Array.from(this.sources.values()).filter(
      (s) => s.status === "healthy"
    ).length;
    const totalSources = this.sources.size;

    return {
      totalSources,
      healthySources,
      unhealthySources: totalSources - healthySources,
      overallHealthPercentage: Math.round(
        (healthySources / totalSources) * 100
      ),
      averageHealthScore: Math.round(
        Array.from(this.sources.values()).reduce(
          (sum, s) => sum + s.healthScore,
          0
        ) / totalSources
      ),
      monitoringActive: true,
      lastUpdate: new Date(),
      sources: Object.fromEntries(
        Array.from(this.sources.entries()).map(([id, source]) => [
          id,
          {
            name: source.name,
            status: source.status,
            healthScore: source.healthScore,
            reliability: source.reliability,
            lastCheck: source.lastCheck,
          },
        ])
      ),
    };
  }

  // Placeholder methods for analytics
  calculateReliabilityTrends() {
    return {};
  }
  calculateResponseTimeTrends() {
    return {};
  }
}

module.exports = { SourceMonitor };
