const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: 'huypt2005',
  host: 'hcmut-cinema-db.c7a06oq4wzxb.ap-southeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'hcmut_cinema',
  ssl: { rejectUnauthorized: false }
});
pool.query("ALTER TABLE PHIM ADD COLUMN IF NOT EXISTS DinhDangHoTro VARCHAR(255) DEFAULT '2D';").then(() => {
  console.log('Thêm cột thành công');
  pool.end();
}).catch(e => {
  console.error(e);
  pool.end();
});
