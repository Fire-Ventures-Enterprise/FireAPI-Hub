const Player = require('./players.model');
const { ApiResponse } = require('../../../../utils/apiResponse');
const { logger } = require('../../../../utils/logger');
const { NBADataService } = require('../../../../services/nbaData.service');
const { CacheService } = require('../../../../services/cache.service');
const { AnalyticsService } = require('../../../../services/analytics.service');
const { ValidationError, NotFoundError } = require('../../../../utils/errors');

// =============================================================================
// NBA PLAYERS API CONTROLLER
// =============================================================================
// This file contains all controller functions for NBA Players API endpoints
// Handles player data retrieval, advanced analytics, projections, and comparisons
// Integrates with external NBA data sources and machine learning services
// =============================================================================

class PlayersController {
    constructor() {
        this.nbaService = new NBADataService();
        this.cache = new CacheService();
        this.analytics = new AnalyticsService();
        this.cacheTimeout = {
            players: 1800, // 30 minutes
            currentStats: 600, // 10 minutes
            careerStats: 3600, // 1 hour
            gameLogs: 300, // 5 minutes
            splits: 900, // 15 minutes
            awards: 7200, // 2 hours
            analytics: 300, // 5 minutes
            projections: 1800, // 30 minutes
            injuries: 3600, // 1 hour
            shotCharts: 900, // 15 minutes
            rookies: 1800 // 30 minutes
        };
    }

    // =========================================================================
    // FREE TIER ENDPOINTS
    // =========================================================================

    /**
     * Get all NBA players with filtering
     * @route GET /api/nba/players
     * @access FREE TIER
     */
    getAllPlayers = async (req, res, next) => {
        try {
            const { team, position, status, limit = 50, page = 1 } = req.query;
            const cacheKey = `players:all:${team || 'all'}:${position || 'all'}:${status || 'all'}:${limit}:${page}`;

            let result = await this.cache.get(cacheKey);
            
            if (!result) {
                const filters = {
                    ...(team && { currentTeam: team.toUpperCase() }),
                    ...(position && { position }),
                    ...(status && { status }),
                    isActive: true
                };

                const skip = (parseInt(page) - 1) * parseInt(limit);
                
                const [players, totalCount] = await Promise.all([
                    Player.find(filters)
                        .select('playerId firstName lastName position currentTeam jerseyNumber age height weight')
                        .limit(parseInt(limit))
                        .skip(skip)
                        .sort({ lastName: 1 }),
                    Player.countDocuments(filters)
                ]);

                result = {
                    players,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: totalCount,
                        pages: Math.ceil(totalCount / parseInt(limit))
                    }
                };

                await this.cache.set(cacheKey, result, this.cacheTimeout.players);
            }

            logger.info(`Players retrieved successfully`, {
                userId: req.user.id,
                count: result.players.length,
                filters: { team, position, status },
                page
            });

            return ApiResponse.success(res, result, 'Players retrieved successfully');

        } catch (error) {
            logger.error('Error getting all players:', error);
            next(error);
        }
    };

    /**
     * Get specific player by ID
     * @route GET /api/nba/players/:playerId
     * @access FREE TIER
     */
    getPlayerById = async (req, res, next) => {
        try {
            const { playerId } = req.params;
            const { include } = req.query;
            const includeFields = include ? include.split(',') : [];
            const cacheKey = `player:${playerId}:${include || 'basic'}`;

            let player = await this.cache.get(cacheKey);

            if (!player) {
                let query = Player.findOne({ playerId });

                // Add additional fields based on include parameter
                if (includeFields.includes('stats')) {
                    query = query.populate('currentSeasonStats');
                }
                if (includeFields.includes('bio')) {
                    query = query.select('+biography +personalInfo');
                }
                if (includeFields.includes('social')) {
                    query = query.select('+socialMedia');
                }

                player = await query;

                if (!player) {
                    throw new NotFoundError(`Player with ID ${playerId} not found`);
                }

                await this.cache.set(cacheKey, player, this.cacheTimeout.players);
            }

            logger.info(`Player retrieved successfully`, {
                userId: req.user.id,
                playerId,
                playerName: `${player.firstName} ${player.lastName}`
            });

            return ApiResponse.success(res, { player }, 'Player retrieved successfully');

        } catch (error) {
            logger.error('Error getting player by ID:', error);
            next(error);
        }
    };

    /**
     * Get player current season statistics
     * @route GET /api/nba/players/:playerId/current-stats
     * @access FREE TIER
     */
    getCurrentStats = async (req, res, next) => {
        try {
            const { playerId } = req.params;
            const { type = 'regular' } = req.query;
            const cacheKey = `current-stats:${playerId}:${type}`;

            let stats = await this.cache.get(cacheKey);

            if (!stats) {
                stats = await this.nbaService.getPlayerCurrentStats(playerId, {
                    type,
                    season: '2024-25'
                });

                await this.cache.set(cacheKey, stats, this.cacheTimeout.currentStats);
            }

            logger.info(`Player current stats retrieved successfully`, {
                userId: req.user.id,
                playerId,
                type,
                gamesPlayed: stats.gamesPlayed
            });

            return ApiResponse.success(res, {
                stats,
                meta: {
                    playerId,
                    season: '2024-25',
                    type,
                    lastUpdated: stats.lastUpdated
                }
            }, 'Current statistics retrieved successfully');

        } catch (error) {
            logger.error('Error getting current stats:', error);
            next(error);
        }
    };

    /**
     * Search players by name or criteria
     * @route GET /api/nba/players/search
     * @access FREE TIER
     */
    searchPlayers = async (req, res, next) => {
        try {
            const { q, filters, limit = 20 } = req.query;
            const cacheKey = `search:${q}:${filters || 'none'}:${limit}`;

            let results = await this.cache.get(cacheKey);

            if (!results) {
                // Text search on name fields
                let query = {
                    $or: [
                        { firstName: { $regex: q, $options: 'i' } },
                        { lastName: { $regex: q, $options: 'i' } },
                        { $text: { $search: q } }
                    ],
                    isActive: true
                };

                // Apply additional filters if provided
                if (filters) {
                    const filterObj = JSON.parse(filters);
                    query = { ...query, ...filterObj };
                }

                const players = await Player.find(query)
                    .select('playerId firstName lastName position currentTeam jerseyNumber age')
                    .limit(parseInt(limit))
                    .sort({ score: { $meta: 'textScore' }, lastName: 1 });

                results = {
                    query: q,
                    players,
                    count: players.length
                };

                await this.cache.set(cacheKey, results, this.cacheTimeout.players);
            }

            logger.info(`Player search completed`, {
                userId: req.user.id,
                query: q,
                resultCount: results.count
            });

            return ApiResponse.success(res, results, 'Player search completed successfully');

        } catch (error) {
            logger.error('Error searching players:', error);
            next(error);
        }
    };

    // =========================================================================
    // STANDARD TIER ENDPOINTS
    // =========================================================================

    /**
     * Get player career statistics
     * @route GET /api/nba/players/:playerId/career-stats
     * @access STANDARD TIER
     */
    getCareerStats = async (req, res, next) => {
        try {
            const { playerId } = req.params;
            const { type = 'both', pergame = true } = req.query;
            const cacheKey = `career-stats:${playerId}:${type}:${pergame}`;

            let careerStats = await this.cache.get(cacheKey);

            if (!careerStats) {
                careerStats = await this.nbaService.getPlayerCareerStats(playerId, {
                    type,
                    pergame: pergame === 'true'
                });

                await this.cache.set(cacheKey, careerStats, this.cacheTimeout.careerStats);
            }

            logger.info(`Player career stats retrieved successfully`, {
                userId: req.user.id,
                playerId,
                seasons: careerStats.totalSeasons
            });

            return ApiResponse.success(res, {
                careerStats,
                meta: {
                    playerId,
                    type,
                    pergame: pergame === 'true',
                    totalSeasons: careerStats.totalSeasons
                }
            }, 'Career statistics retrieved successfully');

        } catch (error) {
            logger.error('Error getting career stats:', error);
            next(error);
        }
    };

    /**
     * Get player game logs
     * @route GET /api/nba/players/:playerId/game-logs
     * @access STANDARD TIER
     */
    getGameLogs = async (req, res, next) => {
        try {
            const { playerId } = req.params;
            const { season = '2024-25', from, to, limit = 20 } = req.query;
            const cacheKey = `game-logs:${playerId}:${season}:${from || 'start'}:${to || 'current'}:${limit}`;

            let gameLogs = await this.cache.get(cacheKey);

            if (!gameLogs) {
                gameLogs = await this.nbaService.getPlayerGameLogs(playerId, {
                    season,
                    from,
                    to,
                    limit: parseInt(limit)
                });

                await this.cache.set(cacheKey, gameLogs, this.cacheTimeout.gameLogs);
            }

            logger.info(`Player game logs retrieved successfully`, {
                userId: req.user.id,
                playerId,
                gameCount: gameLogs.games.length
            });

            return ApiResponse.success(res, {
                gameLogs,
                meta: {
                    playerId,
                    season,
                    gameCount: gameLogs.games.length,
                    dateRange: { from, to }
                }
            }, 'Game logs retrieved successfully');

        } catch (error) {
            logger.error('Error getting game logs:', error);
            next(error);
        }
    };

    /**
     * Get player statistical splits
     * @route GET /api/nba/players/:playerId/splits
     * @access STANDARD TIER
     */
    getPlayerSplits = async (req, res, next) => {
        try {
            const { playerId } = req.params;
            const { type = 'home-away', season = '2024-25' } = req.query;
            const cacheKey = `splits:${playerId}:${type}:${season}`;

            let splits = await this.cache.get(cacheKey);

            if (!splits) {
                splits = await this.nbaService.getPlayerSplits(playerId, {
                    type,
                    season
                });

                await this.cache.set(cacheKey, splits, this.cacheTimeout.splits);
            }

            logger.info(`Player splits retrieved successfully`, {
                userId: req.user.id,
                playerId,
                splitType: type
            });

            return ApiResponse.success(res, {
                splits,
                meta: {
                    playerId,
                    type,
                    season
                }
            }, 'Player splits retrieved successfully');

        } catch (error) {
            logger.error('Error getting player splits:', error);
            next(error);
        }
    };

    /**
     * Get player awards and achievements
     * @route GET /api/nba/players/:playerId/awards
     * @access STANDARD TIER
     */
    getPlayerAwards = async (req, res, next) => {
        try {
            const { playerId } = req.params;
            const { type } = req.query;
            const cacheKey = `awards:${playerId}:${type || 'all'}`;

            let awards = await this.cache.get(cacheKey);

            if (!awards) {
                const player = await Player.findOne({ playerId })
                    .select('awards achievements accolades');

                if (!player) {
                    throw new NotFoundError(`Player with ID ${playerId} not found`);
                }

                awards = {
                    awards: player.awards || [],
                    achievements: player.achievements || [],
                    accolades: player.accolades || []
                };

                // Filter by type if specified
                if (type) {
                    awards.awards = awards.awards.filter(award => 
                        award.type.toLowerCase().includes(type.toLowerCase())
                    );
                }

                await this.cache.set(cacheKey, awards, this.cacheTimeout.awards);
            }

            logger.info(`Player awards retrieved successfully`, {
                userId: req.user.id,
                playerId,
                awardCount: awards.awards.length
            });

            return ApiResponse.success(res, {
                awards,
                meta: {
                    playerId,
                    type,
                    totalAwards: awards.awards.length
                }
            }, 'Player awards retrieved successfully');

        } catch (error) {
            logger.error('Error getting player awards:', error);
            next(error);
        }
    };

    // =========================================================================
    // PREMIUM TIER ENDPOINTS
    // =========================================================================

    /**
     * Get player advanced analytics
     * @route GET /api/nba/players/:playerId/advanced-analytics
     * @access PREMIUM TIER
     */
    getAdvancedAnalytics = async (req, res, next) => {
        try {
            const { playerId } = req.params;
            const { metrics, period = 'season', context } = req.query;
            const cacheKey = `analytics:${playerId}:${metrics || 'all'}:${period}:${context || 'general'}`;

            let analytics = await this.cache.get(cacheKey);

            if (!analytics) {
                analytics = await this.analytics.getPlayerAdvancedMetrics(playerId, {
                    metrics: metrics ? metrics.split(',') : null,
                    period,
                    context
                });

                await this.cache.set(cacheKey, analytics, this.cacheTimeout.analytics);
            }

            logger.info(`Player advanced analytics retrieved successfully`, {
                userId: req.user.id,
                playerId,
                metricsCount: Object.keys(analytics.metrics).length
            });

            return ApiResponse.success(res, {
                analytics,
                meta: {
                    playerId,
                    period,
                    context,
                    metricsIncluded: Object.keys(analytics.metrics)
                }
            }, 'Advanced analytics retrieved successfully');

        } catch (error) {
            logger.error('Error getting advanced analytics:', error);
            next(error);
        }
    };

    /**
     * Get player projections
     * @route GET /api/nba/players/:playerId/projections
     * @access PREMIUM TIER
     */
    getPlayerProjections = async (req, res, next) => {
        try {
            const { playerId } = req.params;
            const { type = 'season', games } = req.query;
            const cacheKey = `projections:${playerId}:${type}:${games || 'season'}`;

            let projections = await this.cache.get(cacheKey);

            if (!projections) {
                projections = await this.analytics.generatePlayerProjections(playerId, {
                    type,
                    games: games ? parseInt(games) : null
                });

                await this.cache.set(cacheKey, projections, this.cacheTimeout.projections);
            }

            logger.info(`Player projections retrieved successfully`, {
                userId: req.user.id,
                playerId,
                projectionType: type
            });

            return ApiResponse.success(res, {
                projections,
                meta: {
                    playerId,
                    type,
                    confidence: projections.confidence,
                    generatedAt: projections.generatedAt
                }
            }, 'Player projections retrieved successfully');

        } catch (error) {
            logger.error('Error getting player projections:', error);
            next(error);
        }
    };

    /**
     * Get player injury history
     * @route GET /api/nba/players/:playerId/injury-history
     * @access PREMIUM TIER
     */
    getInjuryHistory = async (req, res, next) => {
        try {
            const { playerId } = req.params;
            const { years = 5, type } = req.query;
            const cacheKey = `injuries:${playerId}:${years}:${type || 'all'}`;

            let injuryHistory = await this.cache.get(cacheKey);

            if (!injuryHistory) {
                injuryHistory = await this.nbaService.getPlayerInjuryHistory(playerId, {
                    years: parseInt(years),
                    type
                });

                await this.cache.set(cacheKey, injuryHistory, this.cacheTimeout.injuries);
            }

            logger.info(`Player injury history retrieved successfully`, {
                userId: req.user.id,
                playerId,
                injuryCount: injuryHistory.injuries.length
            });

            return ApiResponse.success(res, {
                injuryHistory,
                meta: {
                    playerId,
                    years: parseInt(years),
                    type,
                    totalInjuries: injuryHistory.injuries.length
                }
            }, 'Injury history retrieved successfully');

        } catch (error) {
            logger.error('Error getting injury history:', error);
            next(error);
        }
    };

    /**
     * Compare multiple players
     * @route GET /api/nba/players/compare
     * @access PREMIUM TIER
     */
    comparePlayers = async (req, res, next) => {
        try {
            const { players, metrics, season = '2024-25', context = 'overall' } = req.query;
            const playerIds = players.split(',');
            const cacheKey = `compare:${players}:${metrics || 'basic'}:${season}:${context}`;

            let comparison = await this.cache.get(cacheKey);

            if (!comparison) {
                comparison = await this.analytics.comparePlayers(playerIds, {
                    metrics: metrics ? metrics.split(',') : null,
                    season,
                    context
                });

                await this.cache.set(cacheKey, comparison, this.cacheTimeout.analytics);
            }

            logger.info(`Player comparison retrieved successfully`, {
                userId: req.user.id,
                playerIds,
                context
            });

            return ApiResponse.success(res, {
                comparison,
                meta: {
                    playersCompared: playerIds,
                    season,
                    context,
                    metricsIncluded: Object.keys(comparison.metrics)
                }
            }, 'Player comparison retrieved successfully');

        } catch (error) {
            logger.error('Error comparing players:', error);
            next(error);
        }
    };

    /**
     * Get player shot charts
     * @route GET /api/nba/players/:playerId/shot-charts
     * @access PREMIUM TIER
     */
    getShotCharts = async (req, res, next) => {
        try {
            const { playerId } = req.params;
            const { season = '2024-25', type = 'season', zone = 'all' } = req.query;
            const cacheKey = `shot-charts:${playerId}:${season}:${type}:${zone}`;

            let shotCharts = await this.cache.get(cacheKey);

            if (!shotCharts) {
                shotCharts = await this.nbaService.getPlayerShotCharts(playerId, {
                    season,
                    type,
                    zone
                });

                await this.cache.set(cacheKey, shotCharts, this.cacheTimeout.shotCharts);
            }

            logger.info(`Player shot charts retrieved successfully`, {
                userId: req.user.id,
                playerId,
                shotCount: shotCharts.totalShots
            });

            return ApiResponse.success(res, {
                shotCharts,
                meta: {
                    playerId,
                    season,
                    type,
                    zone,
                    totalShots: shotCharts.totalShots
                }
            }, 'Shot charts retrieved successfully');

        } catch (error) {
            logger.error('Error getting shot charts:', error);
            next(error);
        }
    };

    /**
     * Get rookie player statistics
     * @route GET /api/nba/players/rookies
     * @access PREMIUM TIER
     */
    getRookieStats = async (req, res, next) => {
        try {
            const { season = '2024-25', sort = 'points', limit = 50 } = req.query;
            const cacheKey = `rookies:${season}:${sort}:${limit}`;

            let rookieStats = await this.cache.get(cacheKey);

            if (!rookieStats) {
                rookieStats = await this.nbaService.getRookieStats({
                    season,
                    sort,
                    limit: parseInt(limit)
                });

                await this.cache.set(cacheKey, rookieStats, this.cacheTimeout.rookies);
            }

            logger.info(`Rookie stats retrieved successfully`, {
                userId: req.user.id,
                season,
                rookieCount: rookieStats.rookies.length
            });

            return ApiResponse.success(res, {
                rookieStats,
                meta: {
                    season,
                    sort,
                    limit: parseInt(limit),
                    rookieCount: rookieStats.rookies.length
                }
            }, 'Rookie statistics retrieved successfully');

        } catch (error) {
            logger.error('Error getting rookie stats:', error);
            next(error);
        }
    };
}

module.exports = new PlayersController();
