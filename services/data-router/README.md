# 🔄 Data Router

Central data routing and communication service for Fire Ecosystem inter-service messaging.

## 🎯 Purpose
Handles all inter-service communication, message queuing, and real-time data synchronization across Fire services.

## ⚡ Features
- Inter-service message routing
- Real-time data synchronization
- Event-driven architecture
- Message queuing and processing
- WebSocket management
- API request proxying
- Data transformation pipelines

## 🛠️ Technology Stack
- **Runtime:** Node.js 16+
- **Framework:** Express.js + Socket.io
- **Message Queue:** Redis Pub/Sub
- **Database:** PostgreSQL (routing rules)
- **Cache:** Redis (message cache)
- **Protocols:** HTTP/HTTPS, WebSocket, Server-Sent Events

## 📊 Status
🚧 **In Development** - Phase 1 Implementation

## 🔌 Route Configuration
```javascript
{
  "FireBet": {
    "endpoints": ["user-actions", "betting-events", "payments"],
    "priority": "high"
  },
  "FireOdds": {
    "endpoints": ["odds-updates", "affiliate-tracking"],
    "priority": "critical"
  },
  "FireCRM": {
    "endpoints": ["customer-data", "support-tickets"],
    "priority": "medium"
  }
}
