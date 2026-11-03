const mongoose = require("mongoose");

const getHealth = (req, res) => {
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const dbState = mongoose.connection.readyState;

  res.status(200).json({
    status: "ok",
    database: dbStatusMap[dbState] || "unknown",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};

module.exports = {
  getHealth,
};
