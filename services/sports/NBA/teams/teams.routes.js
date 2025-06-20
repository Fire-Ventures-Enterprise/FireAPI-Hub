const express = require('express');
const router = express.Router();

// Simplified Teams API (no auth/validation for now)
// We'll add advanced features later

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'NBA Teams API',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Get all teams
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'NBA Teams API',
        data: {
            teams: [
                { id: 1, name: 'Los Angeles Lakers', abbreviation: 'LAL', conference: 'Western', division: 'Pacific' },
                { id: 2, name: 'Boston Celtics', abbreviation: 'BOS', conference: 'Eastern', division: 'Atlantic' },
                { id: 3, name: 'Golden State Warriors', abbreviation: 'GSW', conference: 'Western', division: 'Pacific' },
                { id: 4, name: 'Miami Heat', abbreviation: 'MIA', conference: 'Eastern', division: 'Southeast' },
                { id: 5, name: 'Chicago Bulls', abbreviation: 'CHI', conference: 'Eastern', division: 'Central' }
            ]
        },
        meta: {
            total: 5,
            tier: 'FREE - Basic team info',
            upgrade: 'Standard/Premium tiers coming soon!'
        },
        timestamp: new Date().toISOString()
    });
});

// Get team by ID
router.get('/:teamId', (req, res) => {
    const { teamId } = req.params;
    res.status(200).json({
        success: true,
        message: 'Team details',
        data: {
            team: {
                id: teamId,
                name: 'Los Angeles Lakers',
                abbreviation: 'LAL',
                conference: 'Western',
                division: 'Pacific',
                founded: 1947,
                championships: 17,
                venue: 'Crypto.com Arena',
                city: 'Los Angeles',
                state: 'California'
            }
        },
        tier: 'FREE',
        timestamp: new Date().toISOString()
    });
});

// Get team roster
router.get('/:teamId/roster', (req, res) => {
    const { teamId } = req.params;
    res.status(200).json({
        success: true,
        message: 'Team roster',
        data: {
            team: { id: teamId, name: 'Los Angeles Lakers' },
            roster: [
                { id: 1, name: 'LeBron James', position: 'SF', number: 6 },
                { id: 2, name: 'Anthony Davis', position: 'PF/C', number: 3 },
                { id: 3, name: 'Austin Reaves', position: 'SG', number: 15 }
            ]
        },
        tier: 'FREE',
        note: 'Full roster data in Standard tier',
        timestamp: new Date().toISOString()
    });
});

// Coming soon endpoints
router.get('/:teamId/stats', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Team stats endpoint - Coming Soon!',
        tier: 'STANDARD',
        status: 'Under development',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
