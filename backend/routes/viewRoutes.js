const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- CÁC TRANG KHÁCH HÀNG ---
// Trang chủ (danh sách phim)
router.get('/', async (req, res) => {
    try {
        // Lấy danh sách phim
        const phimResult = await pool.query('SELECT * FROM PHIM WHERE TrangThai = $1', ['DangChieu']);
        // SC.ThoiGianBatDau in postgresql is timestamp. We don't filter NOW() for demo simplicity, just get all showtimes for movies
        const scResult = await pool.query('SELECT * FROM SUATCHIEU');
        
        const dsPhim = phimResult.rows.map(p => ({
            ...p,
            SuatChieu: scResult.rows.filter(sc => sc.id_phim === p.id_phim)
        }));
        
        res.render('client/home', { dsPhim: dsPhim, user: null });
    } catch (error) {
        console.error(error);
        res.render('client/home', { dsPhim: [], user: null });
    }
});

// Trang Đăng nhập / Đăng ký
router.get('/auth', async (req, res) => {
    try {
        const result = await pool.query('SELECT HoTen FROM KHACHHANG');
        res.render('client/auth', { khachHangs: result.rows });
    } catch (error) {
        console.error(error);
        res.render('client/auth', { khachHangs: [] });
    }
});

// Trang chi tiết phim & Đặt ghế
router.get('/booking/:showtimeId', async (req, res) => {
    try {
        const id = req.params.showtimeId;
        const query = `
            SELECT SC.*, P.TenPhim, R.TenRap, PC.TenPhong 
            FROM SUATCHIEU SC
            JOIN PHIM P ON SC.ID_Phim = P.ID_Phim
            JOIN PHONGCHIEU PC ON SC.ID_Phong = PC.ID_Phong
            JOIN RAPCHIEU R ON PC.ID_Rap = R.ID_Rap
            WHERE SC.ID_SuatChieu = $1
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) return res.send('Không tìm thấy suất chiếu');
        
        res.render('client/booking', { showtimeId: id, suatChieu: result.rows[0], gheDaDat: [], user: null });
    } catch (error) {
        console.error(error);
        res.send('Lỗi server');
    }
});


// --- CÁC TRANG ADMIN ---
router.get('/admin', (req, res) => {
    res.render('admin/index');
});

router.get('/admin/phim', (req, res) => {
    res.render('admin/phim');
});

router.get('/admin/add-showtime', (req, res) => {
    res.render('admin/add');
});

router.get('/admin/tienich', (req, res) => {
    res.render('admin/tienich');
});

module.exports = router;
