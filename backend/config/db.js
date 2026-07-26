const { Pool } = require('pg');
const pg = require('pg');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { SESClient } = require('@aws-sdk/client-ses');

// Ngăn node-postgres tự động chuyển TIMESTAMP WITHOUT TIME ZONE thành UTC Date
pg.types.setTypeParser(1114, str => str);

// Cấu hình PostgreSQL (Amazon RDS)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hcmut_cinema',
  password: process.env.DB_PASSWORD || '123456',
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false }
});

// Cấu hình AWS DynamoDB (Seat Locking)
const dynamoDB = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
  }
});

// Cấu hình AWS SES (Gửi Email)
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
  }
});

module.exports = {
  pool,
  dynamoDB,
  sesClient
};
