// ============================================
// DATA: MOVIES
// ============================================
let MOVIES = [];

async function loadMovies() {
    try {
        const response = await fetch('http://54.255.100.246:3000/movies');
        const data = await response.json();
        // Map the DB format (id_phim, tenphim...) to the frontend format expected by existing functions
        MOVIES = data.map(m => ({
            id: m.id_phim,
            name: m.tenphim,
            duration: m.thoiluong,
            lang: m.ngonnguhotro,
            format: m.dinhdanghotro || '2D', // Use DinhDangHoTro for format
            dinhdanghotro: m.dinhdanghotro,
            poster: m.posterurl,
            banner: m.bannerurl,
            trailer: m.trailerurl,
            filehopdongurl: m.filehopdongurl,
            director: m.daodien || 'Đang cập nhật',
            times: m.showtimes || []
        }));
        if (document.getElementById('movieGrid')) renderMovieGrid();
        if (document.getElementById('adminMovieTable')) renderAdminMovieTable();
        if (document.querySelector('.hero-carousel')) renderHeroCarousel();

        // Update showtime movie select if it exists
        const movieSelect = document.getElementById('showtimeMovieSelect');
        if (movieSelect) {
            movieSelect.innerHTML = '';
            MOVIES.forEach((m, index) => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.name;
                movieSelect.appendChild(opt);
            });
            if (typeof updateShowtimeOptions === 'function') updateShowtimeOptions();
        }
    } catch (err) {
        console.error('Error fetching movies:', err);
    }
}
// Gọi loadMovies ngay khi khởi tạo
loadMovies();

// ============================================
// DATA: ROOM CONFIGURATIONS
// ============================================
// Phòng chiếu thiết kế theo tiêu chuẩn thực tế CGV/IMAX
// 4 phòng 2D (có Sweetbox), 2 phòng 3D (có Sweetbox), 2 phòng IMAX (không Sweetbox)
const ROOMS = {
    1: { name: 'Cinema 01 — 2D', rows: 10, cols: 12, type: '2D', vipRows: ['D', 'E', 'F'], sweetboxRow: 'J', aisleAfterCol: 6, price: { thuong: 90000, vip: 110000, sweetbox: 150000 } },
    2: { name: 'Cinema 02 — 2D', rows: 9, cols: 14, type: '2D', vipRows: ['D', 'E', 'F'], sweetboxRow: 'I', aisleAfterCol: 7, price: { thuong: 90000, vip: 110000, sweetbox: 150000 } },
    3: { name: 'Cinema 03 — 2D', rows: 8, cols: 12, type: '2D', vipRows: ['D', 'E'], sweetboxRow: 'H', aisleAfterCol: 6, price: { thuong: 90000, vip: 110000, sweetbox: 150000 } },
    4: { name: 'Cinema 04 — 2D', rows: 10, cols: 10, type: '2D', vipRows: ['D', 'E', 'F'], sweetboxRow: 'J', aisleAfterCol: 5, price: { thuong: 90000, vip: 110000, sweetbox: 150000 } },
    5: { name: 'Cinema 05 — 3D', rows: 12, cols: 14, type: '3D', vipRows: ['E', 'F', 'G'], sweetboxRow: 'L', aisleAfterCol: 7, price: { thuong: 120000, vip: 140000, sweetbox: 180000 } },
    6: { name: 'Cinema 06 — 3D', rows: 11, cols: 16, type: '3D', vipRows: ['E', 'F', 'G'], sweetboxRow: 'K', aisleAfterCol: 8, price: { thuong: 120000, vip: 140000, sweetbox: 180000 } },
    7: { name: 'IMAX 01 — Laser GT 1.43:1', rows: 14, cols: 18, type: 'IMAX', vipRows: ['F', 'G', 'H', 'I'], sweetboxRow: null, aisleAfterCol: 9, price: { thuong: 150000, vip: 180000 } },
    8: { name: 'IMAX 02 — 15/70mm Film', rows: 15, cols: 20, type: 'IMAX', vipRows: ['G', 'H', 'I', 'J'], sweetboxRow: null, aisleAfterCol: 10, price: { thuong: 180000, vip: 220000 } },
};

// Pre-generate some "booked" seats per room for realism
const BOOKED = {};
Object.keys(ROOMS).forEach(rid => {
    const r = ROOMS[rid];
    const booked = new Set();
    const count = Math.floor(Math.random() * (r.rows * r.cols * 0.3)) + 5;
    for (let i = 0; i < count; i++) {
        const row = String.fromCharCode(65 + Math.floor(Math.random() * r.rows));
        const col = Math.floor(Math.random() * r.cols) + 1;
        booked.add(row + col);
    }
    BOOKED[rid] = booked;
});

// ============================================
// RENDER: HOME MOVIE GRID
// ============================================
function renderMovieGrid() {
    const grid = document.getElementById('movieGrid');
    if (!grid) return;
    grid.innerHTML = MOVIES.map(m => {
        const formatBadge = m.format && m.format.includes('IMAX') ? 'bg-info text-dark' : (m.format && m.format.includes('3D')) ? 'bg-warning text-dark' : 'bg-secondary';
        // Lấy 3 suất chiếu gần nhất
        const upcomingTimes = m.times.slice(0, 3);
        const showtimeBtns = upcomingTimes.map(t => `<button class="showtime-btn" onclick="event.stopPropagation(); startBooking(${m.id}, ${t.id});">${t.time} - ${t.format}</button>`).join('');
        const moreTimesBtn = m.times.length > 3 ? `<button class="showtime-btn" style="opacity: 0.7; font-size: 11px;" onclick="event.stopPropagation(); openMovieDetail(${m.id});">+${m.times.length - 3}</button>` : '';
        return `
                <div class="col-lg-3 col-md-4 col-sm-6">
                    <div class="movie-card" onclick="openMovieDetail(${m.id})">
                        <span class="movie-badge badge ${formatBadge}">${m.format}</span>
                        <span class="movie-duration"><i class="fas fa-clock me-1"></i>${m.duration} phút</span>
                        <img src="${m.poster}" alt="${m.name}" onerror="this.src='https://via.placeholder.com/300x450/1a1a2e/ffffff?text=${encodeURIComponent(m.name)}'">
                        <div class="movie-overlay">
                            <h5 class="text-white fw-bold mb-2 text-center" style="font-size:16px;">${m.name}</h5>
                            <p class="text-light small mb-3 text-center">${m.lang}</p>
                            <button class="showtime-btn" style="background:var(--brand-color); color:white; border-color:var(--brand-color);" onclick="event.stopPropagation(); openMovieDetail(${m.id});">
                                <i class="fas fa-ticket-alt me-1"></i> MUA VÉ NGAY
                            </button>
                        </div>
                    </div>
                </div>`;
    }).join('');
}

// ============================================
// RENDER: ADMIN MOVIE TABLE
// ============================================
// ============================================
// NAVIGATION & ROUTING (Hash-based)
// ============================================
function showView(viewId) {
    if (window.location.hash !== `#${viewId}` && !window.location.hash.startsWith(`#${viewId}/`)) {
        window.location.hash = viewId;
        return; // Let hashchange event handle the DOM updates
    }

    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const targetEl = document.getElementById(viewId);
    if (targetEl) targetEl.classList.add('active');

    // Cập nhật Navbar
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if (viewId === 'home') {
        document.querySelector('.nav-links a:nth-child(1)').classList.add('active');
    } else if (viewId === 'cinemas') {
        document.querySelector('.nav-links a:nth-child(2)').classList.add('active');
    }

    // Start countdown when entering booking
    if (viewId === 'booking') {
        startCountdown();
        if (!document.getElementById('seatMapContainer').innerHTML) {
            changeRoom(1);
        }
    } else {
        if (typeof countdownInterval !== 'undefined' && countdownInterval) clearInterval(countdownInterval);
    }

    // Init charts when entering admin
    if (viewId === 'admin') {
        setTimeout(initDashboardCharts, 100);
    }
    // Load profile data when entering profile
    if (viewId === 'profile') {
        setTimeout(loadAndRenderProfile, 100);
    }
    window.scrollTo(0, 0);
}

window.addEventListener('hashchange', handleHashChange);

function handleHashChange() {
    const hash = window.location.hash.substring(1) || 'home';
    const parts = hash.split('/');
    const view = parts[0];

    if (view === 'booking' && parts.length === 3) {
        const movieId = parseInt(parts[1]);
        const showtimeId = parseInt(parts[2]);
        if (MOVIES.length === 0) {
            // Wait for data to load
            setTimeout(handleHashChange, 100);
            return;
        }
        executeBookingRouting(movieId, showtimeId);
    } else {
        showView(view);
    }
}

// Tab Admin
function switchAdminTab(tabId, btn) {
    document.querySelectorAll('.admin-nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = 'none');
    document.getElementById('tab-' + tabId).style.display = 'block';
    if (tabId === 'dashboard') setTimeout(initDashboardCharts, 100);
}

// ============================================
// MOVIE DETAIL POPUP
// ============================================
function openMovieDetail(id) {
    const m = MOVIES.find(x => x.id === id);
    if (!m) return;
    document.getElementById('detailPoster').src = m.poster;
    document.getElementById('detailTitle').textContent = m.name;
    document.getElementById('detailMeta').innerHTML = `
                <span class="badge bg-primary me-2">${m.format}</span>
                <span class="badge bg-light text-dark border me-2"><i class="fas fa-clock me-1"></i>${m.duration} phút</span>
                <span class="badge bg-light text-dark border me-2"><i class="fas fa-language me-1"></i>${m.lang}</span>
                <span class="badge bg-light text-dark border"><i class="fas fa-user-director me-1"></i>Đạo diễn: ${m.director}</span>
            `;
    // Xử lý link Youtube thông minh (hỗ trợ watch?v=, embed/, youtu.be/ hoặc ID trần)
    let embedUrl = m.trailer;
    if (embedUrl) {
        const match = embedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (match && match[1]) {
            embedUrl = `https://www.youtube.com/embed/${match[1]}`;
        } else if (embedUrl.length === 11) {
            embedUrl = `https://www.youtube.com/embed/${embedUrl}`;
        }
    }

    document.getElementById('detailTrailer').innerHTML = `
                <iframe width="100%" height="250" src="${embedUrl}" frameborder="0" allowfullscreen style="border-radius:10px;"></iframe>
            `;
    // Group showtimes by Date!
    const showtimesByDate = m.times.reduce((acc, t) => {
        if (!acc[t.date]) acc[t.date] = [];
        acc[t.date].push(t);
        return acc;
    }, {});

    let showtimesHTML = '';
    for (const [date, times] of Object.entries(showtimesByDate)) {
        showtimesHTML += `<div class="mb-3">
                    <h6 class="fw-bold text-muted mb-2"><i class="fas fa-calendar-alt me-1"></i> Ngày ${date}</h6>
                    <div class="d-flex flex-wrap gap-2">
                        ${times.map(t => `
                            <button class="btn btn-outline-primary fw-bold px-3 py-2 text-start" onclick="startBooking(${m.id}, ${t.id});">
                                <div><i class="fas fa-ticket-alt me-1"></i> ${t.time}</div>
                                <div style="font-size: 0.75rem; font-weight: normal; margin-top: 2px;">${t.format} - ${t.lang}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>`;
    }

    document.getElementById('detailShowtimes').innerHTML = m.times.length > 0
        ? showtimesHTML
        : `<div class="alert alert-warning text-center w-100 mb-0"><i class="fas fa-exclamation-triangle me-2"></i>Hiện chưa có lịch chiếu cho phim này. Quản trị viên vui lòng thêm suất chiếu!</div>`;
    new bootstrap.Modal(document.getElementById('movieDetailModal')).show();
}

function startBooking(movieId, showtimeId) {
    window.location.hash = `booking/${movieId}/${showtimeId}`;
}

function executeBookingRouting(movieId, showtimeId) {
    const m = MOVIES.find(x => x.id === movieId);
    if (!m) return showView('home');
    const st = m.times.find(x => x.id === showtimeId);
    if (!st) return showView('home');

    // Hide modal if open
    const modalEl = document.getElementById('movieDetailModal');
    if (modalEl && modalEl.classList.contains('show')) {
        const mInst = bootstrap.Modal.getInstance(modalEl);
        if (mInst) mInst.hide();
    }

    // Update UI
    document.getElementById('booking-movie-title').textContent = `${m.name} - ${st.time} ${st.date}`;
    document.getElementById('booking-bottom-movie-title').textContent = `${m.name} (${st.format})`;

    currentShowtimeId = showtimeId;

    // Re-render seats for this room
    let roomIdx = st.roomId || 1;
    changeRoom(roomIdx);

    showView('booking');
}

// ============================================
// SEAT MAP GENERATION
// ============================================
let selectedSeats = [];
let totalPrice = 0;

// ============================================
// AUTH: REGISTER & OTP
// ============================================
async function sendRegisterOTP() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!name || !email || !password) {
        alert('Vui lòng nhập đầy đủ Họ tên, Email và Mật khẩu!');
        return;
    }

    const btn = document.getElementById('btnSendOTP');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
    btn.disabled = true;

    try {
        const res = await fetch('http://54.255.100.246:3000/auth/register-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('reg-form').style.display = 'none';
            document.getElementById('otp-form').style.display = 'block';
            document.getElementById('otpMessage').textContent = `Vui lòng nhập mã OTP gồm 6 chữ số vừa được gửi đến email ${email}.`;
        } else {
            alert(data.message || 'Lỗi gửi OTP!');
        }
    } catch (err) {
        console.error(err);
        alert('Lỗi kết nối đến máy chủ!');
    }

    btn.innerHTML = 'TIẾP TỤC';
    btn.disabled = false;
}

async function verifyRegisterOTP() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const otp = document.getElementById('regOtp').value.trim();

    if (!otp || otp.length !== 6) {
        alert('Vui lòng nhập đúng 6 số OTP!');
        return;
    }

    const btn = document.getElementById('btnVerifyOTP');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Xử lý...';
    btn.disabled = true;

    try {
        const res = await fetch('http://54.255.100.246:3000/auth/register-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, otp })
        });
        const data = await res.json();
        if (data.success) {
            alert('Đăng ký thành công! Vui lòng đăng nhập lại.');
            // Reset form
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regOtp').value = '';
            document.getElementById('otp-form').style.display = 'none';
            document.getElementById('reg-form').style.display = 'block';
            showView('auth');
        } else {
            alert(data.message || 'OTP không hợp lệ!');
        }
    } catch (err) {
        console.error(err);
        alert('Lỗi kết nối đến máy chủ!');
    }

    btn.innerHTML = 'XÁC NHẬN';
    btn.disabled = false;
}

function changeRoom(roomId) {
    if (socket && currentShowtimeId) socket.emit('join_showtime', currentShowtimeId);
    const room = ROOMS[roomId];
    const titleEl = document.getElementById('booking-room-title');
    if (!titleEl) return;
    titleEl.textContent = `HCMUT Cinema | ${room.name}`;
    generateSeatMap(roomId);

    // Update screen width for IMAX
    const screen = document.querySelector('.cinema-screen');
    screen.style.width = room.type === 'IMAX' ? '92%' : '80%';
    screen.textContent = room.type === 'IMAX' ? 'IMAX SCREEN' : 'MÀN HÌNH CHÍNH';

    // Dynamic legend
    const legend = document.getElementById('seatLegend');
    let legendHtml = `
                <div class="legend-item"><div class="legend-box" style="background:var(--brand-color); border:none;"></div> Đang chọn</div>
                <div class="legend-item"><div class="legend-box" style="background:#e0e0e0; border:none;"></div> Đã đặt</div>
                <div class="legend-item"><div class="legend-box" style="background:#fff3e0; border:2px solid #ff9800;"></div> Đang giữ</div>
            `;
    if (room.type === 'IMAX') {
        legendHtml += `<div class="legend-item"><div class="legend-box" style="background:white; border:2px solid #e74c3c;"></div> IMAX</div>`;
    } else {
        legendHtml += `<div class="legend-item"><div class="legend-box" style="background:white; border:2px solid #4ea642;"></div> Thường</div>`;
    }
    legendHtml += `<div class="legend-item"><div class="legend-box" style="background:white; border:2px solid #d4af37;"></div> VIP</div>`;
    if (room.sweetboxRow) {
        legendHtml += `<div class="legend-item"><div class="legend-box" style="background:#fff0f8; border:2px solid #e91e8f; width:35px;"></div> Sweetbox ❤</div>`;
    }
    legend.innerHTML = legendHtml;
}

async function generateSeatMap(roomId) {
    const room = ROOMS[roomId];
    const container = document.getElementById('seatMapContainer');
    selectedSeats = [];
    selectedSeatPrices = {}; // Thêm biến lưu giá từng ghế
    totalPrice = 0;
    updateBookingFooter();

    let booked = new Set();
    let locked = new Set();

    try {
        const response = await fetch(`http://54.255.100.246:3000/showtime/${currentShowtimeId}/seats`);
        const data = await response.json();
        if (data.booked) data.booked.forEach(s => booked.add(s));
        if (data.locked) data.locked.forEach(s => locked.add(s));
    } catch (e) {
        console.error('Error fetching seat data:', e);
    }

    const isIMAX = room.type === 'IMAX';
    let html = '';

    for (let r = 0; r < room.rows; r++) {
        const rowLetter = String.fromCharCode(65 + r);
        const isSweetbox = room.sweetboxRow === rowLetter;
        const isVip = room.vipRows.includes(rowLetter);

        // IMAX stadium: rows get slightly larger spacing from front to back
        let rowStyle = '';
        if (isIMAX) {
            const scale = 0.92 + (r / room.rows) * 0.12;
            rowStyle = `style="gap:${5 + Math.floor(r * 0.5)}px;"`;
        }

        html += `<div class="seat-row" ${rowStyle}><span class="row-label">${rowLetter}</span>`;

        if (isSweetbox) {
            // Sweetbox: half the columns, each seat is double-wide (couple seat)
            const sbCols = Math.floor(room.cols / 2);
            for (let c = 1; c <= sbCols; c++) {
                const seatId = rowLetter + c;
                const isBooked2 = booked.has(seatId);
                const price = room.price.sweetbox;
                if (c === Math.ceil(sbCols / 2) + 1 && room.aisleAfterCol) html += '<div class="seat-gap"></div>';
                if (isBooked2) {
                    html += `<div class="seat Sweetbox DaDat">❤ ${seatId}</div>`;
                } else {
                    html += `<div class="seat Sweetbox" onclick="toggleSeat(this,'${seatId}',${price})"><span class="tooltip-text">Sweetbox (Ghế đôi)<br>${price.toLocaleString('vi-VN')}đ</span>❤ ${seatId}</div>`;
                }
            }
        } else {
            for (let c = 1; c <= room.cols; c++) {
                // Add aisle gap
                if (c === room.aisleAfterCol + 1) html += '<div class="seat-gap"></div>';

                const seatId = rowLetter + c;
                const isBooked2 = booked.has(seatId);
                const isLocked = locked.has(seatId);

                let seatClass, price, typeName;
                if (isVip) {
                    seatClass = 'VIP'; price = room.price.vip; typeName = 'Ghế VIP (Giữa rạp)';
                } else if (isIMAX) {
                    seatClass = 'IMAX'; price = room.price.thuong; typeName = 'Ghế IMAX';
                } else {
                    seatClass = 'Thuong'; price = room.price.thuong; typeName = 'Ghế Thường';
                }

                if (isBooked2) {
                    html += `<div id="seat_${seatId}" class="seat DaDat">${seatId}</div>`;
                } else if (isLocked) {
                    html += `<div id="seat_${seatId}" class="seat Locked"><span class="tooltip-text">⏳ Đang được giữ<br>bởi người khác</span>${seatId}</div>`;
                } else {
                    html += `<div id="seat_${seatId}" class="seat ${seatClass}" onclick="toggleSeat(this,'${seatId}',${price})"><span class="tooltip-text">${typeName}<br>${price.toLocaleString('vi-VN')}đ</span>${seatId}</div>`;
                }
            }
        }
        html += '</div>';
    }
    container.innerHTML = html;
}

const socket = typeof io !== 'undefined' ? io('http://54.255.100.246:3000') : null;

if (socket) {
    socket.on('seat_update', (data) => {
        if (data.showtimeId != currentShowtimeId) return;

        const el = document.getElementById('seat_' + data.seatId);
        if (!el) return;

        if (data.action === 'lock') {
            if (data.sessionKey === mySessionId) return; // Bỏ qua nếu chính mình là người khóa
            el.classList.add('DangGiu');
            el.classList.remove('selected');
        } else if (data.action === 'unlock') {
            if (data.sessionKey === mySessionId) return; // Bỏ qua nếu chính mình mở khóa
            el.classList.remove('DangGiu');
        } else if (data.action === 'booked') {
            el.classList.add('DaDat');
            el.classList.remove('DangGiu', 'selected');
        }
    });
}

const mySessionId = 'session_' + Math.random().toString(36).substr(2, 9);
let currentShowtimeId = 1; // updated by changeRoom

async function toggleSeat(el, seatId, price) {
    if (el.classList.contains('selected')) {
        // Unlock
        try {
            await fetch('http://54.255.100.246:3000/booking/unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ showtimeId: currentShowtimeId, seatId, sessionKey: mySessionId })
            });
            el.classList.remove('selected');
            selectedSeats = selectedSeats.filter(s => s !== seatId);
            totalPrice -= price;
        } catch (e) { console.error(e); }
    } else {
        // Lock
        if (el.classList.contains('DaDat') || el.classList.contains('Locked') || el.classList.contains('DangGiu')) {
            alert('Ghế này đã có người đặt hoặc đang giữ!');
            return;
        }
        try {
            const res = await fetch('http://54.255.100.246:3000/booking/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ showtimeId: currentShowtimeId, seatId, sessionKey: mySessionId })
            });
            const data = await res.json();
            if (data.success) {
                el.classList.add('selected');
                selectedSeats.push(seatId);
                totalPrice += price;
            } else {
                alert(data.message || 'Ghế đã bị chọn bởi người khác!');
            }
        } catch (e) { console.error(e); }
    }
    updateBookingFooter();
}

function updateBookingFooter() {
    document.getElementById('demo-botSeatInfo').textContent = selectedSeats.length > 0 ? selectedSeats.join(', ') : '--';
    document.getElementById('demo-botPrice').textContent = totalPrice > 0 ? totalPrice.toLocaleString('vi-VN') + ' đ' : '0 đ';
}

// ============================================
// COUNTDOWN TIMER (5 MINUTES) WITH PAUSE
// ============================================
let countdownInterval = null;
let countdownSeconds = 300;
let countdownPaused = false;

function startCountdown() {
    countdownSeconds = 300;
    countdownPaused = false;
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        if (countdownPaused) return;
        countdownSeconds--;
        if (countdownSeconds <= 0) {
            clearInterval(countdownInterval);
            document.getElementById('countdown-display').textContent = '00:00';

            // Tự động giải phóng ghế ngay lập tức để báo cho các tab khác
            for (const seatId of selectedSeats) {
                try {
                    fetch('http://54.255.100.246:3000/booking/unlock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ showtimeId: currentShowtimeId, seatId, sessionKey: mySessionId })
                    });
                } catch (e) { }
            }

            const modalEl = document.getElementById('timeoutModal');
            if (modalEl) {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            }
            return;
        }
        const m = Math.floor(countdownSeconds / 60);
        const s = countdownSeconds % 60;
        document.getElementById('countdown-display').textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);
}

function confirmCancelBooking() {
    if (confirm("Bạn có chắc chắn muốn hủy đặt vé và quay lại trang chủ không?")) {
        if (countdownInterval) clearInterval(countdownInterval);
        selectedSeats = [];
        totalPrice = 0;
        const seatContainer = document.getElementById('selectedSeatsDisplay');
        if (seatContainer) seatContainer.textContent = '--';
        const priceContainer = document.getElementById('totalPriceDisplay');
        if (priceContainer) priceContainer.textContent = '0 đ';
        showView('home');
    }
}

async function handleTimeoutReturn() {
    // Đóng modal
    const modalEl = document.getElementById('timeoutModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    // Xóa state
    if (countdownInterval) clearInterval(countdownInterval);

    // Gọi API giải phóng tất cả ghế đang chọn (nếu Backend có API hủy hàng loạt)
    // Hoặc lặp qua từng ghế để unlock
    for (const seatId of selectedSeats) {
        try {
            await fetch('http://54.255.100.246:3000/booking/unlock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ showtimeId: currentShowtimeId, seatId, sessionKey: mySessionId })
            });
        } catch (e) { }
    }

    selectedSeats = [];
    totalPrice = 0;
    const seatContainer = document.getElementById('selectedSeatsDisplay');
    if (seatContainer) seatContainer.textContent = '--';
    const priceContainer = document.getElementById('totalPriceDisplay');
    if (priceContainer) priceContainer.textContent = '0 đ';

    // Trở về trang chính
    showView('home');

    // Xóa backdrop nếu bị dính
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
}

function pauseCountdown() {
    countdownPaused = true;
    document.getElementById('countdown-display').textContent = '⏸ Tạm dừng';
}

function resumeCountdown() {
    countdownPaused = false;
}

// ============================================
// ADMIN: TIỆN ÍCH DEMO RESULTS
// ============================================
async function demoCheckDiem() {
    const id = document.getElementById('inputCheckDiem').value;
    const panel = document.getElementById('resultDiem');
    if (!id) {
        panel.innerHTML = `<div class="text-center text-danger fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>Vui lòng nhập ID Khách hàng</div>`;
        panel.style.display = 'block';
        return;
    }
    try {
        const res = await fetch('http://54.255.100.246:3000/api/diem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idKhach: id })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const d = data.data;
            panel.innerHTML = `
                        <div class="text-center mb-3"><span class="badge ${d.loai === 'VIP' ? 'bg-warning text-dark' : 'bg-primary'} px-3 py-2 fs-6">${d.loai}</span></div>
                        <div class="result-row"><span class="text-muted fw-bold">Họ Tên:</span><b>${d.ten}</b></div>
                        <div class="result-row"><span class="text-muted fw-bold">Loại KH:</span><b>${d.loai}</b></div>
                        <div class="result-row"><span class="text-muted fw-bold">Tổng Chi Tiêu:</span><b style="color:var(--brand-color);">${Number(d.chiTieu).toLocaleString('vi-VN')} VNĐ</b></div>
                        <div class="result-row"><span class="text-muted fw-bold">Điểm Tích Lũy:</span><b style="color:#e74c3c; font-size:18px;">${d.diem} điểm</b></div>
                    `;
        } else {
            panel.innerHTML = `<div class="text-center text-danger fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>${data.msg || 'Không tìm thấy khách hàng'} ID = ${id}</div>`;
        }
    } catch (e) {
        panel.innerHTML = `<div class="text-center text-danger fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>Lỗi kết nối server</div>`;
    }
    panel.style.display = 'block';
}

async function demoCheckGhe() {
    const suat = document.getElementById('inputSuat').value;
    const phong = document.getElementById('inputPhong').value;
    const hang = document.getElementById('inputHang').value.toUpperCase();
    const cot = document.getElementById('inputCot').value;
    const seatKey = hang + cot;
    const panel = document.getElementById('resultGhe');

    try {
        const res = await fetch('http://54.255.100.246:3000/api/ghe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idSuat: suat, idPhong: phong, hang: hang, cot: cot })
        });
        const data = await res.json();
        if (data.success) {
            const trangThai = data.trangThai;
            panel.innerHTML = `
                        <div class="text-center mb-3">
                            <span class="badge ${trangThai === 'Trong' ? 'bg-success' : 'bg-danger'} px-4 py-2 fs-6">
                                <i class="fas ${trangThai === 'Trong' ? 'fa-check-circle' : 'fa-times-circle'} me-2"></i>${trangThai === 'Trong' ? 'TRỐNG' : 'ĐÃ ĐẶT'}
                            </span>
                        </div>
                        <div class="result-row"><span class="text-muted fw-bold">Suất Chiếu:</span><b>#SC${suat}</b></div>
                        <div class="result-row"><span class="text-muted fw-bold">Phòng:</span><b>Phòng ${phong}</b></div>
                        <div class="result-row"><span class="text-muted fw-bold">Tọa độ Ghế:</span><b style="color:var(--brand-color); font-size:18px;">${seatKey}</b></div>
                        <div class="result-row"><span class="text-muted fw-bold">Trạng Thái:</span><b style="color:${trangThai === 'Trong' ? '#27ae60' : '#e74c3c'};">${trangThai}</b></div>
                    `;
        }
    } catch (e) {
        panel.innerHTML = `<div class="text-center text-danger fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>Lỗi kết nối server</div>`;
    }
    panel.style.display = 'block';
}

// ============================================
// ADMIN: DASHBOARD CHARTS
// ============================================
let revenueChart = null, occupancyChart = null, trendChart = null, customerChart = null;
async function initDashboardCharts() {
    if (revenueChart) return;

    let revLabels = ['Không có dữ liệu'], revData = [0];
    let trendLabels = ['Không có dữ liệu'], trendData = [0];
    let occLabels = ['Không có dữ liệu'], occData = [0];
    let custLabels = ['Không có dữ liệu'], custData = [0];
    let heatmapData = [];

    try {
        const res = await fetch('http://54.255.100.246:3000/admin/dashboard');
        const data = await res.json();

        // Update stats cards
        if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').textContent = data.metrics.revenue + ' ₫';
        if (document.getElementById('stat-tickets')) document.getElementById('stat-tickets').textContent = data.metrics.tickets;
        if (document.getElementById('stat-movies')) document.getElementById('stat-movies').textContent = data.metrics.movies;
        if (document.getElementById('stat-occupancy')) document.getElementById('stat-occupancy').textContent = data.metrics.occupancy;

        // Chuẩn bị dữ liệu cho biểu đồ
        if (data.charts && data.charts.revenueByMovie && data.charts.revenueByMovie.length > 0) {
            revLabels = data.charts.revenueByMovie.map(x => x.tenphim.substring(0, 15) + '...');
            revData = data.charts.revenueByMovie.map(x => x.revenue / 1000000);
        }

        if (data.charts && data.charts.trend && data.charts.trend.length > 0) {
            trendLabels = data.charts.trend.map(x => new Date(x.date).toLocaleDateString('vi-VN'));
            trendData = data.charts.trend.map(x => x.revenue / 1000000);
        }

        if (data.charts && data.charts.occupancyByRoom && data.charts.occupancyByRoom.length > 0) {
            occLabels = data.charts.occupancyByRoom.map(x => x.dinhdang);
            occData = data.charts.occupancyByRoom.map(x => x.booked_seats);
        }

        if (data.charts && data.charts.customerTypes && data.charts.customerTypes.length > 0) {
            custLabels = data.charts.customerTypes.map(x => x.loaikhachhang || 'Khác');
            custData = data.charts.customerTypes.map(x => x.count);
        }

        if (data.charts && data.charts.heatmap) {
            heatmapData = data.charts.heatmap;
        }
    } catch (e) {
        console.error("Dashboard error", e);
    }

    // 1. Bar: Revenue by Movie
    const rCtx = document.getElementById('revenueChart');
    if (rCtx) {
        revenueChart = new Chart(rCtx, {
            type: 'bar',
            data: {
                labels: revLabels,
                datasets: [{ label: 'Triệu VNĐ', data: revData, backgroundColor: ['#034ea2', '#e74c3c', '#e67e22', '#2980b9', '#3498db', '#1abc9c', '#9b59b6'], borderRadius: 6, borderSkipped: false }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } } }
        });
    }

    // 2. Doughnut: Occupancy by room type
    const oCtx = document.getElementById('occupancyChart');
    if (oCtx) {
        occupancyChart = new Chart(oCtx, {
            type: 'doughnut',
            data: { labels: occLabels, datasets: [{ data: occData, backgroundColor: ['#3498db', '#f39c12', '#e74c3c', '#8e44ad'], borderWidth: 3, borderColor: '#fff' }] },
            options: { responsive: true, cutout: '55%', plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 12, weight: 'bold' } } }, tooltip: { callbacks: { label: (c) => c.label + ': ' + c.raw + ' ghế' } } } }
        });
    }

    // 3. Line: 7-day Revenue Trend
    const tCtx = document.getElementById('trendChart');
    if (tCtx) {
        trendChart = new Chart(tCtx, {
            type: 'line',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'Doanh thu (Triệu VNĐ)',
                    data: trendData,
                    borderColor: '#034ea2', backgroundColor: 'rgba(3,78,162,0.1)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#034ea2'
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } } }
        });
    }

    // 4. Pie: Customer segments
    const cCtx = document.getElementById('customerChart');
    if (cCtx) {
        customerChart = new Chart(cCtx, {
            type: 'pie',
            data: { labels: custLabels, datasets: [{ data: custData, backgroundColor: ['#3498db', '#f1c40f', '#95a5a6'], borderWidth: 2, borderColor: '#fff' }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 12, weight: 'bold' } } } } }
        });
    }

    // 5. Heatmap: Popular seats
    renderSeatHeatmap(heatmapData);
}

function renderSeatHeatmap(heatmapData = []) {
    const container = document.getElementById('seatHeatmap');
    if (!container) return;
    const rows = 8, cols = 10;
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    let html = '';

    // Tìm max frequency để chia tỷ lệ màu
    let maxFreq = 1;
    heatmapData.forEach(item => {
        if (Number(item.frequency) > maxFreq) maxFreq = Number(item.frequency);
    });

    for (let r = 0; r < rows; r++) {
        const letter = String.fromCharCode(65 + r);
        for (let c = 0; c < cols; c++) {
            const colNum = c + 1;
            const seatData = heatmapData.find(x => x.vitrihang === letter && Number(x.vitricot) === colNum);
            const freq = seatData ? Number(seatData.frequency) : 0;

            const heat = freq > 0 ? Math.max(20, Math.min(100, (freq / maxFreq) * 100)) : 0;

            let hue = 200; // default blue (0 bookings)
            let sat = '0%';
            let light = '95%'; // almost white

            if (heat > 0) {
                hue = heat > 70 ? 0 : heat > 40 ? 30 : 200; // red/orange/blue
                sat = heat > 40 ? '80%' : '40%';
                light = `${90 - heat * 0.5}%`;
            }

            html += `<div class="heatmap-cell" style="background:hsl(${hue},${sat},${light}); border:1px solid #eee;" title="${letter}${colNum}: ${freq} lượt đặt">${letter}${colNum}</div>`;
        }
    }
    container.innerHTML = html;
}


// Auto Carousel Logic
let currentSlide = 0;
setInterval(() => {
    const slides = document.querySelectorAll('.hero-carousel .slide');
    if (slides.length > 1) {
        slides.forEach(s => s.classList.remove('active'));
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }
}, 5000);

function showPaymentModal() {
    // Hide all steps, show login step
    const allSteps = ['payment-step-login', 'payment-step-register', 'payment-step-reg-otp', 'payment-step-new-id', 'payment-step-otp', 'payment-step-2'];
    allSteps.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    document.getElementById('payment-step-login').style.display = 'block';
    // Reset inputs
    document.querySelectorAll('#otpInputs input, #regOtpInputs input').forEach(i => i.value = '');
    if (document.getElementById('login-id')) document.getElementById('login-id').value = '';
    if (document.getElementById('login-pass')) document.getElementById('login-pass').value = '';
    // Update total display
    if (totalPrice > 0) document.getElementById('paymentTotalDisplay').textContent = totalPrice.toLocaleString('vi-VN') + 'đ';
    // Pause countdown while in payment
    pauseCountdown();
    
    // Autofill email if logged in
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
        const user = JSON.parse(userStr);
        document.getElementById('login-id').value = user.email;
    }

    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
    // Resume countdown if modal is closed without completing
    document.getElementById('paymentModal').addEventListener('hidden.bs.modal', function handler() {
        const eticket = document.getElementById('payment-step-2');
        if (!eticket || eticket.style.display === 'none') {
            resumeCountdown();
        }
        document.getElementById('paymentModal').removeEventListener('hidden.bs.modal', handler);
    });
}

// --- HÀM CHO DEMO CONTROLS ---
function demoShowPayment() {
    showView('booking');
    showPaymentModal();
}
function demoShowQR() {
    showView('booking');
    const allSteps = ['payment-step-login', 'payment-step-register', 'payment-step-reg-otp', 'payment-step-new-id', 'payment-step-otp', 'payment-step-2'];
    allSteps.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    document.getElementById('payment-step-2').style.display = 'block';
    new bootstrap.Modal(document.getElementById('paymentModal')).show();
}
function demoShowDashboard() {
    showView('admin');
    switchAdminTab('dashboard', document.querySelector('.admin-nav button:first-child'));
}
function demoShowAddShowtime() {
    showView('admin');
    switchAdminTab('lichchieu', document.querySelectorAll('.admin-nav button')[1]);
    new bootstrap.Modal(document.getElementById('addShowtimeModal')).show();
}

// Shortcut: Mở popup chi tiết phim
function demoShowMovieDetail() {
    showView('home');
    setTimeout(() => openMovieDetail(1), 300);
}

// Shortcut: Chuyển phòng chiếu
function demoSwitchRoom(roomId) {
    showView('booking');
    document.getElementById('roomSelect').value = roomId;
    changeRoom(roomId);
}

// Shortcut: Mở tab Admin
function demoShowTab(tabId, btnIndex) {
    showView('admin');
    switchAdminTab(tabId, document.querySelectorAll('.admin-nav button')[btnIndex]);
}

// Shortcut: Tra cứu điểm + kết quả
function demoCheckDiemShortcut() {
    showView('admin');
    switchAdminTab('tienich', document.querySelectorAll('.admin-nav button')[3]);
    setTimeout(() => demoCheckDiem(), 200);
}

// Shortcut: Kiểm tra ghế + kết quả
function demoCheckGheShortcut() {
    showView('admin');
    switchAdminTab('tienich', document.querySelectorAll('.admin-nav button')[3]);
    setTimeout(() => demoCheckGhe(), 200);
}

// ============================================
// PAYMENT FLOW: Login / Register / OTP
// ============================================
function hideAllPaymentSteps() {
    ['payment-step-login', 'payment-step-register', 'payment-step-reg-otp', 'payment-step-new-id', 'payment-step-otp', 'payment-step-2'].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
}

async function handleLogin() {
    const id = document.getElementById('login-id').value.trim();
    const pass = document.getElementById('login-pass').value;
    if (!pass) { alert('Vui lòng nhập Mật khẩu!'); return; }

    try {
        const res = await fetch('http://54.255.100.246:3000/payment/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, pass })
        });
        const data = await res.json();
        if (data.success) {
            hideAllPaymentSteps();
            document.getElementById('payment-step-otp').style.display = 'block';
            if (totalPrice > 0) document.getElementById('paymentTotalDisplay').textContent = totalPrice.toLocaleString('vi-VN') + 'đ';
            document.getElementById('otp-email-hint').innerHTML = 'Mã OTP 6 số đã gửi đến <b>' + data.email.replace(/(.{3}).*(@.*)/, '$1***$2') + '</b>';
            setTimeout(() => { const inp = document.querySelectorAll('#otpInputs input'); if (inp[0]) inp[0].focus(); }, 200);
        } else {
            alert(data.message || 'Lỗi đăng nhập');
        }
    } catch (e) { console.error(e); alert('Lỗi kết nối máy chủ'); }
}

function showRegisterInModal() {
    hideAllPaymentSteps();
    document.getElementById('payment-step-register').style.display = 'block';
}

function showLoginInModal() {
    if (typeof isGlobalRegistering !== 'undefined' && isGlobalRegistering) {
        bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
        new bootstrap.Modal(document.getElementById('globalLoginModal')).show();
        isGlobalRegistering = false;
        return;
    }
    hideAllPaymentSteps();
    document.getElementById('payment-step-login').style.display = 'block';
}

async function handleModalRegister() {
    const name = document.getElementById('reg-modal-name').value.trim();
    const email = document.getElementById('reg-modal-email').value.trim();
    const phone = document.getElementById('reg-modal-phone').value.trim();
    const pass = document.getElementById('reg-modal-pass').value;
    if (!name || !email || !phone || !pass) { alert('Vui lòng điền đầy đủ thông tin!'); return; }

    try {
        const res = await fetch('http://54.255.100.246:3000/auth/register-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
            hideAllPaymentSteps();
            document.getElementById('payment-step-reg-otp').style.display = 'block';
            document.getElementById('reg-otp-email-hint').innerHTML = 'Mã OTP 6 số đã gửi đến <b>' + email.replace(/(.{3}).*(@.*)/, '$1***$2') + '</b>';
            document.querySelectorAll('#regOtpInputs input').forEach(i => i.value = '');
            setTimeout(() => { const inp = document.querySelectorAll('#regOtpInputs input'); if (inp[0]) inp[0].focus(); }, 200);
        } else {
            alert(data.message || 'Lỗi gửi OTP');
        }
    } catch (e) { console.error('Lỗi gửi OTP', e); alert('Lỗi kết nối máy chủ'); }
}

async function verifyRegOTP() {
    const inputs = document.querySelectorAll('#regOtpInputs input');
    const code = Array.from(inputs).map(i => i.value).join('');

    const name = document.getElementById('reg-modal-name').value.trim();
    const email = document.getElementById('reg-modal-email').value.trim();
    const pass = document.getElementById('reg-modal-pass').value;

    try {
        const res = await fetch('http://54.255.100.246:3000/auth/register-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp: code, name, password: pass })
        });
        const data = await res.json();
        if (data.success) {
            if (typeof isGlobalRegistering !== 'undefined' && isGlobalRegistering) {
                sessionStorage.setItem('currentUser', JSON.stringify({ email: email, pass: pass, name: data.user?.name || name }));
                updateHeaderUserStatus();
                bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
                alert('Đăng ký và Đăng nhập thành công!');
                isGlobalRegistering = false;
            } else {
                hideAllPaymentSteps();
                document.getElementById('payment-step-new-id').style.display = 'block';
                document.getElementById('newCustomerIdDisplay').innerHTML = 'Tạo thành công!<br><small style="font-size:14px; font-weight:normal">Vui lòng dùng <b>Email</b> vừa tạo để đăng nhập</small>';
            }
        } else {
            alert(data.message || 'Mã OTP sai!');
        }
    } catch (e) { console.error(e); alert('Lỗi kết nối máy chủ'); }
}

function proceedAfterRegister() {
    hideAllPaymentSteps();
    document.getElementById('payment-step-otp').style.display = 'block';
    if (totalPrice > 0) document.getElementById('paymentTotalDisplay').textContent = totalPrice.toLocaleString('vi-VN') + 'đ';
    setTimeout(() => { const inp = document.querySelectorAll('#otpInputs input'); if (inp[0]) inp[0].focus(); }, 200);
}

function otpAutoNext(el) {
    if (el.value.length >= 1 && el.nextElementSibling) {
        el.nextElementSibling.focus();
    }
}

async function verifyOTP() {
    const inputs = document.querySelectorAll('#otpInputs input');
    const code = Array.from(inputs).map(i => i.value).join('');

    const pass = document.getElementById('login-pass')?.value || document.getElementById('reg-modal-pass')?.value || document.getElementById('regPassword')?.value || '123456';
    if (selectedSeats.length === 0) {
        alert('Chưa chọn ghế nào!');
        return;
    }

    try {
        let allSuccess = true;
        let lastQr = null;
        for (const seat of selectedSeats) {
            const id = document.getElementById('login-id').value;
            const res = await fetch('http://54.255.100.246:3000/booking/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_suatchieu: currentShowtimeId, ghe: seat, email: id, matkhau: pass, otp: code })
            });
            const data = await res.json();
            if (data.success) {
                lastQr = data.qrCode;
            } else {
                allSuccess = false;
                alert(data.message || `Lỗi khi đặt ghế ${seat}`);
                break;
            }
        }

        if (allSuccess && lastQr) {
            document.getElementById('payment-step-otp').style.display = 'none';
            document.getElementById('payment-step-2').style.display = 'block';
            const qrImg = document.querySelector('#payment-step-2 img');
            if (qrImg) qrImg.src = lastQr;
        }
    } catch (e) { console.error('Lỗi thanh toán', e); alert('Lỗi kết nối máy chủ!'); }
}

// ============================================
// SHOWTIME CONFLICT DETECTION
// ============================================
const EXISTING_SHOWTIMES = [
    { id: 'SC01', movieId: 1, movieName: 'Avengers: Endgame', roomId: 7, date: '2026-07-13', startTime: '18:30', duration: 181 },
    { id: 'SC02', movieId: 2, movieName: 'Spider-Man: No Way Home', roomId: 5, date: '2026-07-13', startTime: '20:00', duration: 148 },
    { id: 'SC03', movieId: 3, movieName: 'Oppenheimer', roomId: 1, date: '2026-07-14', startTime: '19:00', duration: 180 },
    { id: 'SC04', movieId: 5, movieName: 'Interstellar', roomId: 8, date: '2026-07-14', startTime: '20:30', duration: 169 },
    { id: 'SC05', movieId: 8, movieName: 'Demon Slayer', roomId: 7, date: '2026-07-14', startTime: '17:30', duration: 120 },
    { id: 'SC06', movieId: 3, movieName: 'Oppenheimer', roomId: 8, date: '2026-07-13', startTime: '15:00', duration: 180 },
];

function updateShowtimeOptions() {
    const movieSelect = document.getElementById('showtimeMovieSelect');
    const langSelect = document.getElementById('showtimeLangSelect');
    const formatSelect = document.getElementById('showtimeFormatSelect');
    if (!movieSelect || !langSelect || !formatSelect) return;

    const selectedMovieId = parseInt(movieSelect.value);
    const m = MOVIES.find(x => x.id === selectedMovieId);
    if (!m) return;

    // Populate languages
    langSelect.innerHTML = '';
    const movieLangs = m.lang ? m.lang.split(',').map(s => s.trim()) : ['Phụ Đề'];
    movieLangs.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang;
        opt.textContent = lang;
        langSelect.appendChild(opt);
    });

    // Populate formats
    formatSelect.innerHTML = '';
    const movieFormats = m.dinhdanghotro ? m.dinhdanghotro.split(',').map(s => s.trim()) : ['2D'];
    movieFormats.forEach(fmt => {
        const opt = document.createElement('option');
        opt.value = fmt;
        opt.textContent = fmt;
        formatSelect.appendChild(opt);
    });

    // Trigger conflict check after populating formats
    if (typeof checkShowtimeConflict === 'function') checkShowtimeConflict();
}

async function checkShowtimeConflict() {
    const datetimeInput = document.getElementById('showtimeDatetime');
    const movieSelect = document.getElementById('showtimeMovieSelect');
    const roomSelect = document.getElementById('showtimeRoomSelect');
    const formatSelect = document.getElementById('showtimeFormatSelect');
    const conflictDiv = document.getElementById('roomConflictInfo');

    if (!movieSelect || !roomSelect) return;

    const selectedFormat = formatSelect ? formatSelect.value : '2D';

    // Filter rooms by format first
    Array.from(roomSelect.options).forEach(opt => {
        const roomId = parseInt(opt.value);
        const isMatch = (ROOMS[roomId].type === selectedFormat);
        opt.style.display = isMatch ? '' : 'none';
        opt.hidden = !isMatch;
        if (!isMatch && opt.selected) {
            const firstVisible = Array.from(roomSelect.options).find(o => ROOMS[parseInt(o.value)].type === selectedFormat);
            if (firstVisible) firstVisible.selected = true;
        }
    });

    if (!datetimeInput || !datetimeInput.value || !MOVIES || MOVIES.length === 0) {
        if (conflictDiv) conflictDiv.style.display = 'none';
        // Enable all options and reset text
        Array.from(roomSelect.options).forEach(opt => {
            opt.disabled = false;
            const roomId = parseInt(opt.value);
            opt.textContent = `${ROOMS[roomId].name}`;
        });
        return;
    }

    const selectedMovie = MOVIES.find(m => m.id === parseInt(movieSelect.value));
    if (!selectedMovie) return;
    const duration = selectedMovie.duration || 120;

    const langSelect = document.getElementById('showtimeLangSelect');
    if (langSelect && selectedMovie.lang) {
        const currentLang = langSelect.value;
        const langs = selectedMovie.lang.split(',').map(l => l.trim());
        langSelect.innerHTML = langs.map(l => `<option value="${l}">${l}</option>`).join('');
        if (langs.includes(currentLang)) {
            langSelect.value = currentLang;
        }
    }

    let conflictMessages = [];

    const checkPromises = Array.from(roomSelect.options).map(async opt => {
        if (opt.hidden) return; // Skip hidden rooms
        const roomId = parseInt(opt.value);
        const roomName = ROOMS[roomId].name;

        // Reset text
        opt.disabled = false;
        opt.textContent = `${roomName}`;

        try {
            const d = new Date(datetimeInput.value);
            const localTimeStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':00';
            const res = await fetch('http://54.255.100.246:3000/admin/check-conflict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, datetime: localTimeStr, duration })
            });
            const data = await res.json();
            if (data.conflict) {
                const c = data.details;
                const sStart = new Date(c.thoigianbatdau);
                const sEnd = new Date(sStart.getTime() + (c.thoiluong + 15) * 60000);
                const endStr = sEnd.getHours().toString().padStart(2, '0') + ':' + sEnd.getMinutes().toString().padStart(2, '0');
                const startStr = sStart.getHours().toString().padStart(2, '0') + ':' + sStart.getMinutes().toString().padStart(2, '0');

                opt.disabled = true;
                opt.textContent = `[ Bị chiếm đến ${endStr} ] ${roomName} (Đã có suất #${c.id_suatchieu}: ${c.tenphim})`;
                conflictMessages.push(`<i class="fas fa-exclamation-triangle text-warning me-1"></i> <b>${roomName}</b>: đang chiếu <b>${c.tenphim}</b> (${startStr}–${endStr})`);
            }
        } catch (e) { console.error(e); }
    });

    await Promise.all(checkPromises);

    if (conflictMessages.length > 0) {
        conflictDiv.style.display = 'block';
        conflictDiv.innerHTML = `<div class="alert alert-warning py-2 px-3 mb-0" style="font-size:12px;"><b><i class="fas fa-info-circle me-1"></i> Xung đột lịch chiếu:</b><br>${conflictMessages.join('<br>')}</div>`;
    } else {
        conflictDiv.style.display = 'none';
    }
}

// ============================================
// SEAT LOCK REAL-TIME DEMO
// ============================================
function demoShowSeatLock() {
    showView('booking');
    changeRoom(1);
    // After seat map renders, simulate another user locking seats
    setTimeout(() => {
        const allSeats = document.querySelectorAll('#seatMapContainer .seat:not(.DaDat):not(.Locked):not(.Sweetbox)');
        const availableSeats = Array.from(allSeats).filter(s => !s.classList.contains('selected'));
        // Pick 3 random seats to "lock" with animation
        let count = 0;
        const interval = setInterval(() => {
            if (count >= 3 || availableSeats.length === 0) { clearInterval(interval); return; }
            const idx = Math.floor(Math.random() * availableSeats.length);
            const seat = availableSeats.splice(idx, 1)[0];
            seat.className = 'seat Locked';
            seat.onclick = null;
            seat.innerHTML = `<span class="tooltip-text">⏳ User khác<br>đang giữ chỗ</span>` + seat.textContent;
            count++;
        }, 800);

        // Show notification
        const notif = document.createElement('div');
        notif.innerHTML = `<div class="alert alert-warning d-flex align-items-center" style="max-width:600px; margin:15px auto; animation: fadeIn 0.5s;"><i class="fas fa-broadcast-tower fa-lg me-3 text-danger"></i><div><b>REAL-TIME DEMO:</b> Một người dùng khác đang chọn ghế... Ghế sẽ đổi <span style="color:#ff9800; font-weight:bold;">MÀU CAM</span> khi bị khóa.</div></div>`;
        const container = document.querySelector('#booking .progress-container');
        container.parentNode.insertBefore(notif, container.nextSibling);
        // Remove notification after 8s
        setTimeout(() => notif.remove(), 8000);
    }, 500);
}

// ============================================
// ADMIN FORM HANDLERS (AUTO-FILL FROM DOCX)
// ============================================
async function handleDocxUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
        alert("⚠️ Vui lòng chọn file hợp đồng định dạng .docx");
        return;
    }

    const btn = document.querySelector('button[onclick="submitAddMovie(event)"]');
    const oldText = btn ? btn.innerHTML : 'LƯU PHIM MỚI';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang trích xuất AI...';
        btn.disabled = true;
    }

    try {
        const reader = new FileReader();
        reader.onload = function (event) {
            const arrayBuffer = event.target.result;
            if (typeof mammoth === 'undefined') {
                alert("❌ Thư viện đọc file chưa tải xong. Vui lòng bấm F5 thử lại!");
                if (btn) { btn.innerHTML = oldText; btn.disabled = false; }
                return;
            }
            mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                .then(function (result) {
                    const text = result.value;

                    const titleMatch = text.match(/Tên phim:\s*(.+)/i);
                    const durationMatch = text.match(/Thời lượng \(Phút\):\s*(\d+)/i);
                    const langMatch = text.match(/Ngôn ngữ:\s*(.+)/i);
                    const formatMatch = text.match(/Định dạng:\s*(.+)/i);
                    const posterMatch = text.match(/Poster URL:\s*(http.+)/i);
                    const bannerMatch = text.match(/Banner URL:\s*(http.+)/i);
                    const trailerMatch = text.match(/Trailer URL:\s*(http.+)/i);

                    if (titleMatch && document.getElementById('addMovieTitle')) document.getElementById('addMovieTitle').value = titleMatch[1].trim();
                    if (durationMatch && document.getElementById('addMovieDuration')) document.getElementById('addMovieDuration').value = durationMatch[1].trim();
                    if (langMatch && document.getElementById('addMovieLanguage')) document.getElementById('addMovieLanguage').value = langMatch[1].trim();
                    if (formatMatch && document.getElementById('addMovieFormat')) document.getElementById('addMovieFormat').value = formatMatch[1].trim();
                    if (posterMatch && document.getElementById('addMoviePoster')) document.getElementById('addMoviePoster').value = posterMatch[1].trim();
                    if (bannerMatch && document.getElementById('addMovieBanner')) document.getElementById('addMovieBanner').value = bannerMatch[1].trim();
                    if (trailerMatch && document.getElementById('addMovieTrailer')) document.getElementById('addMovieTrailer').value = trailerMatch[1].trim();

                    alert("🎉 AI đã trích xuất thành công thông tin phim từ Hợp đồng!");
                    if (btn) { btn.innerHTML = oldText; btn.disabled = false; }
                })
                .catch(function (err) {
                    console.error(err);
                    alert("❌ Lỗi khi phân tích file Word.");
                    if (btn) { btn.innerHTML = oldText; btn.disabled = false; }
                });
        };
        reader.readAsArrayBuffer(file);
    } catch (err) {
        console.error(err);
        if (btn) { btn.innerHTML = oldText; btn.disabled = false; }
    }
}

async function submitAddMovie(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]') || document.querySelector('button[onclick="submitAddMovie(event)"]');
    const oldText = btn ? btn.innerHTML : 'LƯU PHIM MỚI';
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang tải...'; btn.disabled = true; }

    const payload = {
        TenPhim: document.getElementById('addMovieTitle').value,
        ThoiLuong: document.getElementById('addMovieDuration').value || 0,
        DaoDien: "Đang cập nhật",
        NgonNguHoTro: document.getElementById('addMovieLanguage').value || "Phụ Đề",
        DinhDangHoTro: document.getElementById('addMovieFormat') ? document.getElementById('addMovieFormat').value : '2D',
        PosterURL: document.getElementById('addMoviePoster').value,
        BannerURL: document.getElementById('addMovieBanner').value,
        TrailerURL: document.getElementById('addMovieTrailer').value,
        FileHopDongURL: document.getElementById('addMovieFile').value
    };

    try {
        const res = await fetch('http://54.255.100.246:3000/admin/phim/them', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alert('Thêm phim thành công!');
            event.target.reset();
            await loadMovies();
        } else {
            alert('Lỗi: ' + data.message);
        }
    } catch (e) {
        console.error(e);
        alert('Lỗi kết nối server!');
    } finally {
        if (btn) { btn.innerHTML = oldText; btn.disabled = false; }
    }
}

async function submitAddShowtime(event) {
    event.preventDefault();
    const movieId = document.getElementById('showtimeMovieSelect').value;
    const roomSelect = document.getElementById('showtimeRoomSelect');
    const roomId = roomSelect.value;
    const datetimeInput = document.getElementById('showtimeDatetime').value;
    const format = document.getElementById('showtimeFormatSelect').value;
    const lang = document.getElementById('showtimeLangSelect') ? document.getElementById('showtimeLangSelect').value : 'Phụ Đề';

    if (!datetimeInput) return alert('Vui lòng chọn ngày giờ chiếu!');

    const selectedOpt = roomSelect.options[roomSelect.selectedIndex];
    if (selectedOpt && selectedOpt.disabled) {
        // Sẽ không return ở đây nữa mà để logic check-conflict backend xử lý popup
    }

    // Sửa lỗi timezone: Lấy giờ local chuẩn
    const d = new Date(datetimeInput);
    const localTimeStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':00';

    // Tìm thời lượng phim để kiểm tra conflict
    const selectedMovie = MOVIES.find(m => m.id === parseInt(movieId));
    const duration = selectedMovie ? selectedMovie.duration : 120;

    try {
        // Kiểm tra conflict từ backend trước khi lưu
        const checkRes = await fetch('http://54.255.100.246:3000/admin/check-conflict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: roomId, datetime: localTimeStr, duration: duration })
        });
        const checkData = await checkRes.json();

        if (checkData.conflict) {
            const c = checkData.details;
            const sStart = new Date(c.thoigianbatdau);
            const sEnd = new Date(sStart.getTime() + (c.thoiluong + 15) * 60000);
            const endStr = sEnd.getHours().toString().padStart(2, '0') + ':' + sEnd.getMinutes().toString().padStart(2, '0');
            const startStr = sStart.getHours().toString().padStart(2, '0') + ':' + sStart.getMinutes().toString().padStart(2, '0');

            alert(`❌ PHÒNG CHIẾU ĐANG BỊ VƯỚNG LỊCH!\n\nPhòng chiếu này hiện đã có suất chiếu: [Mã SC: #${c.id_suatchieu}] - Phim: ${c.tenphim}\nThời gian: Từ ${startStr} đến ${endStr} (Đã cộng 15 phút dọn rạp).\n\nVui lòng dời thời gian chiếu hoặc chọn phòng khác!`);
            return;
        }

        // Nếu không vướng lịch, tiến hành lưu
        const res = await fetch('http://54.255.100.246:3000/admin/luu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ID_Phim: movieId,
                ID_Phong: roomId,
                ThoiGianBatDau: localTimeStr,
                DinhDang: format,
                NgonNgu: lang
            })
        });
        const data = await res.json();
        if (data.success) {
            alert('Thêm suất chiếu thành công!');
            const modalEl = document.getElementById('addShowtimeModal');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }
            event.target.reset();
            loadShowtimes(); // Thêm dòng này để tải lại bảng
        } else {
            alert('Lỗi: ' + data.message);
        }
    } catch (e) {
        console.error(e);
        alert('Lỗi kết nối server!');
    }
}

// ============================================
// ADMIN: QUẢN LÝ PHIM (RENDER, EDIT, DELETE)
// ============================================
function renderAdminMovieTable() {
    const tbody = document.getElementById('adminMovieTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    MOVIES.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                    <td class="ps-3"><img src="${m.poster}" alt="Poster" style="width: 50px; height: 75px; object-fit: cover; border-radius: 4px;"></td>
                    <td class="fw-bold" style="color: var(--brand-color);">${m.name}</td>
                    <td>${m.duration} phút</td>
                    <td>${m.lang || 'Phụ Đề'}</td>
                    <td>${m.dinhdanghotro || '2D'}</td>
                    <td>
                        <span class="badge bg-success">Đã Duyệt</span><br>
                        ${(() => {
                let f = m.filehopdongurl || '';
                if (!f) return '<small class="text-muted fst-italic">Chưa có file</small>';
                let fname = f.split('/').pop().split('\\\\').pop();
                let isDocx = fname.toLowerCase().endsWith('.docx') || fname.toLowerCase().endsWith('.doc');
                return '<small class="text-muted"><i class="fas ' + (isDocx ? 'fa-file-word text-primary' : 'fa-file-pdf text-danger') + '"></i> ' + fname + '</small>';
            })()}
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-warning border-0" onclick="openEditMovieModal(${m.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger border-0 ms-1" onclick="deleteMovie(${m.id})"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
        tbody.appendChild(tr);
    });
}

function openEditMovieModal(id) {
    const m = MOVIES.find(x => x.id === id);
    if (!m) return;
    document.getElementById('editMovieId').value = m.id;
    document.getElementById('editMovieTitle').value = m.name;
    document.getElementById('editMovieDuration').value = m.duration;
    document.getElementById('editMovieDirector').value = m.director || '';
    document.getElementById('editMovieLanguage').value = m.lang || '';
    const fmtEl = document.getElementById('editMovieFormat');
    if (fmtEl) fmtEl.value = m.dinhdanghotro || '2D';
    document.getElementById('editMoviePoster').value = m.poster;
    document.getElementById('editMovieBanner').value = m.banner || '';
    document.getElementById('editMovieTrailer').value = m.trailer || '';

    const modal = new bootstrap.Modal(document.getElementById('editMovieModal'));
    modal.show();
}

async function submitEditMovie(event) {
    event.preventDefault();
    const id = document.getElementById('editMovieId').value;
    const payload = {
        TenPhim: document.getElementById('editMovieTitle').value,
        ThoiLuong: document.getElementById('editMovieDuration').value || 0,
        DaoDien: document.getElementById('editMovieDirector').value || '',
        NgonNguHoTro: document.getElementById('editMovieLanguage').value || 'Phụ Đề',
        DinhDangHoTro: document.getElementById('editMovieFormat') ? document.getElementById('editMovieFormat').value : '2D',
        PosterURL: document.getElementById('editMoviePoster').value,
        BannerURL: document.getElementById('editMovieBanner').value,
        TrailerURL: document.getElementById('editMovieTrailer').value
    };
    try {
        const res = await fetch('http://54.255.100.246:3000/admin/phim/capnhat/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            alert('Cập nhật phim thành công!');
            bootstrap.Modal.getInstance(document.getElementById('editMovieModal')).hide();
            loadMovies(); // Tải lại danh sách phim
        } else {
            alert('Lỗi: ' + data.message);
        }
    } catch (e) {
        console.error(e);
        alert('Lỗi kết nối server!');
    }
}

async function deleteMovie(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa phim này? Mọi suất chiếu liên quan cũng sẽ bị xóa!')) return;
    try {
        const res = await fetch('http://54.255.100.246:3000/admin/phim/xoa/' + id, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            alert('Xóa phim thành công!');
            loadMovies(); // Tải lại danh sách phim
        } else {
            alert('Lỗi: ' + data.message);
        }
    } catch (e) {
        console.error(e);
        alert('Lỗi kết nối server!');
    }
}
// ============================================
// HERO CAROUSEL
// ============================================
function renderHeroCarousel() {
    const carousel = document.querySelector('.hero-carousel');
    if (!carousel) return;

    const bannerMovies = MOVIES.filter(m => m.banner && m.banner.trim() !== '');

    if (bannerMovies.length === 0) {
        // Không có phim nào → Ẩn carousel, hiện empty-state
        carousel.innerHTML = `
            <div style="min-height:340px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#16213e);">
                <i class="fas fa-film" style="font-size:60px;color:#555;margin-bottom:16px;"></i>
                <h3 style="color:#aaa;font-weight:700;">Hiện chưa có phim đang chiếu</h3>
                <p style="color:#666;">Quản trị viên vui lòng thêm phim mới!</p>
            </div>`;
        return;
    }

    carousel.innerHTML = bannerMovies.map((m, index) => `
                <div class="slide ${index === 0 ? 'active' : ''}" style="background: url('${m.banner}') center/cover;">
                    <div class="hero-content">
                        <span class="badge bg-danger mb-3 px-3 py-2 fs-6">Đang chiếu rạp</span>
                        <h1 class="text-white" style="font-size: 55px; font-weight: 900; text-transform: uppercase;">${m.name}</h1>
                        <p style="color: #eee; max-width: 600px; font-size: 18px; line-height: 1.6; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">Trải nghiệm rạp chiếu phim đỉnh cao cùng ${m.name}</p>
                        <button class="btn btn-primary btn-lg mt-3 fw-bold px-4 rounded-pill" onclick="openMovieDetail(${m.id})"><i class="fas fa-ticket-alt me-2"></i> MUA VÉ NGAY</button>
                    </div>
                </div>
            `).join('');

    // Re-init carousel logic (assume interval is handled globally)
}

// ============================================
// ADMIN: QUẢN LÝ SUẤT CHIẾU (RENDER, DELETE)
// ============================================
let SHOWTIMES = [];

async function loadShowtimes() {
    try {
        const response = await fetch('http://54.255.100.246:3000/admin/showtimes');
        SHOWTIMES = await response.json();
        if (document.getElementById('adminShowtimeTable')) renderAdminShowtimeTable();
    } catch (err) {
        console.error('Error fetching showtimes:', err);
    }
}

function renderAdminShowtimeTable() {
    const tbody = document.getElementById('adminShowtimeTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    SHOWTIMES.forEach(s => {
        const tr = document.createElement('tr');
        const datetime = new Date(s.thoigianbatdau);
        const timeStr = datetime.getHours().toString().padStart(2, '0') + ':' + datetime.getMinutes().toString().padStart(2, '0');
        const dateStr = datetime.getDate().toString().padStart(2, '0') + '/' + (datetime.getMonth() + 1).toString().padStart(2, '0') + '/' + datetime.getFullYear();

        tr.innerHTML = `
                    <td class="ps-3 fw-bold text-muted">#SC${s.id_suatchieu.toString().padStart(2, '0')}</td>
                    <td class="fw-bold" style="color: var(--brand-color);">${s.tenphim}</td>
                    <td>
                        <span class="badge bg-light text-dark border">HCMUT Cinema</span><br>
                        <small class="text-muted">${s.tenphong}</small>
                    </td>
                    <td class="text-dark fw-bold">${timeStr} <span class="fw-normal text-muted">${dateStr}</span></td>
                    <td><span class="badge bg-${s.dinhdang === '3D' ? 'warning' : (s.dinhdang === 'IMAX' ? 'info' : 'secondary')} text-dark">${s.dinhdang}</span></td>
                    <td>${s.ngonnguhotro || 'Phụ đề'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteShowtime(${s.id_suatchieu})"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
        tbody.appendChild(tr);
    });
}

async function deleteShowtime(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa suất chiếu này? Các vé đã đặt sẽ bị hủy!')) return;
    try {
        const res = await fetch('http://54.255.100.246:3000/admin/showtimes/xoa/' + id, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            alert('Xóa suất chiếu thành công!');
            loadShowtimes(); // Tải lại danh sách
        } else {
            alert('Lỗi: ' + data.message);
        }
    } catch (e) {
        console.error(e);
        alert('Lỗi kết nối server!');
    }
}

// ============================================
// INIT ON PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    renderMovieGrid();
    renderAdminMovieTable();
    loadShowtimes();
    changeRoom(1);
    checkShowtimeConflict(); // Khởi tạo lọc phòng chiếu theo định dạng mặc định (2D)
    handleHashChange(); // Kích hoạt bộ định tuyến để xử lý URL khi F5

    // Hỗ trợ Paste mã OTP 6 số
    document.querySelectorAll('.otp-inputs input').forEach(input => {
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            let text = (e.clipboardData || window.clipboardData).getData('text').trim();
            text = text.replace(/\D/g, ''); // Chỉ giữ lại số
            if (!text) return;

            const container = e.target.closest('.otp-inputs');
            const inputs = container.querySelectorAll('input');
            for (let i = 0; i < inputs.length && i < text.length; i++) {
                inputs[i].value = text[i];
            }
            const nextFocus = Math.min(text.length, inputs.length - 1);
            inputs[nextFocus].focus();
        });
    });
});

// Xử lý khi người dùng tắt Tab hoặc tắt trình duyệt ngang (Giải phóng ghế lập tức)
window.addEventListener('pagehide', () => {
    if (typeof selectedSeats !== 'undefined' && selectedSeats.length > 0 && currentShowtimeId) {
        const url = 'http://54.255.100.246:3000/booking/unlock';
        for (const seatId of selectedSeats) {
            const data = { showtimeId: currentShowtimeId, seatId: seatId, sessionKey: mySessionId };
            // Dùng fetch keepalive thay vì sendBeacon để tránh lỗi CORS khi gửi JSON
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true
            }).catch(e => console.error(e));
        }
    }
});
// --- GLOBAL AUTH LOGIC ---
let isGlobalRegistering = false;

function openGlobalLogin() {
    new bootstrap.Modal(document.getElementById('globalLoginModal')).show();
}

function switchGlobalToRegister() {
    isGlobalRegistering = true;
    bootstrap.Modal.getInstance(document.getElementById('globalLoginModal')).hide();
    const pm = new bootstrap.Modal(document.getElementById('paymentModal'));
    pm.show();
    showRegisterInModal();
}

async function handleGlobalLogin() {
    const email = document.getElementById('global-login-email').value;
    const pass = document.getElementById('global-login-pass').value;
    if (!email || !pass) return alert('Vui lòng nhập email và mật khẩu');

    try {
        const res = await fetch('http://54.255.100.246:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        const data = await res.json();
        if (data.success) {
            sessionStorage.setItem('currentUser', JSON.stringify({ email: email, pass: pass, name: data.user.name }));
            updateHeaderUserStatus();
            bootstrap.Modal.getInstance(document.getElementById('globalLoginModal')).hide();
            alert('Đăng nhập thành công!');
        } else {
            alert(data.message || 'Đăng nhập thất bại');
        }
    } catch (e) {
        console.error(e);
        alert('Lỗi kết nối máy chủ');
    }
}

function handleGlobalLogout() {
    sessionStorage.removeItem('currentUser');
    updateHeaderUserStatus();
}

// Chạy khi khởi động trang
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderUserStatus();
});

function updateHeaderUserStatus() {
    const userStr = sessionStorage.getItem('currentUser');
    const headerDiv = document.getElementById('header-user-status');
    if (!headerDiv) return;

    if (userStr) {
        const user = JSON.parse(userStr);
        headerDiv.innerHTML = `<i class="fas fa-user-circle fs-5 me-2 align-middle"></i> <b style="cursor:pointer;" onclick="event.stopPropagation();showView('profile');">${user.name}</b> <span style="margin-left:10px;cursor:pointer;color:#ffcccc;" onclick="event.stopPropagation();handleGlobalLogout();">(Đăng xuất)</span>`;
    } else {
        headerDiv.innerHTML = `<i class="fas fa-user-circle fs-5 me-2 align-middle"></i> <b>Đăng nhập / Đăng ký</b>`;
    }
}

// Click vào header → nếu đã đăng nhập thì vào profile, không thì mở login
function handleHeaderUserClick() {
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
        showView('profile');
    } else {
        openGlobalLogin();
    }
}

// Tải và hiển thị trang profile
async function loadAndRenderProfile() {
    const userStr = sessionStorage.getItem('currentUser');
    if (!userStr) {
        showView('home');
        openGlobalLogin();
        return;
    }
    const user = JSON.parse(userStr);

    try {
        const res = await fetch('http://54.255.100.246:3000/my-tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, pass: user.pass })
        });
        const data = await res.json();
        if (!data.success) {
            document.getElementById('profile-ticket-list').innerHTML = `<div class="text-danger text-center py-3">${data.message}</div>`;
            return;
        }

        // Hiện thông tin user
        document.getElementById('profile-name').textContent = data.user.name;
        document.getElementById('profile-email').textContent = data.user.email;
        document.getElementById('profile-diem').textContent = data.user.diem + ' điểm';
        document.getElementById('profile-chitieu').textContent = Number(data.user.tongChiTieu).toLocaleString('vi-VN') + ' đ';
        document.getElementById('profile-loai').textContent = data.user.loai || 'Thường';

        // Hiện danh sách vé
        const ticketList = document.getElementById('profile-ticket-list');
        if (data.tickets.length === 0) {
            ticketList.innerHTML = `<div class="text-center text-muted py-5"><i class="fas fa-ticket-alt fa-3x mb-3 d-block" style="opacity:0.3;"></i><p>Bạn chưa mua vé nào cả.</p></div>`;
            return;
        }

        ticketList.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>Phim</th>
                            <th>Suất chiếu</th>
                            <th>Ghế</th>
                            <th>Giá vé</th>
                            <th>Ngày mua</th>
                            <th class="text-center">Vé QR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.tickets.map(t => {
                            const st = new Date(t.showtime);
                            const stStr = `${st.getHours().toString().padStart(2,'0')}:${st.getMinutes().toString().padStart(2,'0')} ${st.getDate().toString().padStart(2,'0')}/${(st.getMonth()+1).toString().padStart(2,'0')}/${st.getFullYear()}`;
                            const buyDate = t.bookedAt ? new Date(t.bookedAt).toLocaleDateString('vi-VN') : '--';
                            return `<tr>
                                <td>
                                    <div class="d-flex align-items-center gap-2">
                                        <img src="${t.poster}" alt="" style="width:36px;height:54px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'">
                                        <span class="fw-bold" style="color:var(--brand-color);font-size:13px;">${t.movie}</span>
                                    </div>
                                </td>
                                <td><small>${stStr}<br><span class="text-muted">${t.room} &bull; ${t.format}</span></small></td>
                                <td><span class="badge bg-primary px-3 py-2 fs-6">${t.seat}</span></td>
                                <td class="fw-bold">${Number(t.price).toLocaleString('vi-VN')}đ</td>
                                <td><small class="text-muted">${buyDate}</small></td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="showTicketQR('${t.qr}','${t.movie.replace(/'/g,"\\'")}',' Ghế ${t.seat} &bull; ${stStr}')"><i class="fas fa-qrcode me-1"></i>Xem QR</button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>`;
    } catch (err) {
        console.error(err);
        document.getElementById('profile-ticket-list').innerHTML = `<div class="text-danger text-center py-3"><i class="fas fa-exclamation-triangle me-2"></i>Lỗi kết nối server</div>`;
    }
}

// Hiện modal QR vé
function showTicketQR(qrUrl, movie, detail) {
    document.getElementById('qr-modal-img').src = qrUrl;
    document.getElementById('qr-modal-movie').textContent = movie;
    document.getElementById('qr-modal-detail').innerHTML = detail;
    new bootstrap.Modal(document.getElementById('ticketQRModal')).show();
}
