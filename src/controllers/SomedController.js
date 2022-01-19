const oracledb = require('oracledb');

exports.getSchedule = async (req, res) => {
  try {
    conn = await oracledb.getConnection();
    result = await conn.execute(
      `SELECT DECODE (jo.typg ,1,'PRYWATNA ' || po.njdo, po.njdo),po.id as idp, pr.tytn || ' ' || pr.nazw || ' ' || pr.imie as lekarz,pr.id as id, j.skrt podmiotskrot, go.data, go.nrgb, to_char(go.data, 'DAY','NLS_DATE_LANGUAGE = POLISH') as dzien, to_char(KSPLUTL.INT2TIME(min(go.godp)), 'HH24:MI:SS') as godzina_od, to_char(KSPLUTL.INT2TIME(max(go.godk)), 'HH24:MI:SS') as godzina_do
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
    res.status(200).send(result.rows);
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
