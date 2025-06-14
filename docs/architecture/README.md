# 🏗️ FireAPI-Hub Architecture Documentation

Comprehensive architecture documentation for the Fire Ventures Enterprise Ecosystem.

## 🎯 System Overview

FireAPI-Hub serves as the central orchestrator for all Fire services, providing:
- **Unified Authentication** across all services
- **Service Discovery** and health monitoring
- **Inter-service Communication** routing
- **Centralized Monitoring** and analytics

## 🔧 Core Components

### 🔐 Authentication Gateway
- **Technology:** Node.js + Express
- **Purpose:** Centralized authentication and authorization
- **Integrations:** All Fire services
- **Security:** JWT tokens, RBAC, session management

### 📋 Service Registry
- **Technology:** Python + FastAPI
- **Purpose:** Service discovery and health monitoring
- **Features:** Auto-registration, load balancing, circuit breakers
- **Monitoring:** Real-time health checks

### 🔄 Data Router
- **Technology:** Node.js + Socket.io
- **Purpose:** Inter-service message routing
- **Patterns:** Request/Response, Pub/Sub, WebSocket streams
- **Queue:** Redis-based message queuing

### 📊 Monitoring Service
- **Technology:** Python + FastAPI + Grafana
- **Purpose:** System monitoring and analytics
- **Features:** Real-time dashboards, alerting, performance metrics
- **Storage:** PostgreSQL + InfluxDB

## 🌐 Fire Ecosystem Integration

```mermaid
graph TB
    subgraph "Fire Ecosystem"
        FireBet[🎯 FireBet<br/>Sports Betting]
        FireOdds[📊 FireOdds<br/>Odds Collection]
        FireCRM[👥 FireCRM<br/>Customer Management]
        FireFleet[🚛 FireFleet<br/>Fleet Management]
        FireContractor[🏗️ FireContractor<br/>Project Management]
        FireRealty[🏠 FireRealty<br/>Real Estate]
    end
    
    subgraph "FireAPI-Hub"
        AuthGW[🔐 Auth Gateway]
        ServiceReg[📋 Service Registry]
        DataRouter[🔄 Data Router]
        Monitoring[📊 Monitoring]
    end
    
    subgraph "Infrastructure"
        PostgreSQL[(PostgreSQL)]
        Redis[(Redis)]
        Railway[🚂 Railway Cloud]
    end
    
    FireBet --> AuthGW
    FireOdds --> AuthGW
    FireCRM --> AuthGW
    FireFleet --> AuthGW
    FireContractor --> AuthGW
    FireRealty --> AuthGW
    
    AuthGW --> ServiceReg
    ServiceReg --> DataRouter
    DataRouter --> Monitoring
    
    AuthGW --> PostgreSQL
    DataRouter --> Redis
    Monitoring --> PostgreSQL
