require('dotenv').config();
const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'hcmut_cinema',
  ssl: {
    rejectUnauthorized: false
  }
};

async function checkDatabase() {
  const client = new Client(dbConfig);
  try {
    console.log('🔄 Đang kết nối lên AWS RDS để kiểm tra...');
    await client.connect();
    console.log('✅ Đã vào được nhà (Database: hcmut_cinema)!\n');

    // Xem danh sách Bảng
    console.log('--- 1. DANH SÁCH CÁC BẢNG TRONG DATABASE ---');
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';
    `);
    console.table(tables.rows);

    // Xem thử dữ liệu Rạp chiếu
    console.log('\n--- 2. DỮ LIỆU BẢNG RAPCHIEU ---');
    const rap = await client.query('SELECT * FROM RAPCHIEU;');
    console.table(rap.rows);

    // Xem thử dữ liệu Phim
    console.log('\n--- 3. DỮ LIỆU BẢNG PHIM ---');
    const phim = await client.query('SELECT * FROM PHIM;');
    console.table(phim.rows);

  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
