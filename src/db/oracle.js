const oracledb = require('oracledb');

exports.initOracleDB = async function init() {
  try {
    await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_STRING,
    });
    console.log('Oracle connection pool started');
  } catch (err) {
    console.error('init() error: ' + err.message);
  }
};
