# FireAPI-Hub Multi-Service Dockerfile
# Supports all FireAPI-Hub services with build-time configuration

ARG NODE_VERSION=18
ARG PYTHON_VERSION=3.11

# ================================================
# BASE STAGE - Common dependencies
# ================================================
FROM node:${NODE_VERSION}-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    postgresql-client \
    redis \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# ================================================
# NODE DEPENDENCIES STAGE
# ================================================
FROM base AS node-deps

# Copy package files
COPY package*.json ./
COPY services/*/package*.json ./services/*/

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# ================================================
# PYTHON DEPENDENCIES STAGE  
# ================================================
FROM base AS python-deps

# Copy Python requirements
COPY services/*/requirements.txt ./services/*/

# Install Python dependencies
RUN pip3 install --no-cache-dir \
    fastapi \
    uvicorn \
    sqlalchemy \
    psycopg2-alpine \
    redis \
    prometheus-client \
    && find /usr/local -type d -name __pycache__ -exec rm -rf {} +

# ================================================
# APPLICATION STAGE
# ================================================
FROM base AS app

# Copy dependencies from previous stages
COPY --from=node-deps /app/node_modules ./node_modules
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S fireapi && \
    adduser -S fireapi -u 1001 -G fireapi

# Set permissions
RUN chown -R fireapi:fireapi /app
USER fireapi

# ================================================
# SERVICE-SPECIFIC CONFIGURATIONS
# ================================================

# Auth Gateway (Node.js)
FROM app AS auth-gateway
WORKDIR /app/services/auth-gateway
EXPOSE 3001
CMD ["npm", "start"]

# Service Registry (Python)
FROM app AS service-registry
WORKDIR /app/services/service-registry
EXPOSE 3002
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3002"]

# Data Router (Node.js)
FROM app AS data-router
WORKDIR /app/services/data-router
EXPOSE 3003
CMD ["npm", "start"]

# Monitoring (Python)
FROM app AS monitoring
WORKDIR /app/services/monitoring
EXPOSE 3004
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3004"]

# ================================================
# DEVELOPMENT STAGE
# ================================================
FROM app AS development

# Install development dependencies
RUN npm install && pip3 install --no-cache-dir pytest black flake8

# Development command
CMD ["npm", "run", "dev"]

# ================================================
# PRODUCTION STAGE (default)
# ================================================
FROM app AS production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Metadata
LABEL \
    org.opencontainers.image.title="FireAPI-Hub" \
    org.opencontainers.image.description="Central API Hub for Fire Ventures Enterprise Ecosystem" \
    org.opencontainers.image.vendor="Fire Ventures Enterprise" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.source="https://github.com/Fire-Ventures-Enterprise/FireAPI-Hub"

# Default command (override with SERVICE_NAME build arg)
ARG SERVICE_NAME=auth-gateway
ENV SERVICE_NAME=${SERVICE_NAME}

CMD ["sh", "-c", "cd services/${SERVICE_NAME} && npm start"]
