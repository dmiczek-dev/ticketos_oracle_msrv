//Server and socket.io
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
//Database and config
const dotenv = require('dotenv');
const logger = require('morgan');
const cors = require('cors');
const OracleDB = require('./src/db/oracle');
//Scheduler
const {
  checkSomedTickets,
  checkSomedSchedule,
  checkDailySomedSchedule,
} = require('./src/jobs/scheduler');

//API
const scheduleRoutes = require('./src/routes/schedule');
const ticketRoutes = require('./src/routes/ticket');
dotenv.config();

OracleDB.initOracleDB().then(() => {
  checkSomedTickets();
  checkSomedSchedule();
  checkDailySomedSchedule();
});

const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  optionsSuccessStatus: 200,
  credentials: true,
};

global.io = new Server(server, {
  cors: {
    origin: '*',
  },
});

server.listen(process.env.PORT, () => {
  console.log('Server is up!');
});

app.use(logger('dev'));
app.use(express.json());
app.use(cors());

app.use('/api/v1', scheduleRoutes);
app.use('/api/v1', ticketRoutes);

// Exception handlers
process.on('uncaughtException', (error) => {
  console.log('Something went wrong: ', error);
  process.exit(1); // exit application
});

process.on('unhandledRejection', (error, promise) => {
  console.log(' Handle a promise rejection: ', promise);
  console.log(' The error was: ', error);
});
