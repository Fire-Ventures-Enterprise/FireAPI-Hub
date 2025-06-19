const mongoose = require('mongoose');
const { Schema } = mongoose;

// =============================================================================
// NBA TEAMS MONGODB MODEL
// =============================================================================
// This file defines the MongoDB schema for NBA Teams data
// Includes team information, statistics, roster data, and analytics
// Optimized with indexes for fast queries and data retrieval
// =============================================================================

// Player sub-schema for roster
const PlayerSchema = new Schema({
    playerId: {
        type: String,
        required: true,
        index: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    jerseyNumber: {
        type: String,
        required: true
    },
    position: {
        type: String,
        required: true,
        enum: ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F']
    },
    height: {
        feet: { type: Number, required: true },
        inches: { type: Number, required: true }
    },
    weight: {
        type: Number,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    experience: {
        type: Number,
        default: 0
    },
    college: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        default: 'USA',
        trim: true
    },
    salary: {
        amount: { type: Number },
        currency: { type: String, default: 'USD' }
    },
    contract: {
        years: { type: Number },
        value: { type: Number },
        type: { type: String, enum: ['rookie', 'veteran', 'max', 'minimum'] }
    },
    status: {
        type: String,
        enum: ['active', 'injured', 'suspended', 'inactive'],
        default: 'active'
    },
    injury: {
        type: { type: String },
        description: { type: String },
        expectedReturn: { type: Date },
        severity: { type: String, enum: ['minor', 'moderate', 'major'] }
    }
}, { _id: false });

// Team statistics sub-schema
const StatsSchema = new Schema({
    season: {
        type: String,
        required: true
    },
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    winPercentage: { type: Number, default: 0 },
    pointsFor: { type: Number, default: 0 },
    pointsAgainst: { type: Number, default: 0 },
    pointsDifference: { type: Number, default: 0 },
    fieldGoals: {
        made: { type: Number, default: 0 },
        attempted: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }
    },
    threePointers: {
        made: { type: Number, default: 0 },
        attempted: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }
    },
    freeThrows: {
        made: { type: Number, default: 0 },
        attempted: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 }
    },
    rebounds: {
        offensive: { type: Number, default: 0 },
        defensive: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    assists: { type: Number, default: 0 },
    steals: { type: Number, default: 0 },
    blocks: { type: Number, default: 0 },
    turnovers: { type: Number, default: 0 },
    fouls: { type: Number, default: 0 },
    // Advanced metrics
    offensiveRating: { type: Number, default: 0 },
    defensiveRating: { type: Number, default: 0 },
    netRating: { type: Number, default: 0 },
    pace: { type: Number, default: 0 },
    trueShootingPercentage: { type: Number, default: 0 },
    effectiveFieldGoalPercentage: { type: Number, default: 0 }
}, { _id: false });

// Standings sub-schema
const StandingsSchema = new Schema({
    season: {
        type: String,
        required: true
    },
    conference: {
        name: { type: String, enum: ['Eastern', 'Western'] },
        rank: { type: Number },
        wins: { type: Number },
        losses: { type: Number },
        winPercentage: { type: Number },
        gamesBehind: { type: Number }
    },
    division: {
        name: { type: String },
        rank: { type: Number },
        wins: { type: Number },
        losses: { type: Number },
        winPercentage: { type: Number },
        gamesBehind: { type: Number }
    },
    homeRecord: {
        wins: { type: Number },
        losses: { type: Number }
    },
    awayRecord: {
        wins: { type: Number },
        losses: { type: Number }
    },
    streak: {
        type: { type: String, enum: ['W', 'L'] },
        count: { type: Number }
    },
    playoffPosition: {
        seed: { type: Number },
        clinched: { type: Boolean, default: false },
        eliminated: { type: Boolean, default: false }
    }
}, { _id: false });

// Main Team Schema
const TeamSchema = new Schema({
    // Basic team information
    teamId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    abbreviation: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        minlength: 2,
        maxlength: 4
    },
    teamName: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: String,
            default: 'USA',
            trim: true
        }
    },
    conference: {
        type: String,
        required: true,
        enum: ['Eastern', 'Western']
    },
    division: {
        type: String,
        required: true,
        enum: ['Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest']
    },
    
    // Team branding
    colors: {
        primary: { type: String, required: true },
        secondary: { type: String },
        accent: { type: String }
    },
    logos: {
        primary: { type: String },
        secondary: { type: String },
        wordmark: { type: String }
    },
    
    // Venue information
    venue: {
        name: {
            type: String,
            required: true
        },
        capacity: {
            type: Number,
            required: true
        },
        address: {
            street: { type: String },
            city: { type: String },
            state: { type: String },
            zipCode: { type: String },
            country: { type: String, default: 'USA' }
        },
        coordinates: {
            latitude: { type: Number },
            longitude: { type: Number }
        }
    },
    
    // Team history
    founded: {
        type: Number,
        required: true
    },
    championships: [{
        year: { type: Number },
        opponent: { type: String },
        series: { type: String }
    }],
    retiredNumbers: [{
        number: { type: String },
        player: { type: String },
        dateRetired: { type: Date }
    }],
    
    // Current roster
    roster: [PlayerSchema],
    
    // Team statistics (current and historical)
    statistics: [StatsSchema],
    
    // Current standings
    standings: [StandingsSchema],
    
    // Social media and web presence
    socialMedia: {
        website: { type: String },
        twitter: { type: String },
        facebook: { type: String },
        instagram: { type: String },
        youtube: { type: String }
    },
    
    // Team management
    management: {
        owner: { type: String },
        generalManager: { type: String },
        headCoach: {
            name: { type: String },
            hireDate: { type: Date },
            previousExperience: [{ type: String }]
        },
        assistantCoaches: [{
            name: { type: String },
            role: { type: String }
        }]
    },
    
    // Financial information (for premium tiers)
    financials: {
        payroll: {
            total: { type: Number },
            luxury_tax: { type: Number },
            cap_space: { type: Number }
        },
        revenue: {
            total: { type: Number },
            tickets: { type: Number },
            merchandise: { type: Number },
            sponsorship: { type: Number }
        }
    },
    
    // API metadata
    isActive: {
        type: Boolean,
        default: true
    },
    dataSource: {
        type: String,
        enum: ['nba_api', 'espn', 'sports_radar', 'manual'],
        default: 'nba_api'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    season: {
        type: String,
        default: '2024-25'
    }
}, {
    timestamps: true,
    collection: 'nba_teams'
});

// =============================================================================
// INDEXES FOR PERFORMANCE OPTIMIZATION
// =============================================================================

// Primary indexes
TeamSchema.index({ teamId: 1 });
TeamSchema.index({ abbreviation: 1 });
TeamSchema.index({ conference: 1 });
TeamSchema.index({ division: 1 });

// Compound indexes for common queries
TeamSchema.index({ conference: 1, division: 1 });
TeamSchema.index({ isActive: 1, season: 1 });
TeamSchema.index({ 'location.city': 1, 'location.state': 1 });

// Statistics indexes
TeamSchema.index({ 'statistics.season': 1 });
TeamSchema.index({ 'standings.season': 1 });

// Player roster indexes
TeamSchema.index({ 'roster.playerId': 1 });
TeamSchema.index({ 'roster.position': 1 });
TeamSchema.index({ 'roster.status': 1 });

// Text search index for team names and locations
TeamSchema.index({
    teamName: 'text',
    'location.city': 'text',
    abbreviation: 'text'
});

// =============================================================================
// VIRTUAL PROPERTIES
// =============================================================================

// Full team name (location + team name)
TeamSchema.virtual('fullName').get(function() {
    return `${this.location.city} ${this.teamName}`;
});

// Current season statistics
TeamSchema.virtual('currentStats').get(function() {
    return this.statistics.find(stat => stat.season === this.season);
});

// Current standings
TeamSchema.virtual('currentStandings').get(function() {
    return this.standings.find(standing => standing.season === this.season);
});

// Active roster
TeamSchema.virtual('activeRoster').get(function() {
    return this.roster.filter(player => player.status === 'active');
});

// Injured players
TeamSchema.virtual('injuredPlayers').get(function() {
    return this.roster.filter(player => player.status === 'injured');
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

// Get team statistics for specific season
TeamSchema.methods.getStatsBySeason = function(season) {
    return this.statistics.find(stat => stat.season === season);
};

// Get standings for specific season
TeamSchema.methods.getStandingsBySeason = function(season) {
    return this.standings.find(standing => standing.season === season);
};

// Add or update player to roster
TeamSchema.methods.updateRosterPlayer = function(playerData) {
    const existingPlayerIndex = this.roster.findIndex(
        player => player.playerId === playerData.playerId
    );
    
    if (existingPlayerIndex !== -1) {
        this.roster[existingPlayerIndex] = { ...this.roster[existingPlayerIndex], ...playerData };
    } else {
        this.roster.push(playerData);
    }
    
    this.lastUpdated = new Date();
};

// Update team statistics
TeamSchema.methods.updateStats = function(season, statsData) {
    const existingStatsIndex = this.statistics.findIndex(
        stat => stat.season === season
    );
    
    if (existingStatsIndex !== -1) {
        this.statistics[existingStatsIndex] = { ...this.statistics[existingStatsIndex], ...statsData };
    } else {
        this.statistics.push({ season, ...statsData });
    }
    
    this.lastUpdated = new Date();
};

// =============================================================================
// STATIC METHODS
// =============================================================================

// Find teams by conference
TeamSchema.statics.findByConference = function(conference) {
    return this.find({ conference, isActive: true });
};

// Find teams by division
TeamSchema.statics.findByDivision = function(division) {
    return this.find({ division, isActive: true });
};

// Search teams by name or location
TeamSchema.statics.searchTeams = function(query) {
    return this.find({
        $text: { $search: query },
        isActive: true
    }).select('teamId abbreviation teamName location conference division');
};

// =============================================================================
// PRE/POST MIDDLEWARE
// =============================================================================

// Update lastUpdated timestamp before saving
TeamSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

// Log team updates
TeamSchema.post('save', function(doc) {
    console.log(`Team ${doc.fullName} (${doc.abbreviation}) updated at ${doc.lastUpdated}`);
});

// =============================================================================
// MODEL EXPORT
// =============================================================================

const Team = mongoose.model('Team', TeamSchema);

module.exports = Team;
