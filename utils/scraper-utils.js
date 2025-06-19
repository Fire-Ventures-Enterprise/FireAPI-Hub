const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const winston = require('winston');

// Configure logger for scraping operations
const scraperLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/scraper.log' })
    ]
});

class ScraperUtils {
    constructor() {
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000; // 1 second between requests
        this.maxRetries = 3;
        this.timeout = 30000; // 30 seconds timeout
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
        ];
    }

    // Rate limiting function
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.minRequestInterval) {
            const delay = this.minRequestInterval - timeSinceLastRequest;
            scraperLogger.info(`Rate limiting: waiting ${delay}ms`);
            await this.sleep(delay);
        }
        
        this.lastRequestTime = Date.now();
        this.requestCount++;
    }

    // Sleep utility
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get random user agent
    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    // HTTP request with retry logic
    async makeRequest(url, options = {}) {
        await this.rateLimit();
        
        const defaultOptions = {
            timeout: this.timeout,
            headers: {
                'User-Agent': this.getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            ...options
        };

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                scraperLogger.info(`Making request to ${url} (attempt ${attempt}/${this.maxRetries})`);
                
                const response = await axios.get(url, defaultOptions);
                
                scraperLogger.info(`Request successful: ${url}`, {
                    statusCode: response.status,
                    dataLength: response.data.length,
                    attempt
                });
                
                return response;
            } catch (error) {
                scraperLogger.error(`Request failed for ${url} (attempt ${attempt}/${this.maxRetries})`, {
                    error: error.message,
                    statusCode: error.response?.status,
                    attempt
                });

                if (attempt === this.maxRetries) {
                    throw new Error(`Failed to fetch ${url} after ${this.maxRetries} attempts: ${error.message}`);
                }

                // Exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                await this.sleep(delay);
            }
        }
    }

    // Scrape HTML content
    async scrapeHTML(url, selector = null) {
        try {
            const response = await this.makeRequest(url);
            const $ = cheerio.load(response.data);
            
            if (selector) {
                return $(selector);
            }
            
            return $;
        } catch (error) {
            scraperLogger.error(`HTML scraping failed for ${url}`, { error: error.message });
            throw error;
        }
    }

    // Scrape with Puppeteer for JavaScript-heavy sites
    async scrapeBrowser(url, options = {}) {
        let browser;
        try {
            const defaultOptions = {
                waitForSelector: 'body',
                timeout: this.timeout,
                ...options
            };

            browser = await puppeteer.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            await page.setUserAgent(this.getRandomUserAgent());
            
            scraperLogger.info(`Browser scraping: ${url}`);
            
            await page.goto(url, { waitUntil: 'networkidle2', timeout: defaultOptions.timeout });
            
            if (defaultOptions.waitForSelector) {
                await page.waitForSelector(defaultOptions.waitForSelector, { timeout: 10000 });
            }
            
            const content = await page.content();
            
            scraperLogger.info(`Browser scraping successful: ${url}`, {
                contentLength: content.length
            });
            
            return cheerio.load(content);
        } catch (error) {
            scraperLogger.error(`Browser scraping failed for ${url}`, { error: error.message });
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    // Fetch JSON data
    async fetchJSON(url, options = {}) {
        try {
            const response = await this.makeRequest(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Accept': 'application/json, text/plain, */*'
                }
            });
            
            return response.data;
        } catch (error) {
            scraperLogger.error(`JSON fetch failed for ${url}`, { error: error.message });
            throw error;
        }
    }

    // Validate scraped data
    validateData(data, requiredFields = []) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data: must be an object');
        }

        const missingFields = requiredFields.filter(field => {
            return !data.hasOwnProperty(field) || data[field] === null || data[field] === undefined;
        });

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        return true;
    }

    // Clean text data
    cleanText(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/\n+/g, ' ')  // Replace newlines with space
            .trim();               // Remove leading/trailing whitespace
    }

    // Parse number from text
    parseNumber(text, defaultValue = 0) {
        if (typeof text === 'number') return text;
        if (!text) return defaultValue;
        
        const cleaned = text.toString().replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        
        return isNaN(parsed) ? defaultValue : parsed;
    }

    // Parse percentage from text
    parsePercentage(text, defaultValue = 0) {
        const number = this.parseNumber(text, defaultValue);
        return number > 1 ? number / 100 : number;
    }

    // Format team name
    formatTeamName(teamName) {
        if (!teamName) return '';
        
        // Common team name mappings
        const teamMappings = {
            'Lakers': 'Los Angeles Lakers',
            'Warriors': 'Golden State Warriors',
            'Celtics': 'Boston Celtics',
            'Heat': 'Miami Heat',
            'Bulls': 'Chicago Bulls',
            'Knicks': 'New York Knicks',
            'Nets': 'Brooklyn Nets',
            'Sixers': 'Philadelphia 76ers'
        };
        
        return teamMappings[teamName] || teamName;
    }

    // Get team abbreviation
    getTeamAbbreviation(teamName) {
        const abbreviations = {
            'Los Angeles Lakers': 'LAL',
            'Golden State Warriors': 'GSW',
            'Boston Celtics': 'BOS',
            'Miami Heat': 'MIA',
            'Chicago Bulls': 'CHI',
            'New York Knicks': 'NYK',
            'Brooklyn Nets': 'BKN',
            'Philadelphia 76ers': 'PHI'
        };
        
        return abbreviations[teamName] || teamName.substring(0, 3).toUpperCase();
    }

    // Format date
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toISOString();
        } catch (error) {
            scraperLogger.error(`Date formatting failed for: ${dateString}`, { error: error.message });
            return new Date().toISOString();
        }
    }

    // Calculate data freshness
    calculateFreshness(timestamp) {
        const now = Date.now();
        const dataTime = new Date(timestamp).getTime();
        const ageInMinutes = (now - dataTime) / (1000 * 60);
        
        if (ageInMinutes < 5) return 'fresh';
        if (ageInMinutes < 30) return 'recent';
        if (ageInMinutes < 60) return 'stale';
        return 'outdated';
    }

    // Log scraping results
    logScrapingResult(source, success, dataCount = 0, errors = []) {
        scraperLogger.info(`Scraping result for ${source}`, {
            success,
            dataCount,
            errors: errors.length,
            timestamp: new Date().toISOString()
        });

        if (errors.length > 0) {
            errors.forEach(error => {
                scraperLogger.error(`Scraping error in ${source}`, { error });
            });
        }
    }

    // Get scraping statistics
    getStats() {
        return {
            totalRequests: this.requestCount,
            averageRequestInterval: this.minRequestInterval,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }
}

// Export singleton instance
module.exports = new ScraperUtils();
