const express = require('express');
const router = express.Router();
const { pool, sesClient } = require('../config/db');
const { SendEmailCommand } = require('@aws-sdk/client-ses');

// 1. Dashboard API
router.get('/dashboard', async (req, res) => {
  try {
    const revenueQuery = await pool.query('SELECT SUM(GiaVe) as total FROM VE');
    const ticketsQuery = await pool.query('SELECT COUNT(*) as total FROM VE');
    const moviesQuery = await pool.query("SELECT COUNT(*) as total FROM PHIM WHERE TrangThai = 'DangChieu'");
    
    // Revenue by Movie
    const revMovieQuery = await pool.query(`
      SELECT P.TenPhim, SUM(V.GiaVe) as revenue
      FROM VE V
      JOIN SUATCHIEU SC ON V.ID_SuatChieu = SC.ID_SuatChieu
      JOIN PHIM P ON SC.ID_Phim = P.ID_Phim
      GROUP BY P.TenPhim
      ORDER BY revenue DESC
      LIMIT 7
    `);

    // Customer types
    const custTypeQuery = await pool.query(`
      SELECT LoaiKhachHang, COUNT(*) as count
      FROM KHACHHANG
      GROUP BY LoaiKhachHang
    `);

    // Occupancy (Số lượng ghế đã bán / Tổng số suất chiếu * 80)
    const totalSuatChieuQuery = await pool.query(`SELECT COUNT(*) as count FROM SUATCHIEU`);
    const totalSuatChieu = Number(totalSuatChieuQuery.rows[0].count) || 1;
    const bookedSeatsQuery = await pool.query(`SELECT COUNT(*) as total FROM TRANG_THAI_GHE WHERE TrangThai = 'DaDat'`);
    const bookedSeats = Number(bookedSeatsQuery.rows[0].total) || 0;
    const occupancyPercent = ((bookedSeats / (totalSuatChieu * 80)) * 100).toFixed(1) + '%';

    // 7-day trend
    const trendQuery = await pool.query(`
      SELECT DATE(ThoiGianDat) as date, SUM(GiaVe) as revenue
      FROM VE
      WHERE ThoiGianDat >= current_date - interval '7 days'
      GROUP BY DATE(ThoiGianDat)
      ORDER BY date ASC
    `);

    // Occupancy by room format
    const occRoomQuery = await pool.query(`
      SELECT SC.DinhDang, COUNT(G.ViTriHang) as booked_seats
      FROM SUATCHIEU SC
      JOIN TRANG_THAI_GHE G ON SC.ID_SuatChieu = G.ID_SuatChieu AND G.TrangThai = 'DaDat'
      GROUP BY SC.DinhDang
    `);

    // Seat Heatmap
    const heatmapQuery = await pool.query(`
      SELECT ViTriHang, ViTriCot, COUNT(*) as frequency
      FROM TRANG_THAI_GHE
      WHERE TrangThai = 'DaDat'
      GROUP BY ViTriHang, ViTriCot
    `);

    res.json({
      metrics: {
        movies: moviesQuery.rows[0].total || 0,
        tickets: ticketsQuery.rows[0].total || 0,
        occupancy: occupancyPercent,
        revenue: Number(revenueQuery.rows[0].total || 0).toLocaleString('vi-VN')
      },
      charts: {
        revenueByMovie: revMovieQuery.rows,
        customerTypes: custTypeQuery.rows,
        trend: trendQuery.rows,
        occupancyByRoom: occRoomQuery.rows,
        heatmap: heatmapQuery.rows
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 2. Thêm phim mới
router.post('/phim/them', async (req, res) => {
  const { TenPhim, ThoiLuong, DaoDien, NgonNguHoTro, DinhDangHoTro, PosterURL, BannerURL, TrailerURL, FileHopDongURL } = req.body;
  
  try {
    const query = `
      INSERT INTO PHIM (TenPhim, ThoiLuong, DaoDien, NgonNguHoTro, DinhDangHoTro, PosterURL, BannerURL, TrailerURL, FileHopDongURL, TrangThaiBanQuyen, TrangThai) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DaDuyet', 'DangChieu')
    `;
    await pool.query(query, [TenPhim, ThoiLuong, DaoDien, NgonNguHoTro, DinhDangHoTro, PosterURL, BannerURL, TrailerURL, FileHopDongURL]);
    res.json({ success: true, message: "Thêm phim thành công" });
  } catch(err) {
    console.error(err);
    res.json({ success: false, message: "Thêm phim thất bại" });
  }
});

// 3. Thêm suất chiếu mới
router.post('/luu', async (req, res) => {
  const { ID_Phim, ID_Phong, ThoiGianBatDau, DinhDang, NgonNgu } = req.body;
  try {
    const query = `
      INSERT INTO SUATCHIEU (ID_Phim, ID_Phong, ThoiGianBatDau, DinhDang, NgonNgu, GiaVeCoBan) 
      VALUES ($1, $2, $3, $4, $5, 100000)
    `;
    await pool.query(query, [ID_Phim, ID_Phong, ThoiGianBatDau, DinhDang, NgonNgu || 'Phụ Đề']);
    res.json({ success: true, message: "Thêm suất chiếu thành công" });
  } catch(err) {
    console.error(err);
    res.json({ success: false, message: "Thêm suất chiếu thất bại" });
  }
});

// 4. Kiểm tra trùng lịch chiếu
router.post('/check-conflict', async (req, res) => {
  const { roomId, datetime, duration } = req.body;
  
  try {
    const newStart = new Date(datetime);
    const newEnd = new Date(newStart.getTime() + (duration + 15) * 60000);
    
    const query = `
      SELECT SC.ID_SuatChieu, P.TenPhim, SC.ThoiGianBatDau, P.ThoiLuong 
      FROM SUATCHIEU SC
      JOIN PHIM P ON SC.ID_Phim = P.ID_Phim
      WHERE SC.ID_Phong = $1
    `;
    const result = await pool.query(query, [roomId]);
    
    let isConflict = false;
    let conflictDetails = null;

    for (let s of result.rows) {
      const sStart = new Date(s.thoigianbatdau);
      const sEnd = new Date(sStart.getTime() + (s.thoiluong + 15) * 60000);
      
      if (newStart < sEnd && newEnd > sStart) {
        isConflict = true;
        conflictDetails = s;
        break;
      }
    }

    if (isConflict) {
      res.json({ conflict: true, details: conflictDetails });
    } else {
      res.json({ conflict: false });
    }
  } catch (error) {
    console.error(error);
    res.json({ conflict: false });
  }
});

// 5. Tra cứu điểm tích lũy
router.post('/api/diem', async (req, res) => {
  const { idKhach } = req.body;
  try {
    const result = await pool.query('SELECT HoTen, LoaiKhachHang, TongChiTieu FROM KHACHHANG WHERE ID_KhachHang = $1', [idKhach]);
    if (result.rows.length === 0) return res.json({ success: false, msg: 'Không tìm thấy Khách Hàng' });
    
    const kh = result.rows[0];
    const diem = Math.floor(kh.tongchitieu / 100000); // 100k = 1 point
    res.json({ 
      success: true, 
      data: {
        ten: kh.hoten,
        loai: kh.loaikhachhang,
        chiTieu: kh.tongchitieu,
        diem: diem
      } 
    });
  } catch(err) {
    res.json({ success: false, msg: 'Lỗi server' });
  }
});

// 6. Tra cứu trạng thái ghế
router.post('/api/ghe', async (req, res) => {
  const { idSuat, idPhong, hang, cot } = req.body;
  try {
    const result = await pool.query('SELECT TrangThai FROM TRANG_THAI_GHE WHERE ID_SuatChieu = $1 AND ID_Phong = $2 AND ViTriHang = $3 AND ViTriCot = $4', [idSuat, idPhong, hang, cot]);
    if (result.rows.length === 0) return res.json({ success: true, trangThai: 'Trong' });
    res.json({ success: true, trangThai: result.rows[0].trangthai });
  } catch(err) {
    res.json({ success: false });
  }
});
// 7. Cập nhật thông tin phim (Sửa)
router.put('/phim/capnhat/:id', async (req, res) => {
  const id = req.params.id;
  const { TenPhim, ThoiLuong, DaoDien, PosterURL, BannerURL, TrailerURL, NgonNguHoTro, DinhDangHoTro } = req.body;
  try {
    const query = `
      UPDATE PHIM 
      SET TenPhim = $1, ThoiLuong = $2, DaoDien = $3, PosterURL = $4, BannerURL = $5, TrailerURL = $6, NgonNguHoTro = $7, DinhDangHoTro = $8
      WHERE ID_Phim = $9
    `;
    await pool.query(query, [TenPhim, ThoiLuong, DaoDien, PosterURL, BannerURL, TrailerURL, NgonNguHoTro, DinhDangHoTro, id]);
    res.json({ success: true, message: "Cập nhật phim thành công" });
  } catch(err) {
    console.error(err);
    res.json({ success: false, message: "Cập nhật phim thất bại" });
  }
});

// 8. Xóa phim (cascade: email hoàn tiền → xóa TTG → VE → SUATCHIEU → PHIM)
router.delete('/phim/xoa/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // Lấy tên phim
    const phimResult = await pool.query('SELECT TenPhim FROM PHIM WHERE ID_Phim = $1', [id]);
    if (phimResult.rows.length === 0) return res.json({ success: false, message: 'Không tìm thấy phim' });
    const tenPhim = phimResult.rows[0].tenphim;

    // Lấy tất cả vé đã bán của phim này (kèm email và giá)
    const veResult = await pool.query(`
      SELECT V.ID_Ve, V.GiaVe, V.ID_KhachHang, KH.Email, KH.HoTen, V.ViTriHang, V.ViTriCot
      FROM VE V
      JOIN SUATCHIEU SC ON V.ID_SuatChieu = SC.ID_SuatChieu
      JOIN KHACHHANG KH ON V.ID_KhachHang = KH.ID_KhachHang
      WHERE SC.ID_Phim = $1
    `, [id]);

    await pool.query('BEGIN');

    // Gom vé theo khách hàng để hoàn tiền và gửi 1 email duy nhất
    const refundsByUser = {};
    for (const row of veResult.rows) {
      if (!refundsByUser[row.id_khachhang]) {
        refundsByUser[row.id_khachhang] = {
          email: row.email,
          hoten: row.hoten,
          totalAmount: 0,
          seats: []
        };
      }
      refundsByUser[row.id_khachhang].totalAmount += Number(row.giave);
      refundsByUser[row.id_khachhang].seats.push(`${row.vitrihang.trim()}${row.vitricot}`);
    }

    for (const id_kh in refundsByUser) {
      const user = refundsByUser[id_kh];
      await pool.query('UPDATE KHACHHANG SET TongChiTieu = TongChiTieu - $1 WHERE ID_KhachHang = $2', [user.totalAmount, id_kh]);

      try {
        const emailParams = {
          Destination: { ToAddresses: [user.email] },
          Message: {
            Body: { Text: { Data:
              `Kính gửi ${user.hoten},\n\n` +
              `Chúng tôi xin thông báo rằng phim "${tenPhim}" đã bị hủy khỏi lịch chiếu.\n` +
              `Vé của bạn cho các ghế: ${user.seats.join(', ')} đã bị hủy.\n` +
              `Tổng số tiền được hoàn lại là ${user.totalAmount.toLocaleString('vi-VN')} VNĐ vào tài khoản.\n\n` +
              `Chúng tôi xin lỗi vì sự bất tiện này.\n` +
              `Trân trọng,\nHCMUT Cinema`
            }},
            Subject: { Data: `[HCMUT Cinema] Thông báo hủy phim & Hoàn tiền: ${tenPhim}` },
          },
          Source: 'huyphanthanh2.0@gmail.com',
        };
        await sesClient.send(new SendEmailCommand(emailParams));
        console.log(`[SES] Đã gửi email hoàn tiền phim cho ${user.email}`);
      } catch (emailErr) {
        console.error('[SES] Gửi email hoàn tiền phim thất bại cho', user.email, emailErr.message);
      }
    }

    // Lấy danh sách suất chiếu của phim
    const scResult = await pool.query('SELECT ID_SuatChieu FROM SUATCHIEU WHERE ID_Phim = $1', [id]);
    const scIds = scResult.rows.map(r => r.id_suatchieu);

    if (scIds.length > 0) {
      const scPlaceholders = scIds.map((_, i) => `$${i + 1}`).join(',');
      // Xóa TRANG_THAI_GHE trước
      await pool.query(`DELETE FROM TRANG_THAI_GHE WHERE ID_SuatChieu IN (${scPlaceholders})`, scIds);
      // Xóa VE
      await pool.query(`DELETE FROM VE WHERE ID_SuatChieu IN (${scPlaceholders})`, scIds);
      // Xóa SUATCHIEU
      await pool.query(`DELETE FROM SUATCHIEU WHERE ID_Phim = $1`, [id]);
    }

    // Cuối cùng xóa PHIM
    await pool.query('DELETE FROM PHIM WHERE ID_Phim = $1', [id]);

    await pool.query('COMMIT');
    res.json({ success: true, message: `Xóa phim thành công. Đã gửi email hoàn tiền cho ${veResult.rows.length} khách hàng.` });
  } catch(err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.json({ success: false, message: 'Không thể xóa phim: ' + err.message });
  }
});
// 9. Lấy danh sách suất chiếu
router.get('/showtimes', async (req, res) => {
  try {
    const query = `
      SELECT SC.ID_SuatChieu, P.TenPhim, PC.TenPhong, SC.ThoiGianBatDau, SC.DinhDang, SC.NgonNgu AS NgonNguHoTro
      FROM SUATCHIEU SC
      JOIN PHIM P ON SC.ID_Phim = P.ID_Phim
      JOIN PHONGCHIEU PC ON SC.ID_Phong = PC.ID_Phong
      ORDER BY SC.ThoiGianBatDau DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 10. Xóa suất chiếu
router.delete('/showtimes/xoa/:id', async (req, res) => {
  const id = req.params.id;
  try {
    // Lấy thông tin suất chiếu và phim
    const scInfo = await pool.query(`
      SELECT SC.ID_SuatChieu, P.TenPhim 
      FROM SUATCHIEU SC 
      JOIN PHIM P ON SC.ID_Phim = P.ID_Phim 
      WHERE SC.ID_SuatChieu = $1
    `, [id]);
    if (scInfo.rows.length === 0) return res.json({ success: false, message: 'Không tìm thấy suất chiếu' });
    const tenPhim = scInfo.rows[0].tenphim;

    // Lấy tất cả vé đã bán của suất chiếu này
    const veResult = await pool.query(`
      SELECT V.ID_Ve, V.GiaVe, V.ID_KhachHang, KH.Email, KH.HoTen, V.ViTriHang, V.ViTriCot
      FROM VE V
      JOIN KHACHHANG KH ON V.ID_KhachHang = KH.ID_KhachHang
      WHERE V.ID_SuatChieu = $1
    `, [id]);

    await pool.query('BEGIN');

    const refundsByUser = {};
    for (const row of veResult.rows) {
      if (!refundsByUser[row.id_khachhang]) {
        refundsByUser[row.id_khachhang] = {
          email: row.email,
          hoten: row.hoten,
          totalAmount: 0,
          seats: []
        };
      }
      refundsByUser[row.id_khachhang].totalAmount += Number(row.giave);
      refundsByUser[row.id_khachhang].seats.push(`${row.vitrihang.trim()}${row.vitricot}`);
    }

    for (const id_kh in refundsByUser) {
      const user = refundsByUser[id_kh];
      await pool.query('UPDATE KHACHHANG SET TongChiTieu = TongChiTieu - $1 WHERE ID_KhachHang = $2', [user.totalAmount, id_kh]);
      
      try {
        const emailParams = {
          Destination: { ToAddresses: [user.email] },
          Message: {
            Body: { Text: { Data:
              `Kính gửi ${user.hoten},\n\n` +
              `Chúng tôi xin thông báo rằng suất chiếu phim "${tenPhim}" đã bị hủy.\n` +
              `Vé của bạn cho các ghế: ${user.seats.join(', ')} đã bị hủy.\n` +
              `Tổng số tiền được hoàn lại là ${user.totalAmount.toLocaleString('vi-VN')} VNĐ vào tài khoản.\n\n` +
              `Chúng tôi xin lỗi vì sự bất tiện này.\n` +
              `Trân trọng,\nHCMUT Cinema`
            }},
            Subject: { Data: `[HCMUT Cinema] Thông báo hủy suất chiếu & Hoàn tiền: ${tenPhim}` },
          },
          Source: 'huyphanthanh2.0@gmail.com',
        };
        await sesClient.send(new SendEmailCommand(emailParams));
        console.log(`[SES] Đã gửi email hoàn tiền suất chiếu cho ${user.email}`);
      } catch (emailErr) {
        console.error('[SES] Gửi email hoàn tiền suất chiếu thất bại cho', user.email, emailErr.message);
      }
    }

    // Xóa TRANG_THAI_GHE, VE, SUATCHIEU
    await pool.query('DELETE FROM TRANG_THAI_GHE WHERE ID_SuatChieu = $1', [id]);
    await pool.query('DELETE FROM VE WHERE ID_SuatChieu = $1', [id]);
    await pool.query('DELETE FROM SUATCHIEU WHERE ID_SuatChieu = $1', [id]);

    await pool.query('COMMIT');
    res.json({ success: true, message: `Xóa suất chiếu thành công. Đã hoàn tiền cho ${veResult.rows.length} khách hàng.` });
  } catch(err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.json({ success: false, message: "Không thể xóa suất chiếu" });
  }
});

module.exports = router;
