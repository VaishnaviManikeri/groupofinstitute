const express = require('express');
const router = express.Router();
const { loginAdmin, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', loginAdmin);
router.get('/profile', protect, getProfile);

module.exports = router;