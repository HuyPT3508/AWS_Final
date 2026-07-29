const express = require('express');
const router = express.Router();
const { pool, dynamoDB, sesClient } = require('../config/db');
const { PutItemCommand, DeleteItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { SendEmailCommand } = require('@aws-sdk/client-ses');

// --- CÁC HÀM TIỆN ÍCH CHO DYNAMODB ---
const TABLE_SEAT_LOCKS = 'HCMUTCinema_SeatLocks';

// 1. Lấy danh sách phim đang chiếu (kèm theo lịch chiếu)
router.get('/movies', async (req, res) => {
  try {
    const moviesResult = await pool.query('SELECT * FROM PHIM');
    const movies = moviesResult.rows;

    const showtimesResult = await pool.query(`
      SELECT SC.ID_SuatChieu, SC.ID_Phim, SC.ThoiGianBatDau, PC.TenPhong, SC.DinhDang, SC.NgonNgu, SC.ID_Phong
      FROM SUATCHIEU SC
      JOIN PHONGCHIEU PC ON SC.ID_Phong = PC.ID_Phong
      WHERE SC.ThoiGianBatDau >= NOW()
      ORDER BY SC.ThoiGianBatDau ASC
    `);
    const showtimes = showtimesResult.rows;

    // Gắn suất chiếu vào từng phim
    movies.forEach(movie => {
      movie.showtimes = showtimes
        .filter(st => st.id_phim === movie.id_phim)
        .map(st => {
          const d = new Date(st.thoigianbatdau);
          return {
            id: st.id_suatchieu,
            time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
            date: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`,
            format: st.dinhdang,
            lang: st.ngonngu || 'Phụ Đề',
            roomName: st.tenphong,
            roomId: st.id_phong
          };
        });
    });

    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 2. Lấy chi tiết suất chiếu & danh sách ghế đã đặt/đang giữ
router.get('/showtime/:id/seats', async (req, res) => {
  const showtimeId = req.params.id;
  try {
    // 2.1. Lấy danh sách ghế Đã Đặt từ PostgreSQL
    const bookedResult = await pool.query(`
      SELECT ViTriHang, ViTriCot FROM TRANG_THAI_GHE 
      WHERE ID_SuatChieu = $1 AND TrangThai = 'DaDat'
    `, [showtimeId]);
        // 2.2. Lấy danh sách ghế Đang Giữ từ DynamoDB
      const now = Math.floor(Date.now() / 1000);
      const command = new ScanCommand({
        TableName: TABLE_SEAT_LOCKS,
        FilterExpression: "begins_with(SeatKey, :sc) AND #t > :now",
        ExpressionAttributeNames: { "#t": "TTL" },
        ExpressionAttributeValues: { 
            ":sc": { S: `${showtimeId}#` },
            ":now": { N: now.toString() }
        }
      });
    
    let lockedSeats = [];
    try {
      const lockData = await dynamoDB.send(command);
      lockedSeats = lockData.Items.map(item => item.SeatKey.S.split('#')[1]);
    } catch(err) {
      console.log("DynamoDB chưa được setup hoặc lỗi:", err.message);
    }

    res.json({
      booked: bookedResult.rows.map(r => `${r.vitrihang.trim()}${r.vitricot}`),
      locked: lockedSeats
    });
  } catch (error) {
    res.json({ booked: [], locked: [] }); // Fallback
  }
});

// 3. Khóa ghế tạm thời (5 phút) sử dụng DynamoDB
router.post('/booking/lock', async (req, res) => {
  const { showtimeId, seatId, sessionKey } = req.body;
  const seatKey = `${showtimeId}#${seatId}`;
  const expireTime = Math.floor(Date.now() / 1000) + 300; // TTL: 5 minutes

  try {
    // ConditionExpression đảm bảo nếu đã có người khóa thì sẽ văng lỗi (Race Condition Fix)
    // Nhưng nếu ghế đã hết hạn TTL (do DynamoDB chưa kịp xóa) thì vẫn cho phép ghi đè
    const now = Math.floor(Date.now() / 1000);
    const command = new PutItemCommand({
      TableName: TABLE_SEAT_LOCKS,
      Item: {
        SeatKey: { S: seatKey },
        SessionID: { S: sessionKey },
        TTL: { N: expireTime.toString() }
      },
      ConditionExpression: "attribute_not_exists(SeatKey) OR #t < :now",
      ExpressionAttributeNames: { "#t": "TTL" },
      ExpressionAttributeValues: { ":now": { N: now.toString() } }
    });

    await dynamoDB.send(command);
    
    // Bắn socket tới các user khác
    const io = req.app.get('socketio');
    io.to(`showtime_${showtimeId}`).emit('seat_update', { showtimeId, seatId, action: 'lock', sessionKey });

    res.json({ success: true, message: 'Khóa ghế thành công' });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      res.status(409).json({ success: false, message: 'Ghế này vừa bị người khác chọn!' });
    } else {
      res.status(500).json({ success: false, message: 'Lỗi server DynamoDB' });
    }
  }
});

// 4. Mở khóa ghế (hủy ngang)
router.post('/booking/unlock', async (req, res) => {
  const { showtimeId, seatId, sessionKey } = req.body;
  const seatKey = `${showtimeId}#${seatId}`;

  try {
    const command = new DeleteItemCommand({
      TableName: TABLE_SEAT_LOCKS,
      Key: { SeatKey: { S: seatKey } },
      ConditionExpression: "SessionID = :sid",
      ExpressionAttributeValues: { ":sid": { S: sessionKey } }
    });
    await dynamoDB.send(command);

    // Bắn socket
    const io = req.app.get('socketio');
    io.to(`showtime_${showtimeId}`).emit('seat_update', { showtimeId, seatId, action: 'unlock', sessionKey });

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false }); // Kệ, có thể do TTL đã xóa
  }
});

// Lưu OTP tạm thời cho thanh toán
const otpPaymentCache = new Map();

// 5. Xác thực đăng nhập & Gửi mã OTP thanh toán qua SES
router.post('/payment/login', async (req, res) => {
  const { id, pass } = req.body;
  try {
    const userResult = await pool.query('SELECT KH.ID_KhachHang, KH.Email FROM TAIKHOAN TK JOIN KHACHHANG KH ON TK.ID_TaiKhoan = KH.ID_TaiKhoan WHERE TK.Email = $1 AND TK.MatKhau = $2', [id, pass]);
    if (userResult.rows.length === 0) return res.json({ success: false, message: 'Sai email hoặc mật khẩu!' });
    
    const email = userResult.rows[0].email;
    if (!email) return res.json({ success: false, message: 'Tài khoản không có Email để nhận OTP' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const params = {
      Destination: { ToAddresses: [email] },
      Message: {
        Body: { Text: { Data: `Mã OTP xác thực thanh toán tại HCMUT Cinema của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.` } },
        Subject: { Data: "Mã OTP Thanh Toán HCMUT Cinema" },
      },
      Source: "huyphanthanh2.0@gmail.com", // Email đã verify trên AWS SES
    };
    await sesClient.send(new SendEmailCommand(params));
    
    otpPaymentCache.set(pass, { otp, email, expiresAt: Date.now() + 300000 });
    console.log(`[SES] Đã gửi OTP ${otp} đến ${email}`);
    
    res.json({ success: true, message: 'Đã gửi OTP', email: email });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Lỗi gửi email SES' });
  }
});

// 6. Xác nhận thanh toán & Đặt vé thành công
router.post('/booking/confirm', async (req, res) => {
    const { id_suatchieu, ghe, email, matkhau, otp } = req.body;
    try {
        // Kiểm tra OTP
        const cached = otpPaymentCache.get(matkhau); // still ok to use matkhau as key for now
        if (!cached) return res.json({ success: false, message: 'Vui lòng đăng nhập và nhận mã OTP trước!' });
        if (Date.now() > cached.expiresAt) return res.json({ success: false, message: 'Mã OTP đã hết hạn!' });
        if (cached.otp !== otp) return res.json({ success: false, message: 'Mã OTP không chính xác!' });

        // Authenticate using email and matkhau
        const userResult = await pool.query('SELECT KH.ID_KhachHang FROM TAIKHOAN TK JOIN KHACHHANG KH ON TK.ID_TaiKhoan = KH.ID_TaiKhoan WHERE TK.Email = $1 AND TK.MatKhau = $2', [email, matkhau]);
        if (userResult.rows.length === 0) return res.json({ success: false, message: 'Sai email hoặc mật khẩu!' });
        
        const id_kh = userResult.rows[0].id_khachhang;
        const vitrihang = ghe.charAt(0);
        const vitricot = parseInt(ghe.substring(1));
        // Lấy ID_Phong từ SUATCHIEU (GiaVeCoBan chỉ là fallback nếu frontend không gửi giá)
        const scResult = await pool.query('SELECT ID_Phong, GiaVeCoBan FROM SUATCHIEU WHERE ID_SuatChieu = $1', [id_suatchieu]);
        if (scResult.rows.length === 0) return res.json({ success: false, message: 'Không tìm thấy suất chiếu' });
        const id_phong = scResult.rows[0].id_phong;
        const giaVe = req.body.giaVe || scResult.rows[0].giavecoban || 100000;
        
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Ticket_${id_suatchieu}_${ghe}_${id_kh}`;
        
        await pool.query('BEGIN');
        
        // Kiểm tra xem ghế đã bị người khác đặt chưa
        const checkSeat = await pool.query(`SELECT TrangThai FROM TRANG_THAI_GHE WHERE ID_SuatChieu = $1 AND ID_Phong = $2 AND ViTriHang = $3 AND ViTriCot = $4`, [id_suatchieu, id_phong, vitrihang, vitricot]);
        if (checkSeat.rows.length > 0 && checkSeat.rows[0].trangthai === 'DaDat') {
            throw new Error('Ghế đã bị đặt trước');
        }

        // 1. Update TRANG_THAI_GHE TRƯỚC để thỏa mãn khóa ngoại cho bảng VE
        await pool.query(`INSERT INTO TRANG_THAI_GHE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, TrangThai) VALUES ($1, $2, $3, $4, 'DaDat') ON CONFLICT (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot) DO UPDATE SET TrangThai = 'DaDat'`, 
            [id_suatchieu, id_phong, vitrihang, vitricot]);

        // 2. Insert ticket SAU
        await pool.query(`INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe, MaVeQR) VALUES ($1, $2, $3, $4, $5, $6, $7)`, 
            [id_suatchieu, id_phong, vitrihang, vitricot, id_kh, giaVe, qrCodeUrl]);
        
        // Update TongChiTieu
        await pool.query(`UPDATE KHACHHANG SET TongChiTieu = TongChiTieu + $1 WHERE ID_KhachHang = $2`, [giaVe, id_kh]);
        
        await pool.query('COMMIT');
        
        // Bắn Socket báo ghế đã được đặt cứng
        const io = req.app.get('socketio');
        if (io) io.to(`showtime_${id_suatchieu}`).emit('seat_update', { showtimeId: id_suatchieu, seatId: ghe, action: 'booked' });
        
        res.json({ success: true, qrCode: qrCodeUrl });
    } catch(err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.json({ success: false, message: 'Lỗi hệ thống hoặc ghế đã bị đặt trước!' });
    }
});


// 7. Lịch sử vé của khách hàng
router.post('/my-tickets', async (req, res) => {
  const { email, pass } = req.body;
  try {
    // Xác thực user
    const userResult = await pool.query(
      'SELECT KH.ID_KhachHang, KH.HoTen, KH.Email, KH.LoaiKhachHang, KH.TongChiTieu FROM TAIKHOAN TK JOIN KHACHHANG KH ON TK.ID_TaiKhoan = KH.ID_TaiKhoan WHERE TK.Email = $1 AND TK.MatKhau = $2',
      [email, pass]
    );
    if (userResult.rows.length === 0) return res.json({ success: false, message: 'Sai thông tin đăng nhập' });

    const kh = userResult.rows[0];
    const diem = Math.floor(kh.tongchitieu / 100000);

    // Lấy danh sách vé
    const veResult = await pool.query(`
      SELECT
        V.ID_Ve, V.ViTriHang, V.ViTriCot, V.GiaVe, V.MaVeQR, V.ThoiGianDat,
        P.TenPhim, P.PosterURL,
        SC.ThoiGianBatDau, SC.DinhDang, SC.NgonNgu,
        PC.TenPhong
      FROM VE V
      JOIN SUATCHIEU SC ON V.ID_SuatChieu = SC.ID_SuatChieu
      JOIN PHIM P ON SC.ID_Phim = P.ID_Phim
      JOIN PHONGCHIEU PC ON SC.ID_Phong = PC.ID_Phong
      WHERE V.ID_KhachHang = $1
      ORDER BY V.ThoiGianDat DESC
    `, [kh.id_khachhang]);

    res.json({
      success: true,
      user: {
        name: kh.hoten,
        email: kh.email,
        loai: kh.loaikhachhang,
        tongChiTieu: kh.tongchitieu,
        diem: diem
      },
      tickets: veResult.rows.map(v => ({
        id: v.id_ve,
        seat: `${v.vitrihang.trim()}${v.vitricot}`,
        price: v.giave,
        qr: v.maveqr,
        bookedAt: v.thoigiandatformatted || v.thoigiandat,
        movie: v.tenphim,
        poster: v.posterurl,
        showtime: v.thoigianbatdau,
        format: v.dinhdang,
        lang: v.ngonngu,
        room: v.tenphong
      }))
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;

