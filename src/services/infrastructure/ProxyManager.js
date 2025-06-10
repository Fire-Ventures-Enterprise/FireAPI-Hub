const axios = require("axios");
const winston = require("winston");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { HttpProxyAgent } = require("http-proxy-agent");

// Configure logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/proxy-manager.log" }),
  ],
});

class ProxyManager {
  constructor() {
    this.proxies = new Map();
    this.healthyProxies = new Set();
    this.bannedProxies = new Set();
    this.currentProxyIndex = 0;
    this.rotationInterval = 5 * 60 * 1000; // 5 minutes
    this.healthCheckInterval = 10 * 60 * 1000; // 10 minutes
    this.maxFailures = 3;
    this.proxyFailures = new Map();

    this.userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];

    this.initializeProxyManager();
  }

  async initializeProxyManager() {
    logger.info("🔄 Proxy Manager initializing...");

    try {
      // Load proxy configuration
      await this.loadProxyConfiguration();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start proxy rotation
      this.startProxyRotation();

      logger.info(
        `✅ Proxy Manager initialized with ${this.proxies.size} proxies`
      );
    } catch (error) {
      logger.error(`❌ Failed to initialize Proxy Manager: ${error.message}`);
      throw error;
    }
  }

  // Load proxy configuration
  async loadProxyConfiguration() {
    // Free proxy sources (for development/testing)
    const freeProxySources = [
      "https://www.proxy-list.download/api/v1/get?type=http",
      "https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all",
    ];

    // Premium proxy providers (configure based on your choice)
    const premiumProviders = {
      oxylabs: {
        endpoint: "https://residential.oxylabs.io:8001",
        auth: {
          username: process.env.OXYLABS_USER,
          password: process.env.OXYLABS_PASS,
        },
      },
      brightdata: {
        endpoint: "https://brd-customer-hl_username.zone-residential:22225",
        auth: {
          username: process.env.BRIGHTDATA_USER,
          password: process.env.BRIGHTDATA_PASS,
        },
      },
      smartproxy: {
        endpoint: "https://gate.smartproxy.com:7000",
        auth: {
          username: process.env.SMARTPROXY_USER,
          password: process.env.SMARTPROXY_PASS,
        },
      },
    };

    // Load proxies based on configuration
    if (process.env.PROXY_PROVIDER === "premium") {
      await this.loadPremiumProxies(premiumProviders);
    } else {
      await this.loadFreeProxies(freeProxySources);
    }

    // Add direct connection as fallback
    this.addDirectConnection();
  }

  // Load premium proxy providers
  async loadPremiumProxies(providers) {
    logger.info("💎 Loading premium proxy providers...");

    Object.entries(providers).forEach(([provider, config]) => {
      if (config.auth.username && config.auth.password) {
        const proxyId = `${provider}_premium`;
        this.proxies.set(proxyId, {
          id: proxyId,
          type: "premium",
          provider,
          endpoint: config.endpoint,
          auth: config.auth,
          protocol: "https",
          status: "active",
          lastUsed: null,
          successCount: 0,
          failureCount: 0,
          responseTime: 0,
        });

        this.healthyProxies.add(proxyId);
        logger.info(`✅ Added premium proxy: ${provider}`);
      }
    });
  }

  // Load free proxies for development
  async loadFreeProxies(sources) {
    logger.info("🆓 Loading free proxy sources...");

    for (const source of sources) {
      try {
        const response = await axios.get(source, { timeout: 10000 });
        const proxies = this.parseFreeProxyList(response.data, source);

        proxies.forEach((proxy) => {
          const proxyId = `${proxy.host}:${proxy.port}`;
          this.proxies.set(proxyId, {
            id: proxyId,
            type: "free",
            host: proxy.host,
            port: proxy.port,
            protocol: proxy.protocol || "http",
            status: "untested",
            lastUsed: null,
            successCount: 0,
            failureCount: 0,
            responseTime: 0,
            source,
          });
        });

        logger.info(`📥 Loaded ${proxies.length} proxies from ${source}`);
      } catch (error) {
        logger.warn(
          `⚠️ Failed to load proxies from ${source}: ${error.message}`
        );
      }
    }
  }

  // Parse free proxy list responses
  parseFreeProxyList(data, source) {
    const proxies = [];

    try {
      if (typeof data === "string") {
        // Parse text format (IP:PORT per line)
        const lines = data.split("\n").filter((line) => line.trim());
        lines.forEach((line) => {
          const [host, port] = line.trim().split(":");
          if (host && port && this.isValidIP(host)) {
            proxies.push({ host, port: parseInt(port), protocol: "http" });
          }
        });
      } else if (Array.isArray(data)) {
        // Parse JSON array format
        data.forEach((proxy) => {
          if (proxy.ip && proxy.port) {
            proxies.push({
              host: proxy.ip,
              port: proxy.port,
              protocol: proxy.protocol || "http",
            });
          }
        });
      }
    } catch (error) {
      logger.warn(
        `⚠️ Error parsing proxy data from ${source}: ${error.message}`
      );
    }

    return proxies.slice(0, 50); // Limit to 50 proxies per source
  }

  // Add direct connection as fallback
  addDirectConnection() {
    this.proxies.set("direct", {
      id: "direct",
      type: "direct",
      status: "active",
      lastUsed: null,
      successCount: 0,
      failureCount: 0,
      responseTime: 0,
    });

    this.healthyProxies.add("direct");
    logger.info("✅ Added direct connection fallback");
  }

  // Get next available proxy
  getNextProxy() {
    const healthyProxyList = Array.from(this.healthyProxies);

    if (healthyProxyList.length === 0) {
      logger.warn("⚠️ No healthy proxies available, using direct connection");
      return this.proxies.get("direct");
    }

    // Round-robin selection
    const proxyId =
      healthyProxyList[this.currentProxyIndex % healthyProxyList.length];
    this.currentProxyIndex++;

    const proxy = this.proxies.get(proxyId);
    if (proxy) {
      proxy.lastUsed = new Date();
      logger.debug(`🔄 Selected proxy: ${proxyId}`);
    }

    return proxy;
  }

  // Create HTTP client with proxy
  createProxyClient(proxy, options = {}) {
    const config = {
      timeout: options.timeout || 10000,
      headers: {
        "User-Agent": this.getRandomUserAgent(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        ...options.headers,
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      },
    };

    // Configure proxy
    if (proxy && proxy.type !== "direct") {
      if (proxy.type === "premium") {
        // Premium proxy configuration
        config.proxy = false;
        const proxyUrl = `${proxy.protocol}://${proxy.auth.username}:${proxy.auth.password}@${proxy.endpoint}`;
        config.httpsAgent = new HttpsProxyAgent(proxyUrl);
        config.httpAgent = new HttpProxyAgent(proxyUrl);
      } else {
        // Free proxy configuration
        config.proxy = {
          protocol: proxy.protocol,
          host: proxy.host,
          port: proxy.port,
          auth: proxy.auth || undefined,
        };
      }
    }

    return axios.create(config);
  }

  // Make request with automatic proxy rotation
  async makeRequest(url, options = {}) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const proxy = this.getNextProxy();

      try {
        logger.debug(
          `🌐 Making request to ${url} via ${
            proxy?.id || "direct"
          } (attempt ${attempt})`
        );

        const client = this.createProxyClient(proxy, options);
        const startTime = Date.now();

        const response = await client.get(url, options);

        const responseTime = Date.now() - startTime;

        // Record success
        this.recordProxySuccess(proxy, responseTime);

        logger.debug(
          `✅ Request successful via ${
            proxy?.id || "direct"
          } (${responseTime}ms)`
        );
        return response;
      } catch (error) {
        lastError = error;
        logger.warn(
          `❌ Request failed via ${proxy?.id || "direct"}: ${error.message}`
        );

        // Record failure
        this.recordProxyFailure(proxy, error);

        // Wait before retry
        if (attempt < maxRetries) {
          await this.delay(1000 * attempt);
        }
      }
    }

    throw new Error(
      `All proxy attempts failed. Last error: ${lastError?.message}`
    );
  }

  // Record proxy success
  recordProxySuccess(proxy, responseTime) {
    if (proxy) {
      proxy.successCount++;
      proxy.responseTime = responseTime;
      proxy.lastUsed = new Date();

      // Reset failure count on success
      this.proxyFailures.delete(proxy.id);

      // Add back to healthy proxies if it was removed
      this.healthyProxies.add(proxy.id);
    }
  }

  // Record proxy failure
  recordProxyFailure(proxy, error) {
    if (proxy && proxy.type !== "direct") {
      proxy.failureCount++;

      const failures = this.proxyFailures.get(proxy.id) || 0;
      this.proxyFailures.set(proxy.id, failures + 1);

      // Remove from healthy proxies if too many failures
      if (failures >= this.maxFailures) {
        this.healthyProxies.delete(proxy.id);
        this.bannedProxies.add(proxy.id);
        logger.warn(`🚫 Proxy ${proxy.id} banned due to ${failures} failures`);
      }
    }
  }

  // Health monitoring
  startHealthMonitoring() {
    setInterval(async () => {
      logger.info("🏥 Running proxy health check...");
      await this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  async performHealthCheck() {
    const testUrl = "https://httpbin.org/ip";
    const healthCheckPromises = [];

    for (const [proxyId, proxy] of this.proxies) {
      if (proxy.type === "direct") continue;

      healthCheckPromises.push(this.testProxy(proxy, testUrl));
    }

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
      `🏥 Health check completed: ${healthyCount} healthy, ${unhealthyCount} unhealthy proxies`
    );
  }

  async testProxy(proxy, testUrl) {
    try {
      const client = this.createProxyClient(proxy, { timeout: 5000 });
      const startTime = Date.now();

      await client.get(testUrl);

      const responseTime = Date.now() - startTime;

      return {
        proxyId: proxy.id,
        healthy: true,
        responseTime,
      };
    } catch (error) {
      return {
        proxyId: proxy.id,
        healthy: false,
        error: error.message,
      };
    }
  }

  // Proxy rotation
  startProxyRotation() {
    setInterval(() => {
      this.rotateProxies();
    }, this.rotationInterval);
  }

  rotateProxies() {
    logger.info("🔄 Rotating proxy selection...");

    // Reset banned proxies occasionally
    if (this.bannedProxies.size > this.proxies.size / 2) {
      logger.info("🔄 Resetting banned proxies for retry...");
      this.bannedProxies.forEach((proxyId) => {
        if (this.proxies.has(proxyId)) {
          this.healthyProxies.add(proxyId);
          this.proxyFailures.delete(proxyId);
        }
      });
      this.bannedProxies.clear();
    }
  }

  // Utility methods
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  isValidIP(ip) {
    const ipPattern =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Statistics and monitoring
  getProxyStats() {
    const stats = {
      total: this.proxies.size,
      healthy: this.healthyProxies.size,
      banned: this.bannedProxies.size,
      types: {},
      performance: {},
    };

    // Count by type
    for (const proxy of this.proxies.values()) {
      stats.types[proxy.type] = (stats.types[proxy.type] || 0) + 1;
    }

    // Performance metrics
    const healthyProxies = Array.from(this.healthyProxies)
      .map((id) => this.proxies.get(id))
      .filter((proxy) => proxy);

    if (healthyProxies.length > 0) {
      stats.performance.avgResponseTime =
        healthyProxies.reduce((sum, proxy) => sum + proxy.responseTime, 0) /
        healthyProxies.length;
      stats.performance.totalSuccesses = healthyProxies.reduce(
        (sum, proxy) => sum + proxy.successCount,
        0
      );
      stats.performance.totalFailures = healthyProxies.reduce(
        (sum, proxy) => sum + proxy.failureCount,
        0
      );
    }

    return stats;
  }

  // Get status
  getStatus() {
    return {
      ...this.getProxyStats(),
      currentProxyIndex: this.currentProxyIndex,
      rotationInterval: this.rotationInterval,
      healthCheckInterval: this.healthCheckInterval,
      status: "operational",
    };
  }
}

module.exports = { ProxyManager };
