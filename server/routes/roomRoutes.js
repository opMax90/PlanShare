const express = require('express');
const router = express.Router();
const { createRoom, joinRoom, getRoomInfo } = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.post('/create', protect, createRoom);
router.post('/join', protect, joinRoom);
router.get('/:roomId', protect, getRoomInfo);

module.exports = router;
