const express = require('express');
const SomedController = require('../controllers/SomedController');
const router = express.Router();

router.get('/schedule', [SomedController.getSchedule]);

module.exports = router;
