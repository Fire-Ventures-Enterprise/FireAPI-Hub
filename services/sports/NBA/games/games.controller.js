const Game = require('./games.model');
const { ApiResponse } = require('../../../../utils/apiResponse');
const { logger } = require('../../../../utils/logger');
const { NBADataService } = require('../../../../services/nbaData.service');
const { LiveDataService } = require('../../../../services/liveData.service');
const { CacheService } = require('../../../../services/cache.service');
const { AnalyticsService } = require('../../../../services/analytics.service');
const { PredictionService } = require('../../../../services/prediction.service');
const { ValidationError, NotFoundError } = require('../../../../utils/errors');

// =============================================================================
// NBA GAMES API CONTROLLER
// =============================================================================
// This file contains all controller functions for NBA Games API endpoints
// Handles live scoring, real-time tracking, game analytics, and predictions
// Integrates with multiple data sources for comprehensive game coverage
// =============================================================================

class GamesController {
    constructor() {
        this.nbaService = new NBADataService();
        this.liveService = new LiveDataService();
        this.cache = new CacheService();
        this.analytics = new AnalyticsService();
        this.predictions = new PredictionService();
        this.cacheTimeout = {
            games: 300, // 5 minutes
            todaysGames: 60, // 1 minute (live updates)
            gameDetails: 180, // 3 minutes
            scores: 30, // 30 seconds (live scores)
            schedule: 1800, // 30 minutes
            boxScore: 120, // 2 minutes
            stats: 180, // 3 minutes
            timeline: 60, // 1 minute
            historical: 3600, // 1 hour
            playByPlay: 30, // 30 seconds
            liveTracking: 15, // 15 seconds
            predictions: 300, // 5 minutes
            momentum: 60, // 1 minute
            clutch: 300 // 5 minutes
        };
    }

    // =========================================================================
    // FREE TIER ENDPOINTS
    // =========================================================================

    /**
     * Get games with filtering options
     * @route GET /api/nba/games
     * @access FREE TIER
     */
    getGames = async (req, res, next) => {
        try {
            const { date, team, status, limit = 20 } = req.query;
            const cacheKey = `games:${date || 'all'}:${team || 'all'}:${status || 'all'}:${limit}`;

            let result = await this.cache.get(cacheKey);
            
            if (!result) {
                const filters = {};
                
                if (date) {
                    const gameDate = new Date(date);
                    const nextDate = new Date(gameDate);
                    nextDate.setDate(nextDate.getDate() + 1);
                    filters.gameDate = {
                        $gte: gameDate,
                        $lt: nextDate
                    };
                }
                
                if (team) {
                    filters.$or = [
                        { 'homeTeam.abbreviation': team.toUpperCase() },
                        { 'awayTeam.abbreviation': team.toUpperCase() }
                    ];
                }
                
                if (status) {
                    filters.status = status;
                }

                const games = await Game.find(filters)
                    .select('gameId gameDate homeTeam awayTeam status score period timeRemaining')
                    .limit(parseInt(limit))
                    .sort({ gameDate: -1 });

                result = {
                    games,
                    meta: {
                        count: games.length,
                        filters: { date, team, status },
                        lastUpdated: new Date()
                    }
                };

                await this.cache.set(cacheKey, result, this.cacheTimeout.games);
            }

            logger.info(`Games retrieved successfully`, {
                userId: req.user.id,
                count: result.games.length,
                filters: { date, team, status }
            });

            return ApiResponse.success(res, result, 'Games retrieved successfully');

        } catch (error) {
            logger.error('Error getting games:', error);
            next(error);
        }
    };

    /**
     * Get today's NBA games
     * @route GET /api/nba/games/today
     * @access FREE TIER
     */
    getTodaysGames = async (req, res, next) => {
        try {
            const { status, scores = true } = req.query;
            const today = new Date().toISOString().split('T')[0];
            const cacheKey = `todays-games:${today}:${status || 'all'}:${scores}`;

            let result = await this.cache.get(cacheKey);
            
            if (!result) {
                const todayStart = new Date(today);
                const todayEnd = new Date(todayStart);
                todayEnd.setDate(todayEnd.getDate() + 1);

                const filters = {
                    gameDate: {
                        $gte: todayStart,
                        $lt: todayEnd
                    }
                };

                if (status) {
                    filters.status = status;
                }

                let selectFields = 'gameId gameDate homeTeam awayTeam status venue';
                if (scores === 'true') {
                    selectFields += ' score period timeRemaining';
                }

                const games = await Game.find(filters)
                    .select(selectFields)
                    .sort({ gameDate: 1 });

                result = {
                    games,
                    meta: {
                        date: today,
                        totalGames: games.length,
                        liveGames: games.filter(g => g.status === 'live').length,
                        finishedGames: games.filter(g => g.status === 'finished').length,
                        scheduledGames: games.filter(g => g.status === 'scheduled').length
                    }
                };

                await this.cache.set(cacheKey, result, this.cacheTimeout.todaysGames);
            }

            logger.info(`Today's games retrieved successfully`, {
                userId: req.user.id,
                gameCount: result.games.length,
                date: today
            });

            return ApiResponse.success(res, result, 'Today\'s games retrieved successfully');

        } catch (error) {
            logger.error('Error getting today\'s games:', error);
            next(error);
        }
    };

    /**
     * Get specific game by ID
     * @route GET /api/nba/games/:gameId
     * @access FREE TIER
     */
    getGameById = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { include } = req.query;
            const includeFields = include ? include.split(',') : [];
            const cacheKey = `game:${gameId}:${include || 'basic'}`;

            let game = await this.cache.get(cacheKey);

            if (!game) {
                let query = Game.findOne({ gameId });

                // Add additional fields based on include parameter
                if (includeFields.includes('stats')) {
                    query = query.select('+teamStats +playerStats');
                }
                if (includeFields.includes('lineups')) {
                    query = query.select('+lineups');
                }
                if (includeFields.includes('officials')) {
                    query = query.select('+officials');
                }

                game = await query;

                if (!game) {
                    throw new NotFoundError(`Game with ID ${gameId} not found`);
                }

                await this.cache.set(cacheKey, game, this.cacheTimeout.gameDetails);
            }

            logger.info(`Game retrieved successfully`, {
                userId: req.user.id,
                gameId,
                teams: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`
            });

            return ApiResponse.success(res, { game }, 'Game retrieved successfully');

        } catch (error) {
            logger.error('Error getting game by ID:', error);
            next(error);
        }
    };

    /**
     * Get live game score
     * @route GET /api/nba/games/:gameId/score
     * @access FREE TIER
     */
    getGameScore = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const cacheKey = `score:${gameId}`;

            let scoreData = await this.cache.get(cacheKey);

            if (!scoreData) {
                const game = await Game.findOne({ gameId })
                    .select('gameId status score period timeRemaining homeTeam awayTeam');

                if (!game) {
                    throw new NotFoundError(`Game with ID ${gameId} not found`);
                }

                // Get live score updates if game is live
                if (game.status === 'live') {
                    const liveScore = await this.liveService.getLiveScore(gameId);
                    scoreData = {
                        ...game.toObject(),
                        liveUpdates: liveScore
                    };
                } else {
                    scoreData = game.toObject();
                }

                // Cache for shorter time if game is live
                const cacheTime = game.status === 'live' ? this.cacheTimeout.scores : this.cacheTimeout.games;
                await this.cache.set(cacheKey, scoreData, cacheTime);
            }

            logger.info(`Game score retrieved successfully`, {
                userId: req.user.id,
                gameId,
                status: scoreData.status
            });

            return ApiResponse.success(res, {
                score: scoreData,
                meta: {
                    gameId,
                    isLive: scoreData.status === 'live',
                    lastUpdated: new Date()
                }
            }, 'Game score retrieved successfully');

        } catch (error) {
            logger.error('Error getting game score:', error);
            next(error);
        }
    };

    /**
     * Get games schedule
     * @route GET /api/nba/games/schedule
     * @access FREE TIER
     */
    getSchedule = async (req, res, next) => {
        try {
            const { from, to, team } = req.query;
            const cacheKey = `schedule:${from || 'current'}:${to || 'week'}:${team || 'all'}`;

            let schedule = await this.cache.get(cacheKey);

            if (!schedule) {
                const filters = {};

                if (from || to) {
                    filters.gameDate = {};
                    if (from) filters.gameDate.$gte = new Date(from);
                    if (to) filters.gameDate.$lte = new Date(to);
                } else {
                    // Default to next 7 days
                    const today = new Date();
                    const nextWeek = new Date(today);
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    filters.gameDate = {
                        $gte: today,
                        $lte: nextWeek
                    };
                }

                if (team) {
                    filters.$or = [
                        { 'homeTeam.abbreviation': team.toUpperCase() },
                        { 'awayTeam.abbreviation': team.toUpperCase() }
                    ];
                }

                const games = await Game.find(filters)
                    .select('gameId gameDate homeTeam awayTeam status venue')
                    .sort({ gameDate: 1 });

                schedule = {
                    games,
                    meta: {
                        dateRange: { from, to },
                        team,
                        totalGames: games.length
                    }
                };

                await this.cache.set(cacheKey, schedule, this.cacheTimeout.schedule);
            }

            logger.info(`Games schedule retrieved successfully`, {
                userId: req.user.id,
                gameCount: schedule.games.length,
                dateRange: { from, to }
            });

            return ApiResponse.success(res, schedule, 'Games schedule retrieved successfully');

        } catch (error) {
            logger.error('Error getting games schedule:', error);
            next(error);
        }
    };

    // =========================================================================
    // STANDARD TIER ENDPOINTS
    // =========================================================================

    /**
     * Get detailed game box score
     * @route GET /api/nba/games/:gameId/boxscore
     * @access STANDARD TIER
     */
    getBoxScore = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { format = 'detailed' } = req.query;
            const cacheKey = `boxscore:${gameId}:${format}`;

            let boxScore = await this.cache.get(cacheKey);

            if (!boxScore) {
                const game = await Game.findOne({ gameId })
                    .select('gameId homeTeam awayTeam score teamStats playerStats');

                if (!game) {
                    throw new NotFoundError(`Game with ID ${gameId} not found`);
                }

                boxScore = await this.nbaService.getGameBoxScore(gameId, { format });

                await this.cache.set(cacheKey, boxScore, this.cacheTimeout.boxScore);
            }

            logger.info(`Box score retrieved successfully`, {
                userId: req.user.id,
                gameId,
                format
            });

            return ApiResponse.success(res, {
                boxScore,
                meta: {
                    gameId,
                    format,
                    lastUpdated: boxScore.lastUpdated
                }
            }, 'Box score retrieved successfully');

        } catch (error) {
            logger.error('Error getting box score:', error);
            next(error);
        }
    };

    /**
     * Get team statistics for game
     * @route GET /api/nba/games/:gameId/team-stats
     * @access STANDARD TIER
     */
    getTeamStats = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { team, period } = req.query;
            const cacheKey = `team-stats:${gameId}:${team || 'both'}:${period || 'game'}`;

            let teamStats = await this.cache.get(cacheKey);

            if (!teamStats) {
                teamStats = await this.nbaService.getGameTeamStats(gameId, {
                    team,
                    period
                });

                await this.cache.set(cacheKey, teamStats, this.cacheTimeout.stats);
            }

            logger.info(`Team stats retrieved successfully`, {
                userId: req.user.id,
                gameId,
                team,
                period
            });

            return ApiResponse.success(res, {
                teamStats,
                meta: {
                    gameId,
                    team,
                    period
                }
            }, 'Team statistics retrieved successfully');

        } catch (error) {
            logger.error('Error getting team stats:', error);
            next(error);
        }
    };

    /**
     * Get player statistics for game
     * @route GET /api/nba/games/:gameId/player-stats
     * @access STANDARD TIER
     */
    getPlayerStats = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { team, position, starter } = req.query;
            const cacheKey = `player-stats:${gameId}:${team || 'both'}:${position || 'all'}:${starter || 'all'}`;

            let playerStats = await this.cache.get(cacheKey);

            if (!playerStats) {
                playerStats = await this.nbaService.getGamePlayerStats(gameId, {
                    team,
                    position,
                    starter: starter === 'true'
                });

                await this.cache.set(cacheKey, playerStats, this.cacheTimeout.stats);
            }

            logger.info(`Player stats retrieved successfully`, {
                userId: req.user.id,
                gameId,
                playerCount: playerStats.players.length
            });

            return ApiResponse.success(res, {
                playerStats,
                meta: {
                    gameId,
                    filters: { team, position, starter },
                    playerCount: playerStats.players.length
                }
            }, 'Player statistics retrieved successfully');

        } catch (error) {
            logger.error('Error getting player stats:', error);
            next(error);
        }
    };

    /**
     * Get game timeline
     * @route GET /api/nba/games/:gameId/timeline
     * @access STANDARD TIER
     */
    getGameTimeline = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { period, eventType } = req.query;
            const cacheKey = `timeline:${gameId}:${period || 'all'}:${eventType || 'all'}`;

            let timeline = await this.cache.get(cacheKey);

            if (!timeline) {
                timeline = await this.nbaService.getGameTimeline(gameId, {
                    period,
                    eventType
                });

                await this.cache.set(cacheKey, timeline, this.cacheTimeout.timeline);
            }

            logger.info(`Game timeline retrieved successfully`, {
                userId: req.user.id,
                gameId,
                eventCount: timeline.events.length
            });

            return ApiResponse.success(res, {
                timeline,
                meta: {
                    gameId,
                    filters: { period, eventType },
                    eventCount: timeline.events.length
                }
            }, 'Game timeline retrieved successfully');

        } catch (error) {
            logger.error('Error getting game timeline:', error);
            next(error);
        }
    };

    /**
     * Get historical games
     * @route GET /api/nba/games/historical
     * @access STANDARD TIER
     */
    getHistoricalGames = async (req, res, next) => {
        try {
            const { season, team, opponent, limit = 50 } = req.query;
            const cacheKey = `historical:${season || 'all'}:${team || 'all'}:${opponent || 'all'}:${limit}`;

            let historicalGames = await this.cache.get(cacheKey);

            if (!historicalGames) {
                const filters = { status: 'finished' };

                if (season) {
                    filters.season = season;
                }

                if (team) {
                    filters.$or = [
                        { 'homeTeam.abbreviation': team.toUpperCase() },
                        { 'awayTeam.abbreviation': team.toUpperCase() }
                    ];
                }

                if (opponent) {
                    if (team) {
                        filters.$and = [
                            { $or: filters.$or },
                            {
                                $or: [
                                    { 'homeTeam.abbreviation': opponent.toUpperCase() },
                                    { 'awayTeam.abbreviation': opponent.toUpperCase() }
                                ]
                            }
                        ];
                        delete filters.$or;
                    } else {
                        filters.$or = [
                            { 'homeTeam.abbreviation': opponent.toUpperCase() },
                            { 'awayTeam.abbreviation': opponent.toUpperCase() }
                        ];
                    }
                }

                const games = await Game.find(filters)
                    .select('gameId gameDate homeTeam awayTeam score')
                    .limit(parseInt(limit))
                    .sort({ gameDate: -1 });

                historicalGames = {
                    games,
                    meta: {
                        filters: { season, team, opponent },
                        count: games.length,
                        limit: parseInt(limit)
                    }
                };

                await this.cache.set(cacheKey, historicalGames, this.cacheTimeout.historical);
            }

            logger.info(`Historical games retrieved successfully`, {
                userId: req.user.id,
                gameCount: historicalGames.games.length,
                filters: { season, team, opponent }
            });

            return ApiResponse.success(res, historicalGames, 'Historical games retrieved successfully');

        } catch (error) {
            logger.error('Error getting historical games:', error);
            next(error);
        }
    };

    // =========================================================================
    // PREMIUM TIER ENDPOINTS
    // =========================================================================

    /**
     * Get detailed play-by-play data
     * @route GET /api/nba/games/:gameId/play-by-play
     * @access PREMIUM TIER
     */
    getPlayByPlay = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { period, team, video = false } = req.query;
            const cacheKey = `play-by-play:${gameId}:${period || 'all'}:${team || 'all'}:${video}`;

            let playByPlay = await this.cache.get(cacheKey);

            if (!playByPlay) {
                playByPlay = await this.nbaService.getPlayByPlay(gameId, {
                    period,
                    team,
                    includeVideo: video === 'true'
                });

                await this.cache.set(cacheKey, playByPlay, this.cacheTimeout.playByPlay);
            }

            logger.info(`Play-by-play retrieved successfully`, {
                userId: req.user.id,
                gameId,
                playCount: playByPlay.plays.length
            });

            return ApiResponse.success(res, {
                playByPlay,
                meta: {
                    gameId,
                    filters: { period, team, video },
                    playCount: playByPlay.plays.length
                }
            }, 'Play-by-play data retrieved successfully');

        } catch (error) {
            logger.error('Error getting play-by-play:', error);
            next(error);
        }
    };

    /**
     * Get real-time live tracking
     * @route GET /api/nba/games/:gameId/live-tracking
     * @access PREMIUM TIER
     */
    getLiveTracking = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { positions = true, ball = true } = req.query;
            const cacheKey = `live-tracking:${gameId}:${positions}:${ball}`;

            let liveTracking = await this.cache.get(cacheKey);

            if (!liveTracking) {
                liveTracking = await this.liveService.getLiveTracking(gameId, {
                    includePositions: positions === 'true',
                    includeBall: ball === 'true'
                });

                await this.cache.set(cacheKey, liveTracking, this.cacheTimeout.liveTracking);
            }

            logger.info(`Live tracking retrieved successfully`, {
                userId: req.user.id,
                gameId,
                timestamp: liveTracking.timestamp
            });

            return ApiResponse.success(res, {
                liveTracking,
                meta: {
                    gameId,
                    isRealTime: true,
                    timestamp: liveTracking.timestamp
                }
            }, 'Live tracking data retrieved successfully');

        } catch (error) {
            logger.error('Error getting live tracking:', error);
            next(error);
        }
    };

    /**
     * Get advanced game statistics
     * @route GET /api/nba/games/:gameId/advanced-stats
     * @access PREMIUM TIER
     */
    getAdvancedStats = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { metrics, team } = req.query;
            const cacheKey = `advanced-stats:${gameId}:${metrics || 'all'}:${team || 'both'}`;

            let advancedStats = await this.cache.get(cacheKey);

            if (!advancedStats) {
                advancedStats = await this.analytics.getGameAdvancedStats(gameId, {
                    metrics: metrics ? metrics.split(',') : null,
                    team
                });

                await this.cache.set(cacheKey, advancedStats, this.cacheTimeout.stats);
            }

            logger.info(`Advanced stats retrieved successfully`, {
                userId: req.user.id,
                gameId,
                metricsCount: Object.keys(advancedStats.metrics).length
            });

            return ApiResponse.success(res, {
                advancedStats,
                meta: {
                    gameId,
                    team,
                    metricsIncluded: Object.keys(advancedStats.metrics)
                }
            }, 'Advanced statistics retrieved successfully');

        } catch (error) {
            logger.error('Error getting advanced stats:', error);
            next(error);
        }
    };

    /**
     * Get game predictions
     * @route GET /api/nba/games/:gameId/predictions
     * @access PREMIUM TIER
     */
    getGamePredictions = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { model = 'advanced', live = false } = req.query;
            const cacheKey = `predictions:${gameId}:${model}:${live}`;

            let predictions = await this.cache.get(cacheKey);

            if (!predictions) {
                predictions = await this.predictions.getGamePredictions(gameId, {
                    model,
                    includeLive: live === 'true'
                });

                await this.cache.set(cacheKey, predictions, this.cacheTimeout.predictions);
            }

            logger.info(`Game predictions retrieved successfully`, {
                userId: req.user.id,
                gameId,
                model,
                confidence: predictions.confidence
            });

            return ApiResponse.success(res, {
                predictions,
                meta: {
                    gameId,
                    model,
                    confidence: predictions.confidence,
                    isLive: live === 'true'
                }
            }, 'Game predictions retrieved successfully');

        } catch (error) {
            logger.error('Error getting game predictions:', error);
            next(error);
        }
    };

    /**
     * Get game momentum analysis
     * @route GET /api/nba/games/:gameId/momentum
     * @access PREMIUM TIER
     */
    getGameMomentum = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { period, metric = 'overall' } = req.query;
            const cacheKey = `momentum:${gameId}:${period || 'all'}:${metric}`;

            let momentum = await this.cache.get(cacheKey);

            if (!momentum) {
                momentum = await this.analytics.getGameMomentum(gameId, {
                    period,
                    metric
                });

                await this.cache.set(cacheKey, momentum, this.cacheTimeout.momentum);
            }

            logger.info(`Game momentum retrieved successfully`, {
                userId: req.user.id,
                gameId,
                metric
            });

            return ApiResponse.success(res, {
                momentum,
                meta: {
                    gameId,
                    period,
                    metric
                }
            }, 'Game momentum analysis retrieved successfully');

        } catch (error) {
            logger.error('Error getting game momentum:', error);
            next(error);
        }
    };

    /**
     * Get all live games
     * @route GET /api/nba/games/live
     * @access PREMIUM TIER
     */
    getLiveGames = async (req, res, next) => {
        try {
            const { detailed = false, tracking = false } = req.query;
            const cacheKey = `live-games:${detailed}:${tracking}`;

            let liveGames = await this.cache.get(cacheKey);

            if (!liveGames) {
                const games = await Game.find({ status: 'live' })
                    .select('gameId homeTeam awayTeam score period timeRemaining');

                if (detailed === 'true' || tracking === 'true') {
                    const detailedGames = await Promise.all(
                        games.map(async (game) => {
                            const gameData = { ...game.toObject() };
                            
                            if (detailed === 'true') {
                                gameData.liveStats = await this.liveService.getLiveStats(game.gameId);
                            }
                            
                            if (tracking === 'true') {
                                gameData.tracking = await this.liveService.getLiveTracking(game.gameId);
                            }
                            
                            return gameData;
                        })
                    );
                    liveGames = { games: detailedGames };
                } else {
                    liveGames = { games };
                }

                liveGames.meta = {
                    count: games.length,
                    detailed: detailed === 'true',
                    tracking: tracking === 'true',
                    lastUpdated: new Date()
                };

                await this.cache.set(cacheKey, liveGames, this.cacheTimeout.todaysGames);
            }

            logger.info(`Live games retrieved successfully`, {
                userId: req.user.id,
                gameCount: liveGames.games.length,
                detailed,
                tracking
            });

            return ApiResponse.success(res, liveGames, 'Live games retrieved successfully');

        } catch (error) {
            logger.error('Error getting live games:', error);
            next(error);
        }
    };

    /**
     * Get clutch time statistics
     * @route GET /api/nba/games/:gameId/clutch-stats
     * @access PREMIUM TIER
     */
    getClutchStats = async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { definition = 'last5min', team } = req.query;
            const cacheKey = `clutch-stats:${gameId}:${definition}:${team || 'both'}`;

            let clutchStats = await this.cache.get(cacheKey);

            if (!clutchStats) {
                clutchStats = await this.analytics.getClutchStats(gameId, {
                    definition,
                    team
                });

                await this.cache.set(cacheKey, clutchStats, this.cacheTimeout.clutch);
            }

            logger.info(`Clutch stats retrieved successfully`, {
                userId: req.user.id,
                gameId,
                definition,
                team
            });

            return ApiResponse.success(res, {
                clutchStats,
                meta: {
                    gameId,
                    definition,
                    team
                }
            }, 'Clutch statistics retrieved successfully');

        } catch (error) {
            logger.error('Error getting clutch stats:', error);
            next(error);
        }
    };
}

module.exports = new GamesController();
