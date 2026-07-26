#!/bin/bash
echo "🚀 Đang cập nhật hệ thống..."
sudo apt update && sudo apt upgrade -y

echo "🚀 Đang cài đặt Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "🚀 Đang cài đặt PM2..."
sudo npm install -g pm2

echo "🚀 Đang cài đặt thư viện cho dự án..."
cd /home/ubuntu/backend
npm install

echo "🚀 Khởi động server..."
pm2 start server.js --name "hcmut-cinema"
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "✅ HOÀN TẤT! Server của bạn đang chạy ngầm trên cổng 3000."
