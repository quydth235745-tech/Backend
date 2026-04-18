const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Helmet: Đặt các HTTP headers cho security (disabled for development)
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}

// CORS: Strict in production, permissive for configured local origins in development
const localOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5176'];
const configuredOrigins = [
  ...(process.env.FRONTEND_URLS || '').split(',').map((x) => x.trim()).filter(Boolean),
  process.env.FRONTEND_URL
].filter(Boolean);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? configuredOrigins
  : [...new Set([...localOrigins, ...configuredOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server, health checks)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting: Tránh brute force attacks (DISABLED FOR DEVELOPMENT)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 1000,
//   message: 'Too many requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Apply rate limiter to all /api/ routes (DISABLED)
// app.use('/api/', limiter);

// Body Parser: Nhận dữ liệu
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Custom NoSQL Injection Prevention: Xóa $ và . từ object keys
const sanitizeData = (data) => {
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(sanitizeData);
    }
    const sanitized = {};
    for (const key in data) {
      if (key.startsWith('$') || key.includes('.')) {
        console.warn(`⚠️ Blocked suspicious key: ${key}`);
        continue;
      }
      sanitized[key] = sanitizeData(data[key]);
    }
    return sanitized;
  }
  return data;
};

app.use((req, res, next) => {
  // Skip sanitization for file uploads and multipart data
  if (req.is('multipart/form-data') || req.is('application/octet-stream')) {
    return next();
  }
  
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeData(req.body);
  }
  next();
});

const foodRoutes = require('./routes/TuyenDuongMon');
app.use('/api/foods', foodRoutes);

const authRoutes = require('./routes/TuyenDuongXacThuc');
app.use('/api/auth', authRoutes);

const orderRoutes = require('./routes/TuyenDuongDonHang');
const userRoutes = require('./routes/TuyenDuongTaiKhoan');
const couponRoutes = require('./routes/TuyenDuongKhuyenMai');
const commentRoutes = require('./routes/TuyenDuongBinhLuan');
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/comments', commentRoutes);

// Error handling middlewares
const { errorHandler, notFound } = require('./middlewares/XuLyLoi');

// 404 handler (phải đặt sau tất cả routes)
app.use(notFound);

// Error handler (phải đặt cuối cùng)
app.use(errorHandler);

// Lấy link từ file .env và kết nối MongoDB
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI chưa được cấu hình trong .env');
  process.exit(1);
}

mongoose.connect(uri)
    .then(() => console.log("🎉 TUYỆT VỜI! Đã kết nối MongoDB Atlas thành công!"))
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

// Tạo một đường dẫn để test thử
app.get('/', (req, res) => {
    res.send('Xin chào! Backend Đặt Đồ Ăn đang hoạt động nha!');
});

// Bật server chạy ở cổng 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đã chạy ngon lành rồi `);
});