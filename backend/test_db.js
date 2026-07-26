const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: 'huypt2005',
  host: 'hcmut-cinema-db.c7a06oq4wzxb.ap-southeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'hcmut_cinema',
  ssl: { rejectUnauthorized: false }
});

const run = async () => {
  try {
    const res = await pool.query(`SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'phim'`);
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
};

run();
