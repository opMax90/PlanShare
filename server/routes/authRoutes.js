const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    getMe,
    registerValidation,
    loginValidation,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const rateLimit = require('express-rate-limit');

// Rate limit login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { message: 'Too many login attempts, please try again later' },
});

router.post('/register', registerValidation, validate, register);
router.post('/login', loginLimiter, loginValidation, validate, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
