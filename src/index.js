
const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const { startAnnouncementScheduler } = require('./utils/announcementScheduler');

let server;

const PORT = process.env.PORT || config.port;

mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
  logger.info('Connected to MongoDB');

  // Start database-backed schedulers only after Mongoose is connected. Starting
  // them from app.js caused their first tick to hit Mongoose's 10s buffering
  // timeout during slow database startup.
  if (config.env !== 'test') {
    startAnnouncementScheduler();
  }

  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Listening to port ${PORT}`);
  });
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');

  if (server) {
    server.close(() => {
      mongoose.connection.close(false, () => {
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
});
