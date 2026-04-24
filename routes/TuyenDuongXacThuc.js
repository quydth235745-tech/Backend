const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const auth = require('../middlewares/XacThuc');
const User = require('../models/TaiKhoan'); // Gọi khuôn Người dùng ra

const googleClient = new OAuth2Client();

const parseGoogleAudiences = (requestClientId = '') => {
  const audienceSet = new Set();

  const singleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (singleClientId) {
    audienceSet.add(singleClientId);
  }

  const csvClientIds = (process.env.GOOGLE_CLIENT_IDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  for (const clientId of csvClientIds) {
    audienceSet.add(clientId);
  }

  const requestAudience = String(requestClientId || '').trim();
  if (requestAudience) {
    audienceSet.add(requestAudience);
  }

  return Array.from(audienceSet);
};

const signAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET chưa được cấu hình.');
  }

  return jwt.sign(
    { _id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// API ĐĂNG KÝ TÀI KHOẢN
router.post('/register', async (req, res) => {
  try {
    // 1. Kiểm tra xem email này có ai xài chưa
    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) {
      return res.status(400).json({ message: "Email này đã được đăng ký rồi nha!" });
    }

    // 2. Mã hóa mật khẩu (Băm nó ra)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // 3. Đổ dữ liệu vào khuôn và lưu lên mây
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword, // Lưu mật khẩu đã mã hóa, không lưu mật khẩu gốc
      role: 'user'
    });

    const savedUser = await newUser.save();
    res.status(201).json({ message: "Tuyệt vời! Đăng ký tài khoản thành công!" });

  } catch (err) {
    res.status(500).json({ message: "Lỗi Server rồi: " + err.message });
  }
});
// API ĐĂNG NHẬP TÀI KHOẢN
router.post('/login', async (req, res) => {
  try {
    const identifier = (req.body.identifier || req.body.email || req.body.username || '').trim();
    const password = req.body.password;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập/email và mật khẩu." });
    }

    const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeIdentifier = escapeRegex(identifier);
    const identifierRegex = new RegExp(`^${safeIdentifier}$`, 'i');

    // 1. Tìm xem tên đăng nhập hoặc email này có trong hệ thống không
    const user = await User.findOne({
      $or: [
        { email: identifierRegex },
        { name: identifierRegex }
      ]
    });
    if (!user) {
      return res.status(400).json({ message: "Tên đăng nhập hoặc email chưa đăng ký nha!" });
    }

    // 2. So sánh mật khẩu nhập vào với mật khẩu đã băm trên đám mây
    const validPassword = await bcrypt.compare(password, user.password);
    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' });
    }

    if (!validPassword) {
      return res.status(400).json({ message: "Sai mật khẩu rồi bạn ơi!" });
    }

    // 3. Mật khẩu đúng -> Cấp "thẻ VIP" (Token)
    const token = signAccessToken(user);

    // Trả thẻ VIP và thông tin user về cho frontend
    res.json({
      message: "Đăng nhập thành công rực rỡ!",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Lỗi Server rồi: " + err.message });
  }
});

router.patch('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin đổi mật khẩu.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới và xác nhận không khớp.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại.' });
    }

    const validOldPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validOldPassword) {
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Không thể đổi mật khẩu: ' + err.message });
  }
});

router.get('/verify-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User không tồn tại.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Liên hệ quản trị để mở lại.' });
    }

    res.json({ 
      valid: true, 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (err) {
    res.status(401).json({ message: 'Token không hợp lệ.' });
  }
});

// API ĐĂNG NHẬP BẰNG GOOGLE OAUTH
router.post('/google-login', async (req, res) => {
  try {
    const { token, clientId } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Google token không được cung cấp.' });
    }

    const audiences = parseGoogleAudiences(clientId);
    if (!audiences.length) {
      return res.status(400).json({
        message: 'Thiếu Google Client ID. Hãy cấu hình GOOGLE_CLIENT_ID ở backend hoặc gửi clientId từ frontend.'
      });
    }

    let ticket = null;
    let verifyError = null;

    for (const audience of audiences) {
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience,
        });
        break;
      } catch (err) {
        verifyError = err;
      }
    }

    if (!ticket) {
      throw verifyError || new Error('Google token verification failed.');
    }

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Google token không hợp lệ.' });
    }

    if (!payload.email_verified) {
      return res.status(400).json({ message: 'Email Google chưa được xác thực.' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];

    if (!email) {
      return res.status(400).json({ message: 'Email không tìm thấy trong Google token.' });
    }

    // Tìm hoặc tạo user
    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        name: name || email.split('@')[0],
        email,
        password: 'oauth_user',
        role: 'user'
      });
      await user.save();
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa.' });
    }

    // Cấp JWT token của app
    const appToken = signAccessToken(user);

    res.json({
      message: 'Đăng nhập bằng Google thành công!',
      token: appToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(401).json({
      message: 'Google token không hợp lệ, hết hạn, hoặc không khớp Google Client ID cấu hình.'
    });
  }
});

module.exports = router;