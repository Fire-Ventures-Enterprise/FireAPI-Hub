# 📋 Message Schemas

Standardized data schemas for inter-service communication in the Fire Ecosystem.

## 🎯 Purpose
Defines consistent data formats, validation rules, and message structures for all Fire services communication.

## 📨 Core Message Types

### 🔐 Authentication Messages
```json
{
  "UserAuthRequest": {
    "email": "string",
    "password": "string",
    "service": "string",
    "timestamp": "ISO8601"
  },
  "AuthResponse": {
    "token": "string",
    "user_id": "string",
    "expires_at": "ISO8601",
    "permissions": ["array"]
  }
}
