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

//API
const somedRoutes = require('./src/routes/somed');
const kioskRoutes = require('./src/routes/kiosk');
dotenv.config();

OracleDB.initOracleDB();

const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  optionsSuccessStatus: 200,
  credentials: true,
};

global.io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

server.listen(process.env.PORT, () => {
  console.log('Server is up!');
});

app.use(logger('dev'));
app.use(express.json());
app.use(cors(corsOptions));

app.use('/api', somedRoutes);
app.use('/api', kioskRoutes);

// Exception handlers
process.on('uncaughtException', (error) => {
  console.log('Something went wrong: ', error);
  process.exit(1); // exit application
});

process.on('unhandledRejection', (error, promise) => {
  console.log(' Handle a promise rejection: ', promise);
  console.log(' The error was: ', error);
});
