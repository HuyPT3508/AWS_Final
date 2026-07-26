require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // Bắt buộc phải có cấu hình SSL để kết nối lên AWS RDS
  ssl: {
    rejectUnauthorized: false 
  }
};

async function main() {
  console.log('🔄 Đang kết nối lên AWS RDS...');
  
  // 1. Kết nối vào DB mặc định 'postgres' để tạo DB 'hcmut_cinema'
  const setupClient = new Client({ ...dbConfig, database: 'postgres' });
  try {
    await setupClient.connect();
    console.log('✅ Đã kết nối RDS. Đang kiểm tra Database hcmut_cinema...');
    const res = await setupClient.query("SELECT 1 FROM pg_database WHERE datname = 'hcmut_cinema'");
    if (res.rowCount === 0) {
      console.log('⏳ Đang khởi tạo Database hcmut_cinema mới...');
      await setupClient.query('CREATE DATABASE hcmut_cinema');
      console.log('✅ Tạo xong Database hcmut_cinema.');
    } else {
      console.log('⏩ Database hcmut_cinema đã tồn tại, bỏ qua bước tạo mới.');
    }
  } catch (err) {
    console.error('❌ Lỗi kết nối hoặc tạo DB:', err.message);
    process.exit(1);
  } finally {
    await setupClient.end();
  }

  // 2. Kết nối vào DB 'hcmut_cinema' vừa tạo và đẩy script SQL lên
  const appClient = new Client({ ...dbConfig, database: 'hcmut_cinema' });
  try {
    await appClient.connect();
    console.log('⏳ Đang đọc file database_postgres.sql và chèn dữ liệu...');
    
    const sqlPath = path.join(__dirname, '..', 'database', 'database_postgres.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await appClient.query(sql);
    console.log('🎉 XUẤT SẮC! Đã đẩy toàn bộ Bảng và Dữ Liệu mồi lên AWS RDS thành công!');
  } catch (err) {
    console.error('❌ Lỗi khi chạy file SQL:', err.message);
  } finally {
    await appClient.end();
  }
}

main();
