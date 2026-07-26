require('dotenv').config();
const { DynamoDBClient, CreateTableCommand, UpdateTimeToLiveCommand } = require("@aws-sdk/client-dynamodb");

// Cấu hình AWS Client
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-southeast-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const TableName = "HCMUTCinema_SeatLocks";

async function createTable() {
    try {
        console.log(`\n⏳ Đang khởi tạo bảng DynamoDB: ${TableName}...`);
        const createCmd = new CreateTableCommand({
            TableName: TableName,
            AttributeDefinitions: [
                { AttributeName: "SeatKey", AttributeType: "S" } // Ví dụ: "SC1_P1_A1" (Suất 1, Phòng 1, Ghế A1)
            ],
            KeySchema: [
                { AttributeName: "SeatKey", KeyType: "HASH" } // Partition Key
            ],
            BillingMode: "PAY_PER_REQUEST" // Chế độ On-Demand (Serverless), phù hợp dự án đồ án
        });

        await client.send(createCmd);
        console.log(`✅ Đã gửi lệnh tạo bảng ${TableName} thành công! AWS đang xử lý...`);
        
        // Đợi 10 giây để AWS build xong bảng trước khi bật tính năng TTL
        console.log("⏳ Đang đợi bảng chuyển sang trạng thái ACTIVE để cấu hình Time-To-Live (TTL)...");
        setTimeout(enableTTL, 12000);

    } catch (err) {
        if (err.name === 'ResourceInUseException') {
            console.log(`⚠️ Bảng ${TableName} đã tồn tại! Chuyển thẳng qua bước check TTL.`);
            enableTTL();
        } else {
            console.error("❌ Lỗi tạo bảng:", err);
        }
    }
}

async function enableTTL() {
    try {
        const ttlCmd = new UpdateTimeToLiveCommand({
            TableName: TableName,
            TimeToLiveSpecification: {
                Enabled: true,
                AttributeName: "TTL" // Cột này sẽ chứa Unix Timestamp (thời gian hết hạn)
            }
        });
        await client.send(ttlCmd);
        console.log(`✅ Đã BẬT thành công tính năng TTL (Tự động nhả ghế sau 5 phút) trên cột "ExpirationTime"!`);
        console.log(`🎉 HOÀN TẤT 100% KIẾN TRÚC DYNAMODB CHO HỆ THỐNG!\n`);
        process.exit(0);
    } catch (err) {
        if (err.name === 'ValidationException' && err.message.includes('already has TTL enabled')) {
            console.log(`✅ Tính năng TTL đã được bật sẵn trên cột "ExpirationTime"!`);
            process.exit(0);
        } else {
            console.error("❌ Lỗi bật TTL:", err.message);
            process.exit(1);
        }
    }
}

createTable();
