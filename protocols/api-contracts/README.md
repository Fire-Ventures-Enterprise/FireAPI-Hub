# 🔌 API Contracts

Standardized API interface definitions for all Fire Ecosystem services.

## 🎯 Purpose
Defines consistent API contracts, data schemas, and communication protocols across all Fire services.

## 📋 Service Contracts

### 🔐 Authentication Gateway
- **POST** `/auth/login` - User authentication
- **POST** `/auth/refresh` - Token refresh
- **GET** `/auth/validate` - Token validation
- **POST** `/auth/logout` - User logout

### 📊 Service Registry
- **POST** `/registry/register` - Service registration
- **GET** `/registry/services` - Available services
- **GET** `/registry/health/{service}` - Health status
- **DELETE** `/registry/deregister/{service}` - Service removal

### 🔄 Data Router
- **POST** `/router/send` - Send inter-service message
- **GET** `/router/routes` - Available routes
- **POST** `/router/broadcast` - Broadcast to multiple services
- **GET** `/router/status` - Router health status

### 📊 Monitoring
- **GET** `/metrics/{service}` - Service metrics
- **POST** `/alerts/configure` - Alert configuration
- **GET** `/health/overview` - System health overview
- **GET** `/logs/{service}` - Service logs

## 🌐 Fire Services Integration

### 🎯 FireBet Endpoints
```yaml
POST /firebet/user/register
POST /firebet/bet/place
GET /firebet/odds/current
POST /firebet/payment/process
