DROP DATABASE IF EXISTS CGV_Booking;
CREATE DATABASE CGV_Booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE CGV_Booking;

-- 1. TẠO BẢNG (SCHEMA)

CREATE TABLE RAPCHIEU (
    ID_Rap INT AUTO_INCREMENT PRIMARY KEY, 
    TenRap VARCHAR(100) NOT NULL
);

CREATE TABLE PHIM (
    ID_Phim INT AUTO_INCREMENT PRIMARY KEY, 
    TenPhim VARCHAR(255) NOT NULL, 
    ThoiLuong INT, 
    NgonNguHoTro VARCHAR(255) DEFAULT 'Phụ Đề, Lồng Tiếng'
);

CREATE TABLE PHONGCHIEU (
    ID_Phong INT AUTO_INCREMENT PRIMARY KEY, 
    ID_Rap INT NOT NULL, 
    TenPhong VARCHAR(50) NOT NULL, 
    LoaiPhong VARCHAR(50) DEFAULT '2D', 
    FOREIGN KEY (ID_Rap) REFERENCES RAPCHIEU(ID_Rap) ON DELETE CASCADE
);

CREATE TABLE GHE (
    ID_Phong INT NOT NULL, 
    ViTriHang CHAR(5) NOT NULL, 
    ViTriCot INT NOT NULL, 
    LoaiGhe VARCHAR(50), 
    PRIMARY KEY (ID_Phong, ViTriHang, ViTriCot), 
    FOREIGN KEY (ID_Phong) REFERENCES PHONGCHIEU(ID_Phong) ON DELETE CASCADE
);

CREATE TABLE KHACHHANG (
    ID_KhachHang INT AUTO_INCREMENT PRIMARY KEY, 
    HoTen VARCHAR(100) NOT NULL, 
    Email VARCHAR(100), 
    MatKhau VARCHAR(255) DEFAULT '123456', 
    LoaiKhachHang VARCHAR(20) DEFAULT 'ThanhVien', 
    TongChiTieu DECIMAL(15, 2) DEFAULT 0
);

CREATE TABLE SUATCHIEU (
    ID_SuatChieu INT AUTO_INCREMENT PRIMARY KEY, 
    ID_Phim INT NOT NULL, 
    ID_Phong INT NOT NULL, 
    ThoiGianBatDau DATETIME NOT NULL, 
    ThoiGianKetThuc DATETIME, 
    DinhDang VARCHAR(50), 
    NgonNgu VARCHAR(50), 
    FOREIGN KEY (ID_Phim) REFERENCES PHIM(ID_Phim) ON DELETE CASCADE, 
    FOREIGN KEY (ID_Phong) REFERENCES PHONGCHIEU(ID_Phong) ON DELETE CASCADE
);

CREATE TABLE VE (
    ID_Ve INT AUTO_INCREMENT PRIMARY KEY, 
    ID_SuatChieu INT NOT NULL, 
    ID_Phong INT NOT NULL, 
    ViTriHang CHAR(5) NOT NULL, 
    ViTriCot INT NOT NULL, 
    ID_KhachHang INT NOT NULL, 
    GiaVe DECIMAL(10, 2), 
    TrangThaiVe VARCHAR(50) DEFAULT 'DaThanhToan', 
    FOREIGN KEY (ID_SuatChieu) REFERENCES SUATCHIEU(ID_SuatChieu), -- <--- QUAN TRỌNG: Không cho xóa tự động
    FOREIGN KEY (ID_Phong, ViTriHang, ViTriCot) REFERENCES GHE(ID_Phong, ViTriHang, ViTriCot), 
    CONSTRAINT UQ_Ve UNIQUE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot)
);

CREATE TABLE TRANG_THAI_GHE (
    ID_SuatChieu INT NOT NULL, 
    ID_Phong INT NOT NULL, 
    ViTriHang CHAR(5) NOT NULL, 
    ViTriCot INT NOT NULL, 
    TrangThai VARCHAR(50) DEFAULT 'Trong', 
    PRIMARY KEY (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot), 
    FOREIGN KEY (ID_SuatChieu) REFERENCES SUATCHIEU(ID_SuatChieu) ON DELETE CASCADE
);

-- 2. NẠP DỮ LIỆU CƠ BẢN (RẠP & PHIM)

INSERT INTO RAPCHIEU (TenRap) VALUES 
('CGV Sư Vạn Hạnh'), 
('CGV Hùng Vương'), 
('CGV Landmark 81');

INSERT INTO PHIM (TenPhim, ThoiLuong, NgonNguHoTro) VALUES 
('Oppenheimer', 180, 'Tiếng Anh, Phụ Đề'),                              
('Mission: Impossible - The Final Reckoning', 165, 'Tiếng Anh, Phụ Đề, Lồng Tiếng'), 
('Mưa Đỏ', 110, 'Tiếng Việt'),                                          
('Tử Chiến Trên Không', 118, 'Tiếng Việt'),                             
('Dunkirk', 106, 'Tiếng Anh, Phụ Đề'),                                  
('Interstellar', 169, 'Tiếng Anh, Phụ Đề'),                             
('鬼滅の刃: 無限城編', 120, 'Tiếng Nhật, Phụ Đề'),                        
('Pulp Fiction', 154, 'Tiếng Anh, Phụ Đề'),                             
('28 Years Later', 125, 'Tiếng Anh, Phụ Đề'),                           
('Once Upon a Time in Hollywood', 161, 'Tiếng Anh, Phụ Đề');            

-- Tạo 3 Phòng với 3 loại khác nhau
INSERT INTO PHONGCHIEU (ID_Rap, TenPhong, LoaiPhong) VALUES 
(1, 'Cinema 01', '2D'),
(1, 'IMAX Hall', 'IMAX'),
(2, 'Gold Class', '3D');

-- 3. TOOL TẠO GHẾ TỰ ĐỘNG

DELIMITER //
CREATE PROCEDURE sp_TaoGhe(IN p_Phong INT, IN p_SoHang INT, IN p_SoCot INT, IN p_Loai VARCHAR(50))
BEGIN
    DECLARE v_Hang INT DEFAULT 65; -- ASCII 'A'
    DECLARE v_Cot INT;
    WHILE v_Hang < (65 + p_SoHang) DO
        SET v_Cot = 1;
        WHILE v_Cot <= p_SoCot DO
            INSERT INTO GHE (ID_Phong, ViTriHang, ViTriCot, LoaiGhe) VALUES (p_Phong, CHAR(v_Hang), v_Cot, p_Loai);
            SET v_Cot = v_Cot + 1;
        END WHILE;
        SET v_Hang = v_Hang + 1;
    END WHILE;
END //
DELIMITER ;

-- Chạy tool để tạo ghế thật cho từng phòng
CALL sp_TaoGhe(1, 8, 10, 'Thuong');  -- Phòng 1: 8 Hàng, 10 Cột
CALL sp_TaoGhe(2, 12, 18, 'IMAX');   -- Phòng 2: 12 Hàng, 18 Cột
CALL sp_TaoGhe(3, 5, 8, '3D');      -- Phòng 3: 5 Hàng, 8 Cột

-- 4. NẠP KHÁCH HÀNG

INSERT INTO KHACHHANG (HoTen, Email, MatKhau, LoaiKhachHang, TongChiTieu) VALUES 
('Nguyen Van An', 'an@gmail.com', '123456', 'ThanhVien', 220000),
('Tran Thi Binh', 'binh@gmail.com', '123456', 'VIP', 5500000),
('Duong Le Nhat Duy', 'duy@gmail.com', '123456', 'ThanhVien', 75000),
('Pham Minh Tuan', 'tuan@gmail.com', '123456', 'ThanhVien', 150000),
('Le Hoang Bao', 'bao@gmail.com', '123456', 'ThanhVien', 300000),
('Tran Thanh Hang', 'hang@gmail.com', '123456', 'VIP', 12500000),
('Nguyen Thi Cam Tu', 'tu@gmail.com', '123456', 'ThanhVien', 850000),
('Ho Phuc Khang', 'KhangHo@gmail.com', '123456', 'VIP', 3200000),
('Doan Minh Hai', 'hai@gmail.com', '123456', 'ThanhVien', 95000),
('Vu Thi Ngoc', 'ngoc@gmail.com', '123456', 'ThanhVien', 450000),
('Bui Van Long', 'long@gmail.com', '123456', 'VIP', 8900000),
('Ly Thi Thu Thao', 'thao@gmail.com', '123456', 'ThanhVien', 200000),
('HuyPT', 'HuyPT@gmail.com', '123456', 'ThanhVien', 15000000);
 
-- 5. TẠO LỊCH CHIẾU

INSERT INTO SUATCHIEU (ID_Phim, ID_Phong, ThoiGianBatDau, ThoiGianKetThuc, DinhDang, NgonNgu) VALUES
(1, 1, '2026-05-20 18:00:00', '2025-05-20 21:00:00', '2D', 'Phu De'),
(9, 1, '2026-02-14 20:00:00', '2025-02-14 22:15:00', '2D', 'Tieng Viet'),
(7, 2, '2026-01-03 19:30:00', '2026-01-03 21:30:00', 'IMAX', 'Tieng Nhat'),
(2, 3, '2026-05-01 20:00:00', '2026-05-01 22:45:00', '2D', 'Tieng Anh');


-- 6. NẠP VÉ

INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(1, 1, 'A', 1, 1, 100000), 
(3, 2, 'F', 5, 1, 200000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(3, 2, 'J', 10, 2, 250000), 
(3, 2, 'J', 11, 2, 250000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(2, 1, 'B', 5, 3, 75000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(2, 1, 'C', 1, 4, 85000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(1, 1, 'E', 5, 5, 110000),
(2, 1, 'D', 4, 5, 90000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(4, 3, 'A', 1, 6, 300000), (4, 3, 'A', 2, 6, 300000), (4, 3, 'B', 1, 6, 300000), -- Bao phòng VIP
(1, 1, 'D', 5, 6, 120000), -- Xem chơi 2D
(3, 2, 'G', 8, 6, 250000); -- Ghế đẹp IMAX


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(1, 1, 'F', 6, 7, 100000),
(2, 1, 'E', 6, 7, 95000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(4, 3, 'C', 3, 8, 350000),
(4, 3, 'C', 4, 8, 350000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(2, 1, 'A', 8, 9, 65000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(1, 1, 'G', 4, 10, 110000),
(1, 1, 'G', 5, 10, 110000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(3, 2, 'K', 5, 11, 220000),
(3, 2, 'K', 6, 11, 220000),
(3, 2, 'K', 7, 11, 220000),
(3, 2, 'K', 8, 11, 220000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(1, 1, 'H', 10, 12, 100000);


INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe) VALUES 
(3, 2, 'L', 9, 13, 280000),
(3, 2, 'L', 10, 13, 280000),
(3, 2, 'L', 11, 13, 280000);

-- Cập nhật trạng thái ghế tự động
TRUNCATE TABLE TRANG_THAI_GHE;
INSERT INTO TRANG_THAI_GHE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, TrangThai) 
SELECT ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, 'DaDat' FROM VE;

-- 7. THỦ TỤC LOGIC (STORED PROCEDURES)

DROP FUNCTION IF EXISTS FN_TinhTongDiemThanhVien;
DROP PROCEDURE IF EXISTS sp_LayThongTinKhachHang; 
DROP PROCEDURE IF EXISTS sp_LayDanhSachSuatChieu; 
DROP PROCEDURE IF EXISTS sp_ThemSuatChieu; 
DROP PROCEDURE IF EXISTS SP_KiemTraTrangThaiGhe; 
DROP PROCEDURE IF EXISTS sp_XoaSuatChieu; 
DROP PROCEDURE IF EXISTS sp_LayDanhSachPhim; 
DROP PROCEDURE IF EXISTS sp_LayDanhSachPhong;
DROP PROCEDURE IF EXISTS sp_DangKyKhachHang;
DROP PROCEDURE IF EXISTS sp_DangNhapKhachHang;
DROP PROCEDURE IF EXISTS sp_LayPhimVaSuatChieu;
DROP PROCEDURE IF EXISTS sp_LaySoDoGhe;
DROP PROCEDURE IF EXISTS sp_DatVe;

DELIMITER //

-- Hàm tính điểm
CREATE FUNCTION FN_TinhTongDiemThanhVien(p_ID INT) RETURNS DECIMAL(10,2) READS SQL DATA 
BEGIN 
    DECLARE v_LoaiKH VARCHAR(20); 
    DECLARE v_Tong DECIMAL(10,2); 
    SELECT LoaiKhachHang INTO v_LoaiKH FROM KHACHHANG WHERE ID_KhachHang = p_ID; 
    IF v_LoaiKH IS NULL THEN RETURN -1; END IF; 
    SELECT SUM(GiaVe)/100000 * (CASE WHEN v_LoaiKH = 'VIP' THEN 1.5 ELSE 1 END) INTO v_Tong FROM VE WHERE ID_KhachHang = p_ID; 
    RETURN IFNULL(v_Tong, 0); 
END //

-- Lấy thông tin khách
CREATE PROCEDURE sp_LayThongTinKhachHang(IN p_ID INT) 
BEGIN 
    SELECT HoTen, LoaiKhachHang, IFNULL(TongChiTieu, 0) AS TongChiTieu, FN_TinhTongDiemThanhVien(p_ID) AS DiemTichLuy 
    FROM KHACHHANG WHERE ID_KhachHang = p_ID; 
END //

-- Lấy danh sách suất
CREATE PROCEDURE sp_LayDanhSachSuatChieu(IN p_Key VARCHAR(100)) 
BEGIN 
    SELECT SC.ID_SuatChieu, P.TenPhim, P.ThoiLuong, R.TenRap, PC.TenPhong, SC.ThoiGianBatDau, SC.DinhDang, SC.NgonNgu 
    FROM SUATCHIEU SC 
    JOIN PHIM P ON SC.ID_Phim = P.ID_Phim 
    JOIN PHONGCHIEU PC ON SC.ID_Phong = PC.ID_Phong 
    JOIN RAPCHIEU R ON PC.ID_Rap = R.ID_Rap 
    ORDER BY SC.ThoiGianBatDau DESC; 
END //

-- Thêm suất chiếu (Có check trùng)
CREATE PROCEDURE sp_ThemSuatChieu(IN p_ID_Phim INT, IN p_ID_Phong INT, IN p_ThoiGianBatDau DATETIME, IN p_DinhDang VARCHAR(50), IN p_NgonNgu VARCHAR(50)) 
BEGIN 
    DECLARE v_ThoiLuong INT; 
    DECLARE v_NgonNguHoTro VARCHAR(255); 
    DECLARE v_LoaiPhong VARCHAR(50); 
    DECLARE v_ThoiGianKetThuc DATETIME;
    DECLARE v_Trung INT; 
    
    -- 1. Lấy thông tin phim & Validate
    SELECT ThoiLuong, NgonNguHoTro INTO v_ThoiLuong, v_NgonNguHoTro FROM PHIM WHERE ID_Phim = p_ID_Phim; 
    IF v_NgonNguHoTro NOT LIKE CONCAT('%', p_NgonNgu, '%') THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Phim này không hỗ trợ ngôn ngữ bạn chọn!'; 
    END IF; 
    
    SELECT LoaiPhong INTO v_LoaiPhong FROM PHONGCHIEU WHERE ID_Phong = p_ID_Phong; 
    IF (p_DinhDang = 'IMAX' AND v_LoaiPhong != 'IMAX') THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Phim IMAX bắt buộc phải chiếu ở phòng IMAX!'; 
    ELSEIF (p_DinhDang = '3D' AND v_LoaiPhong != '3D') THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Phim 3D phải chiếu ở phòng 3D!'; 
    END IF; 
    
    -- 2. Tính giờ kết thúc CHUẨN của phim (Không cộng 15p vào DB để số liệu đẹp)
    SET v_ThoiGianKetThuc = DATE_ADD(p_ThoiGianBatDau, INTERVAL v_ThoiLuong MINUTE);

    SELECT COUNT(*) INTO v_Trung 
    FROM SUATCHIEU 
    WHERE ID_Phong = p_ID_Phong 
    AND (
        -- Giờ bắt đầu phim mới < Giờ kết thúc phim cũ + 15p
        (p_ThoiGianBatDau < DATE_ADD(ThoiGianKetThuc, INTERVAL 15 MINUTE))
        AND 
        -- Giờ kết thúc phim mới + 15p > Giờ bắt đầu phim cũ
        (DATE_ADD(v_ThoiGianKetThuc, INTERVAL 15 MINUTE) > ThoiGianBatDau)
    );
    
    IF v_Trung > 0 THEN 
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Trùng lịch chiếu hoặc chưa đủ thời gian dọn dẹp (15p)!'; 
    ELSE 
        INSERT INTO SUATCHIEU (ID_Phim, ID_Phong, ThoiGianBatDau, ThoiGianKetThuc, DinhDang, NgonNgu) 
        VALUES (p_ID_Phim, p_ID_Phong, p_ThoiGianBatDau, v_ThoiGianKetThuc, p_DinhDang, p_NgonNgu); 
    END IF; 
END //

-- CHECK GHẾ (VALIDATION)
CREATE PROCEDURE SP_KiemTraTrangThaiGhe(IN p_Suat INT, IN p_Phong INT, IN p_Hang VARCHAR(5), IN p_Cot INT)
BEGIN
    DECLARE v_LoaiPhong VARCHAR(50);
    SELECT LoaiPhong INTO v_LoaiPhong FROM PHONGCHIEU WHERE ID_Phong = p_Phong;

    -- 1. Check Suất & Phòng
    IF NOT EXISTS (SELECT 1 FROM SUATCHIEU WHERE ID_SuatChieu = p_Suat) THEN
        SELECT 'Lỗi: Suất chiếu không tồn tại' AS TrangThai;
    ELSEIF NOT EXISTS (SELECT 1 FROM PHONGCHIEU WHERE ID_Phong = p_Phong) THEN
        SELECT 'Lỗi: Phòng chiếu không tồn tại' AS TrangThai;
    
    -- 2. CHECK TỌA ĐỘ DỰA TRÊN DỮ LIỆU GHẾ THẬT
    ELSEIF NOT EXISTS (SELECT 1 FROM GHE WHERE ID_Phong = p_Phong AND ViTriHang = p_Hang AND ViTriCot = p_Cot) THEN
        SELECT CONCAT('Lỗi: Tọa độ ', p_Hang, p_Cot, ' không tồn tại trong phòng ', v_LoaiPhong) AS TrangThai;
        
    -- 3. Nếu ghế hợp lệ
    ELSE
        SELECT IFNULL((SELECT TrangThai FROM TRANG_THAI_GHE WHERE ID_SuatChieu = p_Suat AND ID_Phong = p_Phong AND ViTriHang = p_Hang AND ViTriCot = p_Cot), 'Trong') AS TrangThai;
    END IF;
END //

CREATE PROCEDURE sp_XoaSuatChieu(IN p_ID INT) 
BEGIN 
    DELETE FROM SUATCHIEU WHERE ID_SuatChieu = p_ID; 
END //

CREATE PROCEDURE sp_LayDanhSachPhim() 
BEGIN 
    SELECT ID_Phim, TenPhim, NgonNguHoTro FROM PHIM ORDER BY TenPhim; 
END //

CREATE PROCEDURE sp_LayDanhSachPhong() 
BEGIN 
    SELECT PC.ID_Phong, PC.LoaiPhong, CONCAT(R.TenRap, ' - ', PC.TenPhong, ' (', PC.LoaiPhong, ')') AS TenPhongHienThi 
    FROM PHONGCHIEU PC 
    JOIN RAPCHIEU R ON PC.ID_Rap = R.ID_Rap 
    ORDER BY R.TenRap, PC.TenPhong; 
END //

-- ==============================================
-- CÁC STORED PROCEDURES CHO KHÁCH HÀNG (CUSTOMER)
-- ==============================================

-- 1. Đăng ký khách hàng mới
CREATE PROCEDURE sp_DangKyKhachHang(IN p_HoTen VARCHAR(100), IN p_Email VARCHAR(100), IN p_MatKhau VARCHAR(255))
BEGIN
    INSERT INTO KHACHHANG (HoTen, Email, MatKhau) VALUES (p_HoTen, p_Email, p_MatKhau);
END //

-- 2. Đăng nhập khách hàng
CREATE PROCEDURE sp_DangNhapKhachHang(IN p_ID INT, IN p_MatKhau VARCHAR(255))
BEGIN
    SELECT ID_KhachHang, HoTen, Email, LoaiKhachHang, TongChiTieu
    FROM KHACHHANG 
    WHERE ID_KhachHang = p_ID AND MatKhau = p_MatKhau;
END //

-- 3. Lấy danh sách phim đang chiếu
CREATE PROCEDURE sp_LayPhimVaSuatChieu()
BEGIN
    SELECT P.ID_Phim, P.TenPhim, P.ThoiLuong, P.NgonNguHoTro, 
           SC.ID_SuatChieu, SC.ThoiGianBatDau, SC.DinhDang, SC.NgonNgu,
           R.TenRap, PC.TenPhong
    FROM PHIM P
    JOIN SUATCHIEU SC ON P.ID_Phim = SC.ID_Phim
    JOIN PHONGCHIEU PC ON SC.ID_Phong = PC.ID_Phong
    JOIN RAPCHIEU R ON PC.ID_Rap = R.ID_Rap
    WHERE SC.ThoiGianBatDau >= NOW()
    ORDER BY P.TenPhim, SC.ThoiGianBatDau;
END //

-- 4. Lấy sơ đồ ghế của phòng theo suất chiếu
CREATE PROCEDURE sp_LaySoDoGhe(IN p_Suat INT)
BEGIN
    DECLARE v_Phong INT;
    SELECT ID_Phong INTO v_Phong FROM SUATCHIEU WHERE ID_SuatChieu = p_Suat;
    
    SELECT G.ViTriHang, G.ViTriCot, G.LoaiGhe, 
           IFNULL(T.TrangThai, 'Trong') AS TrangThai
    FROM GHE G
    LEFT JOIN TRANG_THAI_GHE T 
           ON G.ID_Phong = T.ID_Phong 
          AND G.ViTriHang = T.ViTriHang 
          AND G.ViTriCot = T.ViTriCot 
          AND T.ID_SuatChieu = p_Suat
    WHERE G.ID_Phong = v_Phong
    ORDER BY G.ViTriHang, G.ViTriCot;
END //

-- 5. Đặt vé (Sử dụng Transaction chống trùng)
CREATE PROCEDURE sp_DatVe(IN p_Suat INT, IN p_Hang VARCHAR(5), IN p_Cot INT, IN p_Khach INT, IN p_GiaVe DECIMAL(10,2))
BEGIN
    DECLARE v_Phong INT;
    DECLARE v_TrangThai VARCHAR(50);
    
    -- Lấy ID Phòng
    SELECT ID_Phong INTO v_Phong FROM SUATCHIEU WHERE ID_SuatChieu = p_Suat;
    
    START TRANSACTION;
    
    -- Lock Row ghế này để check
    SELECT TrangThai INTO v_TrangThai 
    FROM TRANG_THAI_GHE 
    WHERE ID_SuatChieu = p_Suat AND ID_Phong = v_Phong AND ViTriHang = p_Hang AND ViTriCot = p_Cot
    FOR UPDATE;
    
    IF v_TrangThai IS NULL THEN
        -- Chưa có trong bảng TRANG_THAI_GHE (nghĩa là 'Trong')
        INSERT INTO TRANG_THAI_GHE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, TrangThai)
        VALUES (p_Suat, v_Phong, p_Hang, p_Cot, 'DaDat');
        
        INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe)
        VALUES (p_Suat, v_Phong, p_Hang, p_Cot, p_Khach, p_GiaVe);
        
        -- Cập nhật tổng chi tiêu
        UPDATE KHACHHANG SET TongChiTieu = TongChiTieu + p_GiaVe WHERE ID_KhachHang = p_Khach;
        
        COMMIT;
        SELECT 'ThanhCong' AS KetQua;
    ELSEIF v_TrangThai = 'Trong' THEN
        -- Đã có nhưng đang 'Trong' (có thể ai đó đã hủy vé)
        UPDATE TRANG_THAI_GHE SET TrangThai = 'DaDat' 
        WHERE ID_SuatChieu = p_Suat AND ID_Phong = v_Phong AND ViTriHang = p_Hang AND ViTriCot = p_Cot;
        
        INSERT INTO VE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, ID_KhachHang, GiaVe)
        VALUES (p_Suat, v_Phong, p_Hang, p_Cot, p_Khach, p_GiaVe);
        
        -- Cập nhật tổng chi tiêu
        UPDATE KHACHHANG SET TongChiTieu = TongChiTieu + p_GiaVe WHERE ID_KhachHang = p_Khach;
        
        COMMIT;
        SELECT 'ThanhCong' AS KetQua;
    ELSE
        -- Đã bị đặt
        ROLLBACK;
        SELECT 'Loi_DaDat' AS KetQua;
    END IF;
END //

DELIMITER ;
