# 🔗 Integration Guides

Step-by-step guides for integrating Fire services with FireAPI-Hub.

## 🎯 Overview

This section provides comprehensive integration guides for connecting your Fire services to the FireAPI-Hub ecosystem.

## 🚀 Quick Start Integration

### 1. Service Registration
```bash
# Register your service with FireAPI-Hub
curl -X POST https://fireapi.fire-ventures.com/registry/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-service-api-key" \
  -d '{
    "service_name": "your-fire-service",
    "version": "1.0.0",
    "health_check": "https://your-service.com/health",
    "endpoints": ["/api/v1/endpoint1", "/api/v1/endpoint2"]
  }'
// Node.js Example
const fireapi = require('@fire-ventures/fireapi-sdk');

const auth = new fireapi.AuthClient({
  hubUrl: 'https://fireapi.fire-ventures.com',
  serviceKey: process.env.FIREAPI_SERVICE_KEY
});

// Validate user tokens
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const user = await auth.validateToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
// FireBet service integration
const FireAPIAuth = require('@fire-ventures/auth-middleware');

app.use('/api/v1/bets', FireAPIAuth.authenticate({
  service: 'firebet',
  permissions: ['bet.place', 'odds.view']
}));

app.post('/api/v1/bets', async (req, res) => {
  // User is authenticated via FireAPI-Hub
  const { user_id } = req.user;
  
  // Place bet logic
  const bet = await placeBet({
    user_id,
    ...req.body
  });
  
  // Notify other services via FireAPI-Hub
  await fireapi.router.send({
    target: 'firecrm',
    type: 'bet_placed',
    data: { user_id, bet_id: bet.id, amount: bet.amount }
  });
  
  res.json({ success: true, bet });
});
// Subscribe to odds updates from FireOdds
const socket = fireapi.realtime.connect();

socket.on('odds_update', (data) => {
  // Update live odds in FireBet interface
  updateLiveOdds(data.event_id, data.odds);
});

// Request specific odds
socket.emit('subscribe_odds', {
  sport: 'nfl',
  events: ['game_123', 'game_456']
});
# FireOdds service - Python example
from fireapi import DataRouter

router = DataRouter(
    hub_url="https://fireapi.fire-ventures.com",
    service_key=os.environ["FIREAPI_SERVICE_KEY"]
)

async def broadcast_odds_update(event_id, odds_data):
    """Broadcast odds update to all subscribed services"""
    await router.broadcast({
        "event_type": "odds_update",
        "target_services": ["firebet", "firecrm"],
        "payload": {
            "event_id": event_id,
            "odds": odds_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    })

# When odds change
new_odds = scrape_sportsbook_odds(event_id)
await broadcast_odds_update(event_id, new_odds)
# Track affiliate clicks through FireAPI-Hub
async def track_affiliate_click(user_id, sportsbook, event_id):
    await router.send({
        "target_service": "firecrm",
        "message_type": "affiliate_click",
        "payload": {
            "user_id": user_id,
            "sportsbook": sportsbook,
            "event_id": event_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    })
// FireCRM service integration
const fireapi = require('@fire-ventures/fireapi-sdk');

// Listen for customer events from other services
fireapi.router.on('customer_event', async (data) => {
  const { user_id, action, service } = data;
  
  // Update customer profile
  await updateCustomerActivity(user_id, {
    action,
    service,
    timestamp: new Date()
  });
  
  // Trigger marketing automation if needed
  if (action === 'bet_placed') {
    await triggerRetentionCampaign(user_id);
  }
});

// Send customer insights back to services
async function sendCustomerInsights(user_id) {
  const insights = await getCustomerInsights(user_id);
  
  await fireapi.router.send({
    target: 'firebet',
    type: 'customer_insights',
    data: {
      user_id,
      risk_score: insights.risk_score,
      lifetime_value: insights.ltv,
      preferences: insights.preferences
    }
  });
}
# Environment variables setup
export FIREAPI_SERVICE_KEY="your-service-api-key"
export FIREAPI_HUB_URL="https://fireapi.fire-ventures.com"
export FIREAPI_SERVICE_NAME="your-service-name"

# Never hardcode API keys in source code
# Use environment-specific configurations
// Express.js middleware for token validation
const validateFireAPIToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const response = await fetch(`${FIREAPI_HUB_URL}/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Service-Name': process.env.FIREAPI_SERVICE_NAME
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      req.user = userData;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication service unavailable' });
  }
};
# Python example for publishing messages
import asyncio
from fireapi import MessageQueue

mq = MessageQueue(
    redis_url=os.environ["FIREAPI_REDIS_URL"],
    service_name="fireodds"
)

async def publish_odds_change(event_data):
    await mq.publish(
        queue="odds_updates",
        message={
            "event_id": event_data["event_id"],
            "odds": event_data["odds"],
            "sportsbook": event_data["sportsbook"],
            "timestamp": datetime.utcnow().isoformat()
        },
        priority="high"
    )
# Message consumer setup
async def process_bet_notifications(message):
    """Process bet placement notifications"""
    user_id = message["user_id"]
    bet_amount = message["amount"]
    
    # Update customer analytics
    await update_customer_metrics(user_id, bet_amount)
    
    # Send to risk management if high value
    if bet_amount > 1000:
        await send_risk_alert(user_id, bet_amount)

# Start message consumer
await mq.consume(
    queue="bet_notifications",
    handler=process_bet_notifications
)
// Implement required health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0',
    dependencies: {}
  };
  
  try {
    // Check database connection
    await checkDatabaseConnection();
    health.dependencies.database = 'healthy';
    
    // Check external services
    await checkExternalServices();
    health.dependencies.external = 'healthy';
    
    res.json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
});
npm install @fire-ventures/fireapi-sdk
const FireAPI = require('@fire-ventures/fireapi-sdk');

const client = new FireAPI({
  hubUrl: 'https://fireapi.fire-ventures.com',
  serviceKey: process.env.FIREAPI_SERVICE_KEY,
  serviceName: 'your-service-name'
});
pip install fire-ventures-api
from fireapi import FireAPIClient

client = FireAPIClient(
    hub_url="https://fireapi.fire-ventures.com",
    service_key=os.environ["FIREAPI_SERVICE_KEY"],
    service_name="your-service-name"
)
// Jest test example
describe('FireAPI Integration', () => {
  test('should authenticate user successfully', async () => {
    const response = await request(app)
      .post('/api/v1/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword'
      });
      
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
  
  test('should validate token with FireAPI-Hub', async () => {
    const token = 'test-jwt-token';
    const isValid = await fireapi.auth.validateToken(token);
    expect(isValid).toBe(true);
  });
});
