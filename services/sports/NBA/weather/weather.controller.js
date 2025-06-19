const scraperUtils = require('../../../../utils/scraper-utils');
const Game = require('../../../../models/nba/Game');
const { asyncHandler, APIError } = require('../../../../middleware/error-handler.middleware');
const winston = require('winston');

// Configure weather-specific logger
const weatherLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/nba-weather.log' })
    ]
});

class WeatherController {
    constructor() {
        this.weatherSources = [
            'https://weather.com',
            'https://api.openweathermap.org/data/2.5/weather',
            'https://api.weatherapi.com/v1/current.json'
        ];
        this.venueLocations = {
            'Staples Center': { city: 'Los Angeles', state: 'CA', lat: 34.043, lon: -118.267 },
            'Chase Center': { city: 'San Francisco', state: 'CA', lat: 37.768, lon: -122.387 },
            'TD Garden': { city: 'Boston', state: 'MA', lat: 42.366, lon: -71.062 },
            'Madison Square Garden': { city: 'New York', state: 'NY', lat: 40.750, lon: -73.993 },
            'United Center': { city: 'Chicago', state: 'IL', lat: 41.881, lon: -87.674 }
        };
    }

    // Get weather data for specific game
    getGameWeather = asyncHandler(async (req, res) => {
        const { gameId } = req.params;
        
        weatherLogger.info(`Fetching weather data for game: ${gameId}`);
        
        // Find game in database
        const game = await Game.findOne({ gameId });
        if (!game) {
            throw new APIError('Game not found', 404, 'GAME_NOT_FOUND');
        }

        try {
            // Get venue location
            const venue = game.venue;
            const location = this.venueLocations[venue.name] || { 
                city: venue.city, 
                state: venue.state, 
                lat: null, 
                lon: null 
            };

            // Scrape weather data
            const weatherData = await this.scrapeWeatherData(location, game.date);
            
            // Analyze weather impact
            const impact = this.analyzeWeatherImpact(weatherData, venue);
            
            // Combine data
            const result = {
                gameId,
                venue: venue.name,
                location: `${location.city}, ${location.state}`,
                weather: {
                    ...weatherData,
                    impact
                },
                lastUpdated: new Date().toISOString()
            };

            // Update game in database
            await Game.updateOne(
                { gameId },
                { 
                    $set: { 
                        weather: {
                            temperature: weatherData.temperature,
                            humidity: weatherData.humidity,
                            windSpeed: weatherData.windSpeed,
                            conditions: weatherData.conditions,
                            impact: impact.level,
                            lastUpdated: new Date()
                        }
                    }
                }
            );

            weatherLogger.info(`Weather data retrieved successfully for game: ${gameId}`, {
                temperature: weatherData.temperature,
                conditions: weatherData.conditions,
                impact: impact.level
            });

            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            weatherLogger.error(`Weather data fetch failed for game: ${gameId}`, {
                error: error.message
            });
            throw new APIError(`Weather data unavailable: ${error.message}`, 503, 'WEATHER_SERVICE_ERROR');
        }
    });

    // Get weather data for specific venue
    getVenueWeather = asyncHandler(async (req, res) => {
        const { venue } = req.params;
        const { date } = req.query;
        
        weatherLogger.info(`Fetching weather data for venue: ${venue}`);
        
        const location = this.venueLocations[venue];
        if (!location) {
            throw new APIError('Venue not found', 404, 'VENUE_NOT_FOUND');
        }

        try {
            const weatherData = await this.scrapeWeatherData(location, date || new Date());
            const impact = this.analyzeWeatherImpact(weatherData, { name: venue });
            
            const result = {
                venue,
                location: `${location.city}, ${location.state}`,
                weather: {
                    ...weatherData,
                    impact
                },
                lastUpdated: new Date().toISOString()
            };

            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            weatherLogger.error(`Weather data fetch failed for venue: ${venue}`, {
                error: error.message
            });
            throw new APIError(`Weather data unavailable: ${error.message}`, 503, 'WEATHER_SERVICE_ERROR');
        }
    });

    // Get weather forecast for upcoming games
    getWeatherForecast = asyncHandler(async (req, res) => {
        const { days = 7 } = req.query;
        
        weatherLogger.info(`Fetching weather forecast for next ${days} days`);
        
        try {
            // Get upcoming games
            const upcomingGames = await Game.find({
                date: {
                    $gte: new Date(),
                    $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
                }
            }).sort({ date: 1 });

            const forecasts = [];
            
            for (const game of upcomingGames) {
                const location = this.venueLocations[game.venue.name];
                if (location) {
                    try {
                        const weatherData = await this.scrapeWeatherData(location, game.date);
                        const impact = this.analyzeWeatherImpact(weatherData, game.venue);
                        
                        forecasts.push({
                            gameId: game.gameId,
                            date: game.date,
                            venue: game.venue.name,
                            teams: `${game.awayTeam.name} @ ${game.homeTeam.name}`,
                            weather: {
                                ...weatherData,
                                impact
                            }
                        });
                    } catch (error) {
                        weatherLogger.warn(`Failed to get weather for game ${game.gameId}`, {
                            error: error.message
                        });
                    }
                }
                
                // Rate limiting between requests
                await scraperUtils.sleep(500);
            }

            res.json({
                success: true,
                data: {
                    forecastDays: parseInt(days),
                    gamesFound: upcomingGames.length,
                    weatherDataRetrieved: forecasts.length,
                    forecasts
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            weatherLogger.error('Weather forecast fetch failed', {
                error: error.message
            });
            throw new APIError(`Forecast unavailable: ${error.message}`, 503, 'FORECAST_SERVICE_ERROR');
        }
    });

    // Scrape weather data from multiple sources
    async scrapeWeatherData(location, date) {
        const weatherData = {
            temperature: null,
            humidity: null,
            windSpeed: null,
            conditions: 'indoor',
            description: '',
            visibility: null,
            pressure: null,
            dewPoint: null
        };

        try {
            // Method 1: Try OpenWeatherMap-style API simulation
            const mockWeatherData = this.generateMockWeatherData(location, date);
            Object.assign(weatherData, mockWeatherData);
            
            weatherLogger.info(`Weather data scraped for ${location.city}`, {
                temperature: weatherData.temperature,
                conditions: weatherData.conditions
            });
            
            return weatherData;
            
        } catch (error) {
            weatherLogger.error(`Weather scraping failed for ${location.city}`, {
                error: error.message
            });
            
            // Return default indoor conditions
            return {
                temperature: 72,
                humidity: 45,
                windSpeed: 0,
                conditions: 'indoor',
                description: 'Controlled indoor environment',
                visibility: 100,
                pressure: 30.0,
                dewPoint: 55
            };
        }
    }

    // Generate realistic mock weather data (replace with real scraping)
    generateMockWeatherData(location, date) {
        const season = this.getSeason(date);
        const baseTemp = this.getSeasonalTemp(location.city, season);
        
        return {
            temperature: baseTemp + (Math.random() * 20 - 10), // ±10 degrees variation
            humidity: 30 + (Math.random() * 40), // 30-70%
            windSpeed: Math.random() * 15, // 0-15 mph
            conditions: Math.random() > 0.7 ? 'outdoor_event' : 'indoor',
            description: this.getWeatherDescription(season),
            visibility: 80 + (Math.random() * 20), // 80-100%
            pressure: 29.5 + (Math.random() * 1), // 29.5-30.5 inches
            dewPoint: baseTemp - (10 + Math.random() * 20)
        };
    }

    // Analyze weather impact on game
    analyzeWeatherImpact(weatherData, venue) {
        // Most NBA games are indoors, so weather impact is minimal
        if (weatherData.conditions === 'indoor') {
            return {
                level: 'none',
                factors: ['Indoor venue - no weather impact'],
                recommendation: 'Weather will not affect gameplay'
            };
        }

        const factors = [];
        let impactScore = 0;

        // Temperature impact (outdoor events only)
        if (weatherData.temperature < 40 || weatherData.temperature > 85) {
            factors.push(`Extreme temperature: ${weatherData.temperature}°F`);
            impactScore += 2;
        }

        // Wind impact (outdoor events only)
        if (weatherData.windSpeed > 10) {
            factors.push(`High wind: ${weatherData.windSpeed} mph`);
            impactScore += 1;
        }

        // Humidity impact
        if (weatherData.humidity > 80) {
            factors.push(`High humidity: ${weatherData.humidity}%`);
            impactScore += 1;
        }

        // Determine impact level
        let level = 'none';
        if (impactScore >= 3) level = 'high';
        else if (impactScore >= 2) level = 'moderate';
        else if (impactScore >= 1) level = 'low';

        return {
            level,
            score: impactScore,
            factors,
            recommendation: this.getWeatherRecommendation(level, factors)
        };
    }

    // Helper methods
    getSeason(date) {
        const month = new Date(date).getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'fall';
        return 'winter';
    }

    getSeasonalTemp(city, season) {
        const temps = {
            'Los Angeles': { spring: 70, summer: 80, fall: 75, winter: 65 },
            'San Francisco': { spring: 60, summer: 65, fall: 65, winter: 55 },
            'Boston': { spring: 55, summer: 75, fall: 60, winter: 35 },
            'New York': { spring: 60, summer: 78, fall: 65, winter: 40 },
            'Chicago': { spring: 55, summer: 75, fall: 60, winter: 30 }
        };
        
        return temps[city]?.[season] || 70;
    }

    getWeatherDescription(season) {
        const descriptions = {
            spring: 'Mild spring conditions',
            summer: 'Warm summer weather',
            fall: 'Cool autumn conditions',
            winter: 'Cold winter weather'
        };
        
        return descriptions[season] || 'Moderate conditions';
    }

    getWeatherRecommendation(level, factors) {
        if (level === 'none') return 'No weather-related concerns';
        if (level === 'low') return 'Minor weather considerations';
        if (level === 'moderate') return 'Weather may have some impact on outdoor activities';
        return 'Significant weather impact expected';
    }
}

module.exports = new WeatherController();
