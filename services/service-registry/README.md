# 📋 Service Registry & Discovery

Central service registry for the Fire Ecosystem microservices.

## 🎯 Purpose
Provides service discovery, health monitoring, and load balancing coordination for all Fire services.

## ⚡ Features
- Automatic service registration
- Health monitoring and failover
- Load balancing configuration
- Service mesh coordination
- Dependency mapping
- Circuit breaker integration

## 🛠️ Technology Stack
- **Runtime:** Python 3.9+
- **Framework:** FastAPI
- **Database:** PostgreSQL (service metadata)
- **Cache:** Redis (service status)
- **Monitoring:** Prometheus, Grafana

## 📊 Status
🚧 **In Development** - Phase 1 Implementation

## 🔗 Registered Services
- 🎯 FireBet
- 📊 FireOdds  
- 👥 FireCRM
- 🚛 FireFleet
- 🏗️ FireContractor
- 🏠 FireRealty

## 🚀 Quick Start
```bash
cd services/service-registry
pip install -r requirements.txt
python -m uvicorn main:app --reload
