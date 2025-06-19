const Team = require('./teams.model');
const { ApiResponse } = require('../../../../utils/apiResponse');
const { logger } = require('../../../../utils/logger');
const { NBADataService } = require('../../../../services/nbaData.service');
const { CacheService } = require('../../../../services/cache.service');
const { ValidationError, NotFoundError } = require('../../../../utils/errors');

// =============================================================================
// NBA TEAMS API CONTROLLER
// =============================================================================
// This file contains all controller functions for NBA Teams API endpoints
// Handles data retrieval, processing, caching, and response formatting
// Integrates with external NBA data sources and internal database
// =============================================================================

class TeamsController {
    constructor() {
        this.nbaService = new NBADataService();
        this.cache = new CacheService();
        this.cacheTimeout = {
            teams: 3600, // 1 hour
            roster: 1800, // 30 minutes
            stats: 900, // 15 minutes
            schedule: 300, // 5 minutes
            standings: 600, // 10 minutes
            analytics: 300, // 5 minutes
            injuries: 180, // 3 minutes
            trades: 1800 // 30 minutes
        };
    }

    // =========================================================================
    // FREE TIER ENDPOINTS
    // =========================================================================

    /**
     * Get all NBA teams
     * @route GET /api/nba/teams
     * @access FREE TIER
     */
    getAllTeams = async (req, res, next) => {
        try {
            const { conference, division, active } = req.query;
            const cacheKey = `teams:all:${conference || 'all'}:${division || 'all'}:${active || 'all'}`;

            // Check cache first
            let teams = await this.cache.get(cacheKey);
            
            if (!teams) {
                // Get from database/external API
                teams = await this.nbaService.getAllTeams({
                    conference,
                    division,
                    active: active !== 'false'
                });

                // Cache the results
                await this.cache.set(cacheKey, teams, this.cacheTimeout.teams);
            }

            logger.info(`Teams retrieved successfully`, {
                userId: req.user.id,
                count: teams.length,
                filters: { conference, division, active }
            });

            return ApiResponse.success(res, {
                teams,
                meta: {
                    total: teams.length,
                    filters: { conference, division, active },
                    cached: !!teams.cached
                }
            }, 'Teams retrieved successfully');

        } catch (error) {
            logger.error('Error getting all teams:', error);
            next(error);
        }
    };

    /**
     * Get specific team by ID
     * @route GET /api/nba/teams/:teamId
     * @access FREE TIER
     */
    getTeamById = async (req, res, next) => {
        try {
            const { teamId } = req.params;
            const { include } = req.query;
            const cacheKey = `team:${teamId}:${include || 'basic'}`;

            let team = await this.cache.get(cacheKey);

            if (!team) {
                team = await this.nbaService.getTeamById(teamId, {
                    include: include ? include.split(',') : []
                });

                if (!team) {
                    throw new NotFoundError(`Team with ID ${teamId} not found`);
                }

                await this.cache.set(cacheKey, team, this.cacheTimeout.teams);
            }

            logger.info(`Team retrieved successfully`, {
                userId: req.user.id,
                teamId,
                include
            });

            return ApiResponse.success(res, { team }, 'Team retrieved successfully');

        } catch (error) {
            logger.error('Error getting team by ID:', error);
            next(error);
        }
    };

    /**
     * Get team roster
     * @route GET /api/nba/teams/:teamId/roster
     * @access FREE TIER
     */
    getTeamRoster = async (req, res, next) => {
        try {
            const { teamId } = req.params;
            const { season, position, status } = req.query;
            const cacheKey = `roster:${teamId}:${season || 'current'}:${position || 'all'}:${status || 'active'}`;

            let roster = await this.cache.get(cacheKey);

            if (!roster) {
                roster = await this.nbaService.getTeamRoster(teamId, {
                    season,
                    position,
                    status
                });

                await this.cache.set(cacheKey, roster, this.cacheTimeout.roster);
            }

            logger.info(`Team roster retrieved successfully`, {
                userId: req.user.id,
                teamId,
                playerCount: roster.players.length
            });

            return ApiResponse.success(res, {
                roster,
                meta: {
                    teamId,
                    season: season || 'current',
                    playerCount: roster.players.length,
                    lastUpdated: roster.lastUpdated
                }
            }, 'Team roster retrieved successfully');

        } catch (error) {
            logger.error('Error getting team roster:', error);
            next(error);
        }
    };

    // =========================================================================
    // STANDARD TIER ENDPOINTS
    // =========================================================================

    /**
     * Get team statistics
     * @route GET /api/nba/teams/:teamId/stats
     * @access STANDARD TIER
     */
    getTeamStats = async (req, res, next) => {
        try {
            const { teamId } = req.params;
            const { season, type, split } = req.query;
            const cacheKey = `stats:${teamId}:${season || 'current'}:${type || 'regular'}:${split || 'total'}`;

            let stats = await this.cache.get(cacheKey);

            if (!stats) {
                stats = await this.nbaService.getTeamStats(teamId, {
                    season,
                    type, // regular, playoffs, preseason
                    split // home, away, total
                });

                await this.cache.set(cacheKey, stats, this.cacheTimeout.stats);
            }

            logger.info(`Team stats retrieved successfully`, {
                userId: req.user.id,
                teamId,
                season,
                type,
                split
            });

            return ApiResponse.success(res, {
                stats,
                meta: {
                    teamId,
                    season: season || 'current',
                    type: type || 'regular',
                    split: split || 'total'
                }
            }, 'Team statistics retrieved successfully');

        } catch (error) {
            logger.error('Error getting team stats:', error);
            next(error);
        }
    };

    /**
     * Get team schedule
     * @route GET /api/nba/teams/:teamId/schedule
     * @access STANDARD TIER
     */
    getTeamSchedule = async (req, res, next) => {
        try {
            const { teamId } = req.params;
            const { from, to, status, limit = 50 } = req.query;
            const cacheKey = `schedule:${teamId}:${from || 'now'}:${to || 'season'}:${status || 'all'}:${limit}`;

            let schedule = await this.cache.get(cacheKey);

            if (!schedule) {
                schedule = await this.nbaService.getTeamSchedule(teamId, {
                    from,
                    to,
                    status,
                    limit: parseInt(limit)
                });

                await this.cache.set(cacheKey, schedule, this.cacheTimeout.schedule);
            }

            logger.info(`Team schedule retrieved successfully`, {
                userId: req.user.id,
                teamId,
                gameCount: schedule.games.length
            });

            return ApiResponse.success(res, {
                schedule,
                meta: {
                    teamId,
                    gameCount: schedule.games.length,
                    dateRange: { from, to },
                    status
                }
            }, 'Team schedule retrieved successfully');

        } catch (error) {
            logger.error('Error getting team schedule:', error);
            next(error);
        }
    };

    /**
     * Get team standings
     * @route GET /api/nba/teams/:teamId/standings
     * @access STANDARD TIER
     */
    getTeamStandings = async (req, res, next) => {
        try {
            const { teamId } = req.params;
            const { season, type } = req.query;
            const cacheKey = `standings:${teamId}:${season || 'current'}:${type || 'regular'}`;

            let standings = await this.cache.get(cacheKey);

            if (!standings) {
                standings = await this.nbaService.getTeamStandings(teamId, {
                    season,
                    type
                });

                await this.cache.set(cacheKey, standings, this.cacheTimeout.standings);
            }

            logger.info(`Team standings retrieved successfully`, {
                userId: req.user.id,
                teamId,
                conferenceRank: standings.conferenceRank,
                divisionRank: standings.divisionRank
            });

            return ApiResponse.success(res, {
                standings,
                meta: {
                    teamId,
                    season: season || 'current',
                    lastUpdated: standings.lastUpdated
                }
            }, 'Team standings retrieved successfully');

        } catch (error) {
            logger.error('Error getting team standings:', error);
            next(error);
        }
    };

    // =========================================================================
    // PREMIUM TIER ENDPOINTS
    // =========================================================================

    /**
     * Get team analytics
     * @route GET /api/nba/teams/:teamId/analytics
     * @access PREMIUM TIER
     */
    getTeamAnalytics = async (req, res, next) => {
        try {
            const { teamId } = req.params;
            const { metrics, period = 'season' } = req.query;
            const cacheKey = `analytics:${teamId}:${metrics || 'all'}:${period}`;

            let analytics = await this.cache.get(cacheKey);

            if (!analytics) {
                analytics = await this.nbaService.getTeamAnalytics(teamId, {
                    metrics: metrics ? metrics.split(',') : null,
                    period
                });

                await this.cache.set(cacheKey, analytics, this.cacheTimeout.analytics);
            }

            logger.info(`Team analytics retrieved successfully`, {
                userId: req.user.id,
                teamId,
                metricsCount: Object.keys(analytics.metrics).length
            });

            return ApiResponse.success(res, {
                analytics,
                meta: {
                    teamId,
                    period,
                    metricsIncluded: Object.keys(analytics.metrics)
                }
            }, 'Team analytics retrieved successfully');

        } catch (error) {
            logger.error('Error getting team analytics:', error);
            next(error);
        }
    };

    /**
     * Get team injuries
     * @route GET /api/nba/teams/:teamId/injuries
     * @access PREMIUM TIER
     */
    getTeamInjuries = async (req, res, next) => {
        try {
            const { teamId } = req.params;
            const { status, severity } = req.query;
            const cacheKey = `injuries:${teamId}:${status || 'all'}:${severity || 'all'}`;

            let injuries = await this.cache.get(cacheKey);

            if (!injuries) {
                injuries = await this.nbaService.getTeamInjuries(teamId, {
                    status,
                    severity
                });

                await this.cache.set(cacheKey, injuries, this.cacheTimeout.injuries);
            }

            logger.info(`Team injuries retrieved successfully`, {
                userId: req.user.id,
                teamId,
                injuryCount: injuries.injuries.length
            });

            return ApiResponse.success(res, {
                injuries,
                meta: {
                    teamId,
                    injuryCount: injuries.injuries.length,
                    lastUpdated: injuries.lastUpdated
                }
            }, 'Team injuries retrieved successfully');

        } catch (error) {
            logger.error('Error getting team injuries:', error);
            next(error);
        }
    };

    /**
     * Get team trades
     * @route GET /api/nba/teams/:teamId/trades
     * @access PREMIUM TIER
     */
    getTeamTrades = async (req, res, next) => {
        try {
            const { teamId } = req.params;
            const { type = 'all', limit = 20 } = req.query;
            const cacheKey = `trades:${teamId}:${type}:${limit}`;

            let trades = await this.cache.get(cacheKey);

            if (!trades) {
                trades = await this.nbaService.getTeamTrades(teamId, {
                    type,
                    limit: parseInt(limit)
                });

                await this.cache.set(cacheKey, trades, this.cacheTimeout.trades);
            }

            logger.info(`Team trades retrieved successfully`, {
                userId: req.user.id,
                teamId,
                tradeCount: trades.trades.length
            });

            return ApiResponse.success(res, {
                trades,
                meta: {
                    teamId,
                    type,
                    tradeCount: trades.trades.length,
                    limit: parseInt(limit)
                }
            }, 'Team trades retrieved successfully');

        } catch (error) {
            logger.error('Error getting team trades:', error);
            next(error);
        }
    };

    /**
     * Compare multiple teams
     * @route GET /api/nba/teams/compare
     * @access PREMIUM TIER
     */
    compareTeams = async (req, res, next) => {
        try {
            const { teams, metrics, season } = req.query;
            const teamIds = teams.split(',');
            const cacheKey = `compare:${teams}:${metrics || 'basic'}:${season || 'current'}`;

            let comparison = await this.cache.get(cacheKey);

            if (!comparison) {
                comparison = await this.nbaService.compareTeams(teamIds, {
                    metrics: metrics ? metrics.split(',') : null,
                    season
                });

                await this.cache.set(cacheKey, comparison, this.cacheTimeout.stats);
            }

            logger.info(`Team comparison retrieved successfully`, {
                userId: req.user.id,
                teamIds,
                metricsCount: Object.keys(comparison.metrics).length
            });

            return ApiResponse.success(res, {
                comparison,
                meta: {
                    teamsCompared: teamIds,
                    season: season || 'current',
                    metricsIncluded: Object.keys(comparison.metrics)
                }
            }, 'Team comparison retrieved successfully');

        } catch (error) {
            logger.error('Error comparing teams:', error);
            next(error);
        }
    };
}

module.exports = new TeamsController();
