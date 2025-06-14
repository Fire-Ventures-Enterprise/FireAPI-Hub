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
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {

  console.log(`FireAPI Central Hub running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
