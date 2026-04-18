const User = require('../models/TaiKhoan');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (err) {
    res.status(500).json({ message: 'Không thể lấy danh sách người dùng: ' + err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Role không hợp lệ.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user.' });
    }

    user.role = role;
    await user.save();
    res.json({ message: 'Cập nhật quyền thành công.', user: { _id: user._id, name: user.name, email: user.email, role: user.role, isBanned: user.isBanned } });
  } catch (err) {
    res.status(500).json({ message: 'Không thể cập nhật role: ' + err.message });
  }
};

exports.toggleBanUser = async (req, res) => {
  try {
    const { isBanned } = req.body;
    if (typeof isBanned !== 'boolean') {
      return res.status(400).json({ message: 'isBanned phải là boolean.' });
    }

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Bạn không thể khóa hoặc mở khóa chính mình.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user.' });
    }

    user.isBanned = isBanned;
    await user.save();
    res.json({ message: `Tài khoản đã ${isBanned ? 'bị khóa' : 'mở khóa'} thành công.`, user: { _id: user._id, name: user.name, email: user.email, role: user.role, isBanned: user.isBanned } });
  } catch (err) {
    res.status(500).json({ message: 'Không thể cập nhật trạng thái khóa: ' + err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Bạn không thể xóa chính mình.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user.' });
    }

    res.json({ message: 'Đã xóa tài khoản thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Không thể xóa user: ' + err.message });
  }
};
