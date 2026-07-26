-- 1. TẠO BẢNG (SCHEMA)
DROP TABLE IF EXISTS TRANG_THAI_GHE, VE, SUATCHIEU, QUANTRIVIEN, KHACHHANG, TAIKHOAN, GHE, PHONGCHIEU, PHIM, RAPCHIEU CASCADE;

CREATE TABLE RAPCHIEU (
    ID_Rap SERIAL PRIMARY KEY, 
    TenRap VARCHAR(100) NOT NULL,
    DiaChi VARCHAR(255)
);

CREATE TABLE PHIM (
    ID_Phim SERIAL PRIMARY KEY, 
    TenPhim VARCHAR(255) NOT NULL, 
    ThoiLuong INT, 
    DaoDien VARCHAR(100),
    NgonNguHoTro VARCHAR(255) DEFAULT 'Phụ Đề, Lồng Tiếng',
    TheLoai VARCHAR(100),
    PosterURL TEXT,
    BannerURL TEXT,
    TrailerURL TEXT,
    FileHopDongURL TEXT,
    TrangThaiBanQuyen VARCHAR(50) DEFAULT 'ChoDuyet',
    TrangThai VARCHAR(50) DEFAULT 'DangChieu'
);

CREATE TABLE PHONGCHIEU (
    ID_Phong SERIAL PRIMARY KEY, 
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

CREATE TABLE TAIKHOAN (
    ID_TaiKhoan SERIAL PRIMARY KEY,
    Email VARCHAR(100) UNIQUE NOT NULL,
    MatKhau VARCHAR(255) NOT NULL,
    VaiTro VARCHAR(20) NOT NULL -- 'KhachHang' hoặc 'QuanTriVien'
);

CREATE TABLE KHACHHANG (
    ID_KhachHang SERIAL PRIMARY KEY,
    ID_TaiKhoan INT UNIQUE,
    Email VARCHAR(100),
    HoTen VARCHAR(100) NOT NULL, 
    SoDienThoai VARCHAR(20),
    LoaiKhachHang VARCHAR(20) DEFAULT 'ThanhVien', 
    TongChiTieu DECIMAL(15, 2) DEFAULT 0,
    FOREIGN KEY (ID_TaiKhoan) REFERENCES TAIKHOAN(ID_TaiKhoan) ON DELETE CASCADE
);

CREATE TABLE QUANTRIVIEN (
    ID_QTV SERIAL PRIMARY KEY,
    ID_TaiKhoan INT UNIQUE NOT NULL,
    HoTen VARCHAR(100) NOT NULL,
    SoDienThoai VARCHAR(20),
    EmailNoiBo VARCHAR(100),
    FOREIGN KEY (ID_TaiKhoan) REFERENCES TAIKHOAN(ID_TaiKhoan) ON DELETE CASCADE
);

CREATE TABLE SUATCHIEU (
    ID_SuatChieu SERIAL PRIMARY KEY, 
    ID_Phim INT NOT NULL, 
    ID_Phong INT NOT NULL, 
    ThoiGianBatDau TIMESTAMP NOT NULL, 
    ThoiGianKetThuc TIMESTAMP, 
    DinhDang VARCHAR(50), 
    NgonNgu VARCHAR(50), 
    GiaVeCoBan DECIMAL(10, 2) DEFAULT 100000,
    FOREIGN KEY (ID_Phim) REFERENCES PHIM(ID_Phim) ON DELETE CASCADE, 
    FOREIGN KEY (ID_Phong) REFERENCES PHONGCHIEU(ID_Phong) ON DELETE CASCADE
);

CREATE TABLE VE (
    ID_Ve SERIAL PRIMARY KEY, 
    ID_SuatChieu INT NOT NULL, 
    ID_Phong INT NOT NULL, 
    ViTriHang CHAR(5) NOT NULL, 
    ViTriCot INT NOT NULL, 
    ID_KhachHang INT NOT NULL, 
    GiaVe DECIMAL(10, 2), 
    ThoiGianDat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TrangThaiVe VARCHAR(50) DEFAULT 'DaThanhToan',
    MaVeQR VARCHAR(100) UNIQUE,
    FOREIGN KEY (ID_SuatChieu) REFERENCES SUATCHIEU(ID_SuatChieu), 
    FOREIGN KEY (ID_Phong, ViTriHang, ViTriCot) REFERENCES GHE(ID_Phong, ViTriHang, ViTriCot), 
    FOREIGN KEY (ID_KhachHang) REFERENCES KHACHHANG(ID_KhachHang),
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

-- Bỏ cột SessionID và ThoiGianGiu vì đã chuyển sang DynamoDB với bảng HCMUTCinema_SeatLocks (theo Plan AWS)

-- 2. NẠP DỮ LIỆU CƠ BẢN (RẠP & PHIM)
INSERT INTO RAPCHIEU (TenRap, DiaChi) VALUES 
('HCMUT Cinema', '268 Lý Thường Kiệt, Q.10, TP.HCM');

INSERT INTO PHIM (TenPhim, ThoiLuong, DaoDien, NgonNguHoTro, TheLoai, PosterURL, BannerURL, TrailerURL, FileHopDongURL, TrangThaiBanQuyen, TrangThai) VALUES 
('Avengers: Endgame', 181, 'Anthony Russo, Joe Russo', 'Tiếng Anh, Phụ Đề', 'Hành Động, Viễn Tưởng', 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', 'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg', 'TcMBFSGVi1c', 'https://s3.aws.com/contracts/endgame.pdf', 'DaDuyet', 'DangChieu'),
('Spider-Man: No Way Home', 148, 'Jon Watts', 'Lồng Tiếng', 'Hành Động, Viễn Tưởng', 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1Z1yewB62xL09j.jpg', 'https://image.tmdb.org/t/p/original/1g0dhYtq4irTY1Z1yewB62xL09j.jpg', 'JfVOs4VSpmA', 'https://s3.aws.com/contracts/spiderman.pdf', 'DaDuyet', 'DangChieu'),
('Oppenheimer', 180, 'Christopher Nolan', 'Tiếng Anh, Phụ Đề', 'Tâm Lý, Lịch Sử', 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 'https://image.tmdb.org/t/p/original/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg', 'uYPbbksJxIg', 'https://s3.aws.com/contracts/oppenheimer.pdf', 'DaDuyet', 'DangChieu'),
('Mission: Impossible — The Final Reckoning', 165, 'Christopher McQuarrie', 'Tiếng Anh, Phụ Đề, Lồng Tiếng', 'Hành Động, Phiêu Lưu', 'https://image.tmdb.org/t/p/w500/z0zhsiNsrGpSolhMkyIjJO7sOJ0.jpg', '', 'avz06HqOuqo', NULL, 'ChoDuyet', 'SapChieu'),
('Interstellar', 169, 'Christopher Nolan', 'Tiếng Anh, Phụ Đề', 'Viễn Tưởng, Tâm Lý', 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', '', 'zSWdZVtXT7E', 'https://s3.aws.com/contracts/interstellar.pdf', 'DaDuyet', 'DangChieu');

-- Tạo 8 Phòng với các loại khác nhau
INSERT INTO PHONGCHIEU (ID_Rap, TenPhong, LoaiPhong) VALUES 
(1, 'Cinema 01', '2D'),
(1, 'Cinema 02', '2D'),
(1, 'Cinema 03', '2D'),
(1, 'Cinema 04', '2D'),
(1, 'Cinema 05', '3D'),
(1, 'Cinema 06', '3D'),
(1, 'IMAX 01', 'IMAX'),
(1, 'IMAX 02', 'IMAX');

-- 3. TOOL TẠO GHẾ TỰ ĐỘNG BẰNG PL/pgSQL (PostgreSQL)
CREATE OR REPLACE FUNCTION fn_TaoGhe(p_Phong INT, p_SoHang INT, p_SoCot INT, p_Loai VARCHAR(50))
RETURNS void AS $$
DECLARE
    v_Hang INT := 65; -- ASCII 'A'
    v_Cot INT;
    v_LoaiGhe VARCHAR(50);
BEGIN
    WHILE v_Hang < (65 + p_SoHang) LOOP
        v_Cot := 1;
        -- Nếu là dòng cuối cùng của phòng Thường hoặc 3D, set thành Sweetbox
        IF v_Hang = (65 + p_SoHang - 1) AND p_Loai IN ('Thuong', '3D') THEN
            v_LoaiGhe := 'Sweetbox';
        ELSE
            v_LoaiGhe := p_Loai;
        END IF;

        WHILE v_Cot <= p_SoCot LOOP
            INSERT INTO GHE (ID_Phong, ViTriHang, ViTriCot, LoaiGhe) VALUES (p_Phong, CHR(v_Hang), v_Cot, v_LoaiGhe);
            v_Cot := v_Cot + 1;
        END LOOP;
        v_Hang := v_Hang + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Chạy tool để tạo ghế thật cho từng phòng
SELECT fn_TaoGhe(1, 10, 12, 'Thuong');
SELECT fn_TaoGhe(2, 9, 14, 'Thuong');
SELECT fn_TaoGhe(3, 8, 12, 'Thuong');
SELECT fn_TaoGhe(4, 10, 10, 'Thuong');
SELECT fn_TaoGhe(5, 12, 14, '3D');
SELECT fn_TaoGhe(6, 11, 16, '3D');
SELECT fn_TaoGhe(7, 14, 18, 'IMAX');
SELECT fn_TaoGhe(8, 15, 20, 'IMAX');

-- Hàm Trigger: Tự động khởi tạo trạng thái ghế ('Trong') khi tạo Suất Chiếu Mới
CREATE OR REPLACE FUNCTION trg_TaoTrangThaiGhe()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO TRANG_THAI_GHE (ID_SuatChieu, ID_Phong, ViTriHang, ViTriCot, TrangThai)
    SELECT NEW.ID_SuatChieu, NEW.ID_Phong, G.ViTriHang, G.ViTriCot, 'Trong'
    FROM GHE G
    WHERE G.ID_Phong = NEW.ID_Phong;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER AfterInsertSuatChieu
AFTER INSERT ON SUATCHIEU
FOR EACH ROW
EXECUTE FUNCTION trg_TaoTrangThaiGhe();

-- 4. NẠP KHÁCH HÀNG & ADMIN (Mô hình ISA - Kế thừa từ TAIKHOAN)
INSERT INTO TAIKHOAN (Email, MatKhau, VaiTro) VALUES 
('an@gmail.com', '123456', 'KhachHang'),
('binh@gmail.com', '123456', 'KhachHang'),
('admin@hcmut.edu.vn', 'admin123', 'QuanTriVien');

INSERT INTO KHACHHANG (ID_TaiKhoan, Email, HoTen, SoDienThoai, LoaiKhachHang, TongChiTieu) VALUES 
(1, 'an@gmail.com', 'Nguyen Van An', '0901234567', 'ThanhVien', 220000),
(2, 'binh@gmail.com', 'Tran Thi Binh', '0912345678', 'VIP', 5500000);

INSERT INTO QUANTRIVIEN (ID_TaiKhoan, HoTen, SoDienThoai, EmailNoiBo) VALUES 
(3, 'Quản Trị Viên Hệ Thống', '0999999999', 'admin@hcmut.edu.vn');

-- 5. TẠO LỊCH CHIẾU
INSERT INTO SUATCHIEU (ID_Phim, ID_Phong, ThoiGianBatDau, ThoiGianKetThuc, DinhDang, NgonNgu, GiaVeCoBan) VALUES
(1, 1, '2026-05-20 18:30:00', '2026-05-20 21:30:00', '2D', 'Phu De', 100000),
(2, 5, '2026-05-20 20:00:00', '2026-05-20 22:30:00', '3D', 'Long Tieng', 150000);
