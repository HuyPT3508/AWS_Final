const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: 'huypt2005',
  host: 'hcmut-cinema-db.c7a06oq4wzxb.ap-southeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'hcmut_cinema',
  ssl: { rejectUnauthorized: false }
});
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'phim'").then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
});
