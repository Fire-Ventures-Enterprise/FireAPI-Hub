const mongoose = require('mongoose');

// Weather conditions schema
const WeatherSchema = new mongoose.Schema({
    temperature: { type: Number, default: null },
    humidity: { type: Number, default: null },
    windSpeed: { type: Number, default: null },
    conditions: { type: String, default: 'indoor' },
    impact: { type: String, enum: ['none', 'low', 'moderate', 'high'], default: 'none' },
    lastUpdated: { type: Date, default: Date.now }
});

// Head-to-head history schema
const H2HSchema = new mongoose.Schema({
    totalGames: { type: Number, default: 0 },
    homeTeamWins: { type: Number, default: 0 },
    awayTeamWins: { type: Number, default: 0 },
    averagePointsHome: { type: Number, default: 0 },
    averagePointsAway: { type: Number, default: 0 },
    lastMeeting: { type: Date, default: null },
    recentForm: [{ 
        date: Date,
        homeScore: Number,
        awayScore: Number,
        winner: String
    }]
});

// Referee information schema
const RefereeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    experience: { type: Number, default: 0 },
    averageFoulsPerGame: { type: Number, default: 0 },
    averageTechnicals: { type: Number, default: 0 },
    homeTeamBias: { type: Number, default: 0 }, // -1 to 1 scale
    impact: { type: String, enum: ['low', 'moderate', 'high'], default: 'moderate' }
});

// Player statistics schema
const PlayerStatsSchema = new mongoose.Schema({
    playerId: { type: String, required: true },
    name: { type: String, required: true },
    team: { type: String, required: true },
    position: { type: String, required: true },
    stats: {
        pointsPerGame: { type: Number, default: 0 },
        assistsPerGame: { type: Number, default: 0 },
        reboundsPerGame: { type: Number, default: 0 },
        fieldGoalPercentage: { type: Number, default: 0 },
        threePointPercentage: { type: Number, default: 0 },
        freeThrowPercentage: { type: Number, default: 0 }
    },
    recentForm: {
        last5Games: { type: Number, default: 0 },
        last10Games: { type: Number, default: 0 },
        trend: { type: String, enum: ['improving', 'declining', 'stable'], default: 'stable' }
    }
});

// Team statistics schema
const TeamStatsSchema = new mongoose.Schema({
    teamId: { type: String, required: true },
    name: { type: String, required: true },
    abbreviation: { type: String, required: true },
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        winPercentage: { type: Number, default: 0 },
        pointsPerGame: { type: Number, default: 0 },
        pointsAllowedPerGame: { type: Number, default: 0 },
        fieldGoalPercentage: { type: Number, default: 0 },
        threePointPercentage: { type: Number, default: 0 },
        freeThrowPercentage: { type: Number, default: 0 },
        reboundsPerGame: { type: Number, default: 0 },
        assistsPerGame: { type: Number, default: 0 }
    },
    homeRecord: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        winPercentage: { type: Number, default: 0 }
    },
    awayRecord: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        winPercentage: { type: Number, default: 0 }
    }
});

// Injury report schema
const InjurySchema = new mongoose.Schema({
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    team: { type: String, required: true },
    injuryType: { type: String, required: true },
    status: { type: String, enum: ['out', 'doubtful', 'questionable', 'probable', 'healthy'], required: true },
    expectedReturn: { type: Date, default: null },
    impact: { type: String, enum: ['low', 'moderate', 'high', 'critical'], default: 'moderate' },
    lastUpdated: { type: Date, default: Date.now }
});

// Betting odds schema
const OddsSchema = new mongoose.Schema({
    moneyline: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 }
    },
    spread: {
        points: { type: Number, default: 0 },
        homeOdds: { type: Number, default: -110 },
        awayOdds: { type: Number, default: -110 }
    },
    total: {
        points: { type: Number, default: 0 },
        overOdds: { type: Number, default: -110 },
        underOdds: { type: Number, default: -110 }
    },
    lastUpdated: { type: Date, default: Date.now }
});

// Live scores schema
const LiveScoreSchema = new mongoose.Schema({
    quarter: { type: Number, default: 1 },
    timeRemaining: { type: String, default: '12:00' },
    homeScore: { type: Number, default: 0 },
    awayScore: { type: Number, default: 0 },
    quarterScores: [{
        quarter: Number,
        homeScore: Number,
        awayScore: Number
    }],
    gameStatus: { type: String, enum: ['scheduled', 'live', 'halftime', 'final'], default: 'scheduled' },
    lastUpdated: { type: Date, default: Date.now }
});

// Prediction data schema
const PredictionSchema = new mongoose.Schema({
    winProbability: {
        home: { type: Number, min: 0, max: 100, required: true },
        away: { type: Number, min: 0, max: 100, required: true }
    },
    predictedScore: {
        home: { type: Number, required: true },
        away: { type: Number, required: true }
    },
    confidence: { type: String, enum: ['low', 'moderate', 'high'], required: true },
    keyFactors: [{ type: String }],
    apiContributions: {
        weather: { type: Number, default: 0 },
        h2h: { type: Number, default: 0 },
        referee: { type: Number, default: 0 },
        playerStats: { type: Number, default: 0 },
        teamStats: { type: Number, default: 0 },
        injuries: { type: Number, default: 0 },
        odds: { type: Number, default: 0 },
        schedule: { type: Number, default: 0 },
        recentForm: { type: Number, default: 0 },
        props: { type: Number, default: 0 },
        news: { type: Number, default: 0 },
        historical: { type: Number, default: 0 }
    },
    generatedAt: { type: Date, default: Date.now }
});

// Main Game schema
const GameSchema = new mongoose.Schema({
    gameId: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    season: { type: String, required: true },
    gameType: { type: String, enum: ['regular', 'playoff', 'preseason'], default: 'regular' },
    
    // Teams
    homeTeam: { type: TeamStatsSchema, required: true },
    awayTeam: { type: TeamStatsSchema, required: true },
    
    // Venue
    venue: {
        name: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        capacity: { type: Number, default: 20000 }
    },
    
    // All 12 API data points
    weather: WeatherSchema,
    h2h: H2HSchema,
    referees: [RefereeSchema],
    playerStats: [PlayerStatsSchema],
    injuries: [InjurySchema],
    odds: OddsSchema,
    liveScore: LiveScoreSchema,
    prediction: PredictionSchema,
    
    // Metadata
    dataQuality: {
        completeness: { type: Number, min: 0, max: 100, default: 0 },
        freshness: { type: Date, default: Date.now },
        sources: [{ type: String }]
    },
    
    lastUpdated: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    indexes: [
        { gameId: 1 },
        { date: 1 },
        { 'homeTeam.teamId': 1 },
        { 'awayTeam.teamId': 1 },
        { season: 1 }
    ]
});

// Static methods
GameSchema.statics.findByTeam = function(teamId) {
    return this.find({
        $or: [
            { 'homeTeam.teamId': teamId },
            { 'awayTeam.teamId': teamId }
        ]
    });
};

GameSchema.statics.findByDate = function(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.find({
        date: { $gte: startOfDay, $lte: endOfDay }
    });
};

GameSchema.statics.findUpcoming = function() {
    return this.find({
        date: { $gte: new Date() },
        'liveScore.gameStatus': 'scheduled'
    }).sort({ date: 1 });
};

// Instance methods
GameSchema.methods.updateDataQuality = function() {
    const requiredFields = ['weather', 'h2h', 'referees', 'playerStats', 'injuries', 'odds'];
    let completeness = 0;
    
    requiredFields.forEach(field => {
        if (this[field] && Object.keys(this[field]).length > 0) {
            completeness += 100 / requiredFields.length;
        }
    });
    
    this.dataQuality.completeness = Math.round(completeness);
    this.dataQuality.freshness = new Date();
};

module.exports = mongoose.model('Game', GameSchema);

