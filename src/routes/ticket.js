const express = require('express');
const TicketController = require('../controllers/TicketController');
const router = express.Router();

router.post('/tickets/create', [TicketController.getPatient, TicketController.getDoctorVisit, TicketController.beginTicketProcedure, TicketController.getTicket]);

module.exports = router;
