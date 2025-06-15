const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "FireAPI Central Intelligence Hub",
    timestamp: new Date().toISOString(),
  });
});

// Main hub endpoint
app.get("/", (req, res) => {
  res.json({
    message: "FireAPI Central Intelligence Hub",
    version: "1.0.0",
    status: "operational",
  });
});  // <-- This is line 32 (end of main hub endpoint)

// API v1 Routes  <-- Add the new code here
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "FireAPI Central Intelligence Hub",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

app.get("/api/v1/services", (req, res) => {
  res.json({
    services: [
      {
        name: "FireBet",
        status: "pending",
        url: process.env.FIREBET_SERVICE_URL || "not-configured",
        description: "Sports Betting Platform"
      },
      {
        name: "FireOdds", 
        status: "pending",
        url: process.env.FIREODDS_SERVICE_URL || "not-configured",
        description: "Independent Odds Collection"
      },
      {
        name: "FireCRM",
        status: "pending", 
        url: process.env.FIRECRM_SERVICE_URL || "not-configured",
        description: "Customer Relationship Management"
      },
      {
        name: "FireFleet",
        status: "pending",
        url: process.env.FIREFLEET_SERVICE_URL || "not-configured", 
        description: "Fleet Management System"
      },
      {
        name: "FireContractorPro",
        status: "pending",
        url: process.env.FIRECONTRACTORPRO_SERVICE_URL || "not-configured",
        description: "Construction Management Platform"
      },
      {
        name: "FireRealty",
        status: "pending",
        url: process.env.FIREREALTY_SERVICE_URL || "not-configured",
        description: "Real Estate Solutions"
      }
    ],
    total: 6,
    active: 0,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/v1/metrics", (req, res) => {
  res.json({
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || "development"
    },
    api: {
      version: "1.0.0",
      endpoints: [
        "/",
        "/health", 
        "/api/v1/health",
        "/api/v1/services",
        "/api/v1/metrics"
      ]
    },
    database: {
      postgresql: {
        status: process.env.DATABASE_URL ? "configured" : "not-configured"
      },
      redis: {
        status: process.env.REDIS_URL ? "configured" : "not-configured"  
      }
    },
    timestamp: new Date().toISOString()
  });
});

