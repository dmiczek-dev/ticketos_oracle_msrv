const oracledb = require('oracledb');
const { maskNumber } = require('../helpers/mask');

//Search for patient in oracle
exports.getPatient = async (req, res, next) => {
  let result;
  let pesel = req.body.pesel;
  let conn = await oracledb.getConnection();
  try {
    result = await conn.execute(
      'SELECT id FROM pacj WHERE pesl=:pesel',
      { pesel: pesel },
      { outFormat: oracledb.OBJECT }
    );
    if (result.rows.length !== 1) {
      res.status(400).send({
        message: 'Patient not found in Oracle DB',
      });
    } else {
      res.locals.patientId = result.rows[0]['ID'];
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: 'Something went wrong while searching for patient query',
    });
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
};

//Search for patient visit
exports.getDoctorVisit = async (req, res, next) => {
  let result;
  let patientId = res.locals.patientId;
  let conn = await oracledb.getConnection();
  try {
    result = await conn.execute(
      'SELECT id, didprac, didjnip, num, tytn, imie, nazw, skrt, rdatp FROM totem_dzisiejsze_wizyty WHERE idpacj=:patientId',
      { patientId: patientId },
      { outFormat: oracledb.OBJECT }
    );
    if (result.rows.length === 0) {
      res.status(400).send({
        message: 'Visit not found in Oracle DB',
      });
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: 'Something went wrong while searching for doctor visit query',
    });
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
};

//Generate ticket number
exports.beginTicketProcedure = async (req, res, next) => {
  let result;
  let patientId = res.locals.patientId;
  let bindvars = {
    i: patientId,
    io: req.body.deviceId,
    o: {
      dir: oracledb.BIND_OUT,
    },
  };
  let conn = await oracledb.getConnection();
  try {
    result = await conn.execute(
      'BEGIN WPISZ_NUMER_SKWN(:i, :io, :o); END;',
      bindvars,
      { autoCommit: true }
    );
    res.locals.ticket = result.outBinds.o;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: 'Something went wrong during ticket creation procedure',
    });
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
};

//Return created ticket with visit details
exports.getTicket = async (req, res, next) => {
  let result;
  let ticket = res.locals.ticket;
  let conn = await oracledb.getConnection();
  try {
    result = await conn.execute(
      'SELECT poczekalnia_nazwa, gabinet_numer, godzina FROM pacjenci_na_dzis WHERE numer_dzienny =:ticket',
      { ticket: ticket },
      { outFormat: oracledb.OBJECT }
    );
    res.status(200).send({
      visits: result.rows,
      ticket: maskNumber(ticket),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message:
        'Something went wrong while searching for ticket information query',
    });
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
};
