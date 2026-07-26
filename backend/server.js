require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const path = require('path');

const app = express();
const server = http.createServer(app);

// Cấu hình EJS View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

// Middleware
app.use(cors()); // Allow frontend S3 bucket to access
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*', // Trong thực tế sẽ đổi thành domain của S3 Bucket
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] Khách kết nối: ${socket.id}`);

  // Khi user click vào sơ đồ ghế của 1 suất chiếu cụ thể
  socket.on('join_showtime', (showtimeId) => {
    socket.join(`showtime_${showtimeId}`);
    console.log(`[Socket] ${socket.id} đã vào room showtime_${showtimeId}`);
  });

  // Khi user khóa/mở ghế
  socket.on('seat_action', (data) => {
    // data: { showtimeId, seatId, action: 'lock' | 'unlock', userId }
    // Phát cho tất cả client khác trong cùng room suất chiếu
    socket.to(`showtime_${data.showtimeId}`).emit('seat_update', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Khách ngắt kết nối: ${socket.id}`);
  });
});

// Gắn biến io vào app để dùng trong các routes
app.set('socketio', io);

// Routes
const clientRoutes = require('./routes/clientRoutes');
const adminRoutes = require('./routes/adminRoutes');
const viewRoutes = require('./routes/viewRoutes');
const authRoutes = require('./routes/authRoutes');

// app.use('/', viewRoutes); // Giai đoạn 3: Frontend đã tách ra S3, Backend không render views nữa
app.use('/auth', authRoutes);
app.use('/', clientRoutes); // Mount directly so /booking/confirm matches frontend EJS
app.use('/admin', adminRoutes); // Mount directly so /admin/phim/them matches frontend EJS

// Bắt lỗi cơ bản
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống trên Backend EC2!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[EC2 Backend] Server đang chạy tại cổng ${PORT}`);
});
