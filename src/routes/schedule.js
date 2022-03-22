const express = require('express');
const ScheduleController = require('../controllers/ScheduleController');
const router = express.Router();

router.get('/schedule', [ScheduleController.getSchedule]);
router.get('/schedule/daily', [ScheduleController.getDailySchedule]);
router.post('/schedule', [ScheduleController.getScheduleByOffice]);

module.exports = router;
