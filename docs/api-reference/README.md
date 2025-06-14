# 📖 API Reference Documentation

Complete API reference for all FireAPI-Hub services and endpoints.

## 🎯 Overview

This documentation provides detailed API specifications for all FireAPI-Hub services and their integration with Fire Ecosystem services.

## 🔗 Service APIs

### 🔐 Authentication Gateway API
**Base URL:** `https://fireapi.fire-ventures.com/auth`

#### Authentication Endpoints
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "service": "firebet"
}

Response 200:
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2024-01-15T12:00:00Z",
  "permissions": ["bet.place", "odds.view"]
}
