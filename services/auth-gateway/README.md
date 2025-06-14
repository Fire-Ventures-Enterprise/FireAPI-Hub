# 🔐 Authentication Gateway

Central authentication service for the Fire Ecosystem.

## 🎯 Purpose
Provides unified authentication and authorization across all Fire services including FireBet, FireOdds, FireCRM, and future services.

## ⚡ Features
- JWT token management and validation
- Role-based access control (RBAC)
- Single sign-on (SSO) implementation
- Multi-service authentication
- Session management
- API key management

## 🛠️ Technology Stack
- **Runtime:** Node.js 16+
- **Framework:** Express.js
- **Database:** PostgreSQL (user management)
- **Cache:** Redis (sessions)
- **Security:** JWT, bcrypt, helmet

## 📊 Status
🚧 **In Development** - Phase 1 Implementation

## 🔗 Integration
Used by:
- 🎯 FireBet (user authentication)
- 📊 FireOdds (service authentication) 
- 👥 FireCRM (admin authentication)
- 🚛 FireFleet (driver authentication)

## 🚀 Quick Start
```bash
cd services/auth-gateway
npm install
npm run dev
