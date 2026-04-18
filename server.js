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

// CORS: Strict in production, configurable in development via env
const configuredOrigins = [
  ...(process.env.FRONTEND_URLS || '').split(',').map((x) => x.trim()).filter(Boolean),
  process.env.FRONTEND_URL
].filter(Boolean);

const devDefaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? configuredOrigins
  : [...new Set([...configuredOrigins, ...devDefaultOrigins])];

const isDevAllowAllOrigins = process.env.NODE_ENV !== 'production' && process.env.CORS_DEV_ALLOW_ALL === 'true';
const allowVercelPreviewOrigins = process.env.CORS_ALLOW_VERCEL_PREVIEWS !== 'false';
const vercelProjectName = (process.env.VERCEL_PROJECT_NAME || '').trim().toLowerCase();

const isAllowedOrigin = (origin) => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (!allowVercelPreviewOrigins) {
    return false;
  }

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();

    if (parsed.protocol !== 'https:' || !host.endsWith('.vercel.app')) {
      return false;
    }

    // If project name is set, only allow that project's production + preview domains.
    if (vercelProjectName) {
      return host === `${vercelProjectName}.vercel.app` || host.startsWith(`${vercelProjectName}-`);
    }

    // Fallback: allow Vercel domains when no project name is configured.
    return true;
  } catch (error) {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server, health checks)
    if (!origin) {
      return callback(null, true);
    }

    // In local development, optionally allow all browser origins via env switch
    if (isDevAllowAllOrigins) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin)) {
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