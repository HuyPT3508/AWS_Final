const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Xử lý Đăng nhập (Old)
router.post('/login-old', async (req, res) => {
    const { HoTen, MatKhau } = req.body;

    try {
        // Trong hệ thống này, ta tạm thời lấy TAIKHOAN thông qua KHACHHANG.HoTen
        // vì trong form Đăng nhập mẫu (auth.ejs), user chọn HoTen từ dropdown.
        // Thực tế sẽ dùng Email hoặc Username.

        const query = `
            SELECT TK.ID_TaiKhoan, TK.VaiTro, TK.MatKhau
            FROM TAIKHOAN TK
            JOIN KHACHHANG KH ON TK.ID_TaiKhoan = KH.ID_TaiKhoan
            WHERE KH.HoTen = $1
        `;
        const result = await pool.query(query, [HoTen]);

        if (result.rows.length === 0) {
            return res.send('<script>alert("Không tìm thấy người dùng!"); window.location.href="/auth";</script>');
        }

        const user = result.rows[0];

        if (user.matkhau !== MatKhau) {
            return res.send('<script>alert("Sai mật khẩu!"); window.location.href="/auth";</script>');
        }

        // Điều hướng dựa vào Role
        if (user.vaitro === 'QuanTriVien') {
            res.redirect('/admin');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi Server');
    }
});

// Global Login API
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const query = 'SELECT KH.HoTen, KH.Email FROM TAIKHOAN TK JOIN KHACHHANG KH ON TK.ID_TaiKhoan = KH.ID_TaiKhoan WHERE TK.Email = $1 AND TK.MatKhau = $2';
        const result = await pool.query(query, [email, password]);
        if (result.rows.length > 0) {
            res.json({ success: true, user: { name: result.rows[0].hoten, email: result.rows[0].email } });
        } else {
            res.json({ success: false, message: 'Sai email hoặc mật khẩu' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const ses = new SESClient({ region: process.env.AWS_REGION });

// Lưu trữ OTP tạm thời trong bộ nhớ (Dùng Redis/DynamoDB cho production)
// Cấu trúc: otpCache.set(email, { otp: '123456', expiresAt: Date.now() + 5*60000 })
const otpCache = new Map();

// 1. Gửi OTP qua SES
router.post('/register-otp', async (req, res) => {
    const { email } = req.body;

    try {
        // Kiểm tra xem email đã tồn tại trong DB chưa
        const checkQuery = await pool.query('SELECT Email FROM TAIKHOAN WHERE Email = $1', [email]);
        if (checkQuery.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email đã được đăng ký. Vui lòng đăng nhập!' });
        }

        // Tạo mã OTP 6 số ngẫu nhiên
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const params = {
            Destination: { ToAddresses: [email] },
            Message: {
                Body: {
                    Html: {
                        Charset: "UTF-8",
                        Data: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                <h2 style="color: #032b5f; text-align: center;">HCMUT CINEMA</h2>
                                <p style="font-size: 16px;">Xin chào,</p>
                                <p style="font-size: 16px;">Cảm ơn bạn đã đăng ký tài khoản tại HCMUT Cinema.</p>
                                <p style="font-size: 16px;">Mã xác nhận (OTP) của bạn là:</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #d32f2f; padding: 10px 20px; background-color: #f9f9f9; border-radius: 5px;">${otp}</span>
                                </div>
                                <p style="font-size: 14px; color: #666; text-align: center;">Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ cho người khác.</p>
                            </div>
                        `
                    }
                },
                Subject: { Charset: "UTF-8", Data: "[HCMUT Cinema] Mã xác nhận đăng ký tài khoản" }
            },
            Source: "huyphanthanh2.0@gmail.com" // Email Sender đã Verify trên AWS SES
        };

        await ses.send(new SendEmailCommand(params));

        // Lưu OTP vào Cache (Hết hạn sau 5 phút)
        otpCache.set(email, { otp, expiresAt: Date.now() + 300000 });

        res.json({ success: true, message: 'OTP đã được gửi!' });
    } catch (err) {
        console.error("Lỗi gửi SES:", err);
        res.status(500).json({ success: false, message: 'Lỗi khi gửi email qua AWS SES' });
    }
});

// 2. Xác nhận OTP & Lưu DB
router.post('/register-verify', async (req, res) => {
    const { name, email, password, otp } = req.body;

    // Kiểm tra OTP
    const cached = otpCache.get(email);
    if (!cached) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhấn gửi OTP trước!' });
    }

    if (Date.now() > cached.expiresAt) {
        otpCache.delete(email);
        return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn!' });
    }

    if (cached.otp !== otp) {
        return res.status(400).json({ success: false, message: 'Mã OTP không chính xác!' });
    }

    try {
        // Cấp ID tự động
        const idQuery = await pool.query('SELECT MAX(ID_TaiKhoan) as max_id FROM TAIKHOAN');
        const nextId = (idQuery.rows[0].max_id || 0) + 1;

        // Bắt đầu Transaction
        await pool.query('BEGIN');

        // Thêm vào TAIKHOAN
        const tkQuery = `INSERT INTO TAIKHOAN (ID_TaiKhoan, Email, MatKhau, VaiTro) VALUES ($1, $2, $3, 'KhachHang')`;
        await pool.query(tkQuery, [nextId, email, password]);

        // Thêm vào KHACHHANG (Dùng email làm Số ĐT tạm)
        const khQuery = `INSERT INTO KHACHHANG (ID_KhachHang, HoTen, Email, SoDienThoai, TongChiTieu, ID_TaiKhoan) VALUES ($1, $2, $3, $4, 0, $5)`;
        await pool.query(khQuery, [nextId, name, email, email.substring(0, 10), nextId]);

        // Hoàn tất Transaction
        await pool.query('COMMIT');
        
        // Mã đúng & Lưu thành công -> Xóa cache
        otpCache.delete(email);

        res.json({ success: true, message: 'Đăng ký thành công!' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error("Lỗi DB:", error);
        res.status(500).json({ success: false, message: 'Lỗi cơ sở dữ liệu' });
    }
});

module.exports = router;
