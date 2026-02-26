require('dotenv').config();

const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const db = require('./models');
const routes = require('./routes');
const { fileLogger, consoleLogger } = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json({ limit: config.server.bodyLimit }));
app.use(express.urlencoded({ limit: config.server.bodyLimit, extended: true }));

// Logging
if (config.app.nodeEnv === 'development') {
  app.use(consoleLogger);
}
app.use(fileLogger);

// Routes
app.use(`${config.api.prefix}`, routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✓ Database connection established');

    // Ensure required tables exist (non-destructive: create missing tables only)
    await db.sequelize.sync();
    console.log('Database schema verified');

    // Start server
    const server = app.listen(config.app.port, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Patient Service - Hospital Management System          ║
╠════════════════════════════════════════════════════════════════╣
║ Service:      ${config.app.serviceName.padEnd(45)} ║
║ Environment:  ${config.app.nodeEnv.padEnd(45)} ║
║ Port:         ${config.app.port.toString().padEnd(45)} ║
║ API Prefix:   ${config.api.prefix.padEnd(45)} ║
║ Database:     ${config.database.dialect.padEnd(45)} ║
╠════════════════════════════════════════════════════════════════╣
║ Server is running and ready for requests                      ║
╚════════════════════════════════════════════════════════════════╝
      `);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        await db.sequelize.close();
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        await db.sequelize.close();
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;

