const oracledb = require('oracledb');
const schedule = require('node-schedule');
const { maskNumber } = require('../helpers/mask');

//Sending somed tickets every 5s
exports.checkSomedTickets = async () => {
  let conn = await oracledb.getConnection();
  schedule.scheduleJob('*/5 * * * * *', async () => {
    try {
      result = await conn.execute(
        `SELECT pnd.poczekalnia_id, pnd.poczekalnia_skrot, pnd.poczekalnia_nazwa, TO_CHAR(pnd.numer_dzienny, 'FM0000') numer_dzienny, pnd.pracownik_nazwa, pnd.gabinet_id, pnd.gabinet_numer, pnd.godzina, CASE WHEN pnd.NUMER_DZIENNY = pp.NUMER_DZIENNY THEN 1 ELSE 0 END AS AKTYWNY FROM pacjenci_na_dzis pnd LEFT OUTER JOIN proszeni_pacjenci pp ON pnd.NUMER_DZIENNY = pp.NUMER_DZIENNY ORDER BY pnd.GODZINA`,
        {},
        { outFormat: oracledb.OBJECT }
      );
      let tickets = [];
      tickets = result.rows.map((object) => {
        return {
          doctor: object.PRACOWNIK_NAZWA,
          office: object.GABINET_NUMER,
          room: object.POCZEKALNIA_SKROT,
          current: object.AKTYWNY ? maskNumber(object.NUMER_DZIENNY) : null,
          next: object.AKTYWNY ? null : maskNumber(object.NUMER_DZIENNY),
          data: object.GODZINA,
        };
      });
      io.emit('reloadSomedTickets', tickets);
    } catch (err) {
      console.error(err);
      schedule.cancelJob();
      await conn.close();
      checkSomedTickets();
    }
  });
};

//Sending somed schedule every 30 mins
exports.checkSomedSchedule = async () => {
  let conn = await oracledb.getConnection();
  schedule.scheduleJob('*/30 * * * *', async () => {
    try {
      result = await conn.execute(
        `SELECT DECODE (jo.typg ,1,'PRYWATNA ' || po.njdo, po.njdo) as poradnia,po.id as idp, pr.tytn || ' ' || pr.nazw || ' ' || pr.imie as lekarz,pr.id as id, j.skrt podmiotskrot, go.data, go.nrgb, to_char(go.data, 'DAY','NLS_DATE_LANGUAGE = POLISH') as dzien, to_char(KSPLUTL.INT2TIME(min(go.godp)), 'HH24:MI:SS') as godzina_od, to_char(KSPLUTL.INT2TIME(max(go.godk)), 'HH24:MI:SS') as godzina_do
        FROM
        (
        select idjopr, godp, godk, idjorg, data, nrgb,
            max(contig) over (partition by idjopr,idjorg order by data,godk) contiguous_group
            from
            (
               select idjopr, godp, godk,idjorg,data,nrgb,
               case
                  when lag(godk) over (partition by idjopr,idjorg order by data,godk) != godp or row_number() over (partition by idjopr,idjorg order by data,godk)=1
                  then row_number() over (partition by idjopr,idjorg order by data,godk) else null end contig
                  from gabinet.gopr go
                  WHERE go.JOPR = 2
                  and go.nrgb is not null
                  and go.data between to_date(sysdate) and to_date(sysdate+6)
                  order by idjopr,data,godp,godk
            )
        )go, gabinet.prac pr, gabinet.jorg jo, gabinet.pora po, gabinet.jnip j
        where go.idjopr = pr.id
        and go.idjorg=jo.id
        and go.idjorg>0
        and jo.idpora=po.id
        and po.idjnip=j.id
        and po.njdo is not null
        group by pr.tytn || ' ' || pr.nazw || ' ' || pr.imie,DECODE (jo.typg ,1,'PRYWATNA ' || po.njdo, po.njdo),po.id,j.skrt, go.data, go.nrgb, pr.id,contiguous_group
        order by to_char(go.data, 'D'), godzina_od`,
        {},
        { outFormat: oracledb.OBJECT }
      );
      let schedule = [];
      schedule = result.rows.map((object) => {
        return {
          clinic: object.PORADNIA,
          doctor: object.LEKARZ,
          center: object.PODMIOTSKROT,
          data: object.DATA,
          office: object.NRGB,
          day: object.DZIEN,
          start: object.GODZINA_OD,
          end: object.GODZINA_DO,
        };
      });
      io.emit('reloadSomedSchedule', schedule);
    } catch (err) {
      console.error(err);
      schedule.cancelJob();
      await conn.close();
      checkSomedSchedule();
    }
  });
};

//Sending somed schedule every 30 mins for one day
exports.checkDailySomedSchedule = async () => {
  let conn = await oracledb.getConnection();
  schedule.scheduleJob('*/30 * * * *', async () => {
    try {
      result = await conn.execute(
        `SELECT DECODE (jo.typg ,1,'PRYWATNA ' || po.njdo, po.njdo) as poradnia,po.id as idp, pr.tytn || ' ' || pr.nazw || ' ' || pr.imie as lekarz,pr.id as id, j.skrt podmiotskrot, go.data, go.nrgb, to_char(go.data, 'DAY','NLS_DATE_LANGUAGE = POLISH') as dzien, to_char(KSPLUTL.INT2TIME(min(go.godp)), 'HH24:MI:SS') as godzina_od, to_char(KSPLUTL.INT2TIME(max(go.godk)), 'HH24:MI:SS') as godzina_do
          FROM
          (
          select idjopr, godp, godk, idjorg, data, nrgb,
              max(contig) over (partition by idjopr,idjorg order by data,godk) contiguous_group
              from
              (
                 select idjopr, godp, godk,idjorg,data,nrgb,
                 case
                    when lag(godk) over (partition by idjopr,idjorg order by data,godk) != godp or row_number() over (partition by idjopr,idjorg order by data,godk)=1
                    then row_number() over (partition by idjopr,idjorg order by data,godk) else null end contig
                    from gabinet.gopr go
                    WHERE go.JOPR = 2
                    and go.nrgb is not null
                    and go.data between to_date(sysdate) and to_date(sysdate+6)
                    order by idjopr,data,godp,godk
              )
          )go, gabinet.prac pr, gabinet.jorg jo, gabinet.pora po, gabinet.jnip j
          where go.idjopr = pr.id
          and go.idjorg=jo.id
          and go.idjorg>0
          and jo.idpora=po.id
          and po.idjnip=j.id
          and po.njdo is not null
          and go.data = TO_CHAR(CURRENT_DATE, 'YY/MON/DD')
          group by pr.tytn || ' ' || pr.nazw || ' ' || pr.imie,DECODE (jo.typg ,1,'PRYWATNA ' || po.njdo, po.njdo),po.id,j.skrt, go.data, go.nrgb, pr.id,contiguous_group
          order by to_char(go.data, 'D'), godzina_od`,
        {},
        { outFormat: oracledb.OBJECT }
      );
      let schedule = [];
      schedule = result.rows.map((object) => {
        return {
          clinic: object.PORADNIA,
          doctor: object.LEKARZ,
          center: object.PODMIOTSKROT,
          data: object.DATA,
          office: object.NRGB,
          day: object.DZIEN,
          start: object.GODZINA_OD,
          end: object.GODZINA_DO,
        };
      });
      io.emit('reloadDailySomedSchedule', schedule);
    } catch (err) {
      console.error(err);
      schedule.cancelJob();
      await conn.close();
      checkDailySomedSchedule();
    }
  });
};
