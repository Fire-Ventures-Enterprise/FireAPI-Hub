# 🛡️ Authentication Policies

Security policies and access control rules for the Fire Ecosystem.

## 🎯 Purpose
Defines authentication requirements, authorization policies, and security protocols across all Fire services.

## 🔐 Authentication Methods

### JWT Token Configuration
```yaml
Token Settings:
  Algorithm: RS256
  Expiration: 24 hours
  Refresh: 7 days
  Issuer: fireapi-hub
  Audience: fire-ecosystem
