const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: 'huypt2005',
  host: 'hcmut-cinema-db.c7a06oq4wzxb.ap-southeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'hcmut_cinema',
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'suatchieu' AND column_name = 'thoigianbatdau';").then(res => {
  console.log(res.rows);
  pool.end();
});
