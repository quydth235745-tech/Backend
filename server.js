const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  const message = '❌ Thiếu JWT_SECRET trong Environment Variables.';
  if (isProduction) {
    throw new Error(message);
  }
  console.warn(`${message} Các API đăng nhập/xác thực sẽ không hoạt động đúng.`);
}

// CORS: Dùng whitelist trong production, mở localhost trong development.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (!isProduction) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

// Helmet: Đặt các HTTP headers cho security (disabled for development)
if (isProduction) {
  app.use(helmet());
}

// Rate Limiting: Tránh brute force/spam requests.
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 300 : 2000),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

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
        console.warn(`⚠️ Khóa đáng ngờ đã bị chặn: ${key}`);
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

// Route gốc để kiểm tra backend đang chạy
app.get('/', (req, res) => {
  res.send('Xin chào! Backend Đặt Đồ Ăn đang hoạt động nha!');
});

// Error handling middlewares
const { errorHandler, notFound } = require('./middlewares/XuLyLoi');

// 404 handler (phải đặt sau tất cả routes)
app.use(notFound);

// Error handler (phải đặt cuối cùng)
app.use(errorHandler);

// Lấy link MongoDB từ env (hỗ trợ nhiều tên biến khi deploy như Render)
const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
if (!uri) {
  console.error('❌ Thiếu biến MongoDB. Hãy cấu hình MONGODB_URI (hoặc MONGO_URI / DATABASE_URL) trong Environment Variables.');
  console.warn('⚠️ Server vẫn khởi động nhưng các API cần database sẽ không hoạt động.');
} else {
  mongoose.connect(uri)
      .then(() => console.log("🎉 TUYỆT VỜI! Đã kết nối MongoDB Atlas thành công!"))
      .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));
}

// Bật server chạy ở cổng 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đã chạy ngon lành rồi `);
});