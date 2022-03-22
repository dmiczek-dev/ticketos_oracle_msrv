const oracledb = require('oracledb');

//Return weekly schedule for every center and office (globally)
exports.getSchedule = async (req, res) => {
  let conn = await oracledb.getConnection();
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
    res.status(200).send(schedule);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ message: 'Something went wrong with schedule query' });
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

//Return daily schedule for every center and office (globally)
exports.getDailySchedule = async (req, res) => {
  let conn = await oracledb.getConnection();
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
    res.status(200).send(schedule);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ message: 'Something went wrong with daily schedule query' });
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

//Return schedule for specific center and office
exports.getScheduleByOffice = async (req, res) => {
  let center = req.body.center;
  let office = req.body.office;
  let conn = await oracledb.getConnection();
  try {
    result = await conn.execute(
      `SELECT po.nazw as poradnia, to_char(go.data, 'yyyy-mm-dd"T"') as data, to_char(go.data, 'DAY','NLS_DATE_LANGUAGE = POLISH') as dzien, to_char(KSPLUTL.INT2TIME(min(go.godp)), 'HH24:MI:SS') as godzinaod, to_char(KSPLUTL.INT2TIME(max(go.godk)), 'HH24:MI:SS') as godzinado, go.nrgb, j.skrt podmiotskrot, pr.tytn || ' ' || pr.nazw || ' ' || pr.imie as pracownik,pr.id as pracownikid
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
      and j.skrt = :center
      and go.nrgb = :office
      group by pr.tytn || ' ' || pr.nazw || ' ' || pr.imie,DECODE (jo.typg ,1,'PRYWATNA ' || po.njdo, po.njdo),po.id,j.skrt, go.data, go.nrgb, pr.id,contiguous_group, po.nazw
      order by to_char(go.data, 'D'), godzinaod`,
      { center: center, office: office },
      { outFormat: oracledb.OBJECT }
    );
    let schedule = [];
    schedule = result.rows.map((object) => {
      return {
        clinic: object.PORADNIA,
        doctor: object.PRACOWNIK,
        center: object.PODMIOTSKROT,
        data: object.DATA,
        office: object.NRGB,
        day: object.DZIEN,
        start: object.GODZINAOD,
        end: object.GODZINADO,
      };
    });
    res.status(200).send(schedule);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ message: 'Something went wrong with office schedule query' });
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
