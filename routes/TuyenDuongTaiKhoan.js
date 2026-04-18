const express = require('express');
const router = express.Router();
const auth = require('../middlewares/XacThuc');
const authorize = require('../middlewares/PhanQuyen');
const userController = require('../controllers/ControllerTaiKhoan');

router.get('/', auth, authorize('admin'), userController.getUsers);
router.patch('/:id/role', auth, authorize('admin'), userController.updateUserRole);
router.patch('/:id/ban', auth, authorize('admin'), userController.toggleBanUser);
router.delete('/:id', auth, authorize('admin'), userController.deleteUser);

module.exports = router;
