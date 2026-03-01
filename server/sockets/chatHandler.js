const { getRoomState } = require('./roomHandler');

// Simple XSS sanitization
const sanitize = (str) => {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
};

// Rate limiter per user
const messageTimestamps = new Map();
const RATE_LIMIT_WINDOW = 2000; // 2 seconds
const RATE_LIMIT_MAX = 5; // max messages per window

const isRateLimited = (userId) => {
    const now = Date.now();
    if (!messageTimestamps.has(userId)) {
        messageTimestamps.set(userId, []);
    }
    const timestamps = messageTimestamps.get(userId);
    // Remove old timestamps
    while (timestamps.length > 0 && timestamps[0] < now - RATE_LIMIT_WINDOW) {
        timestamps.shift();
    }
    if (timestamps.length >= RATE_LIMIT_MAX) {
        return true;
    }
    timestamps.push(now);
    return false;
};

const chatHandler = (io, socket) => {
    socket.on('send-message', (data, callback) => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const state = getRoomState(roomId);
        if (!state) return;

        const userId = socket.user._id.toString();
        const username = socket.user.username;

        // Check if muted
        if (state.mutedUsers.has(userId)) {
            return callback?.({ error: 'You are muted' });
        }

        // Rate limit
        if (isRateLimited(userId)) {
            return callback?.({ error: 'Slow down! Too many messages' });
        }

        // Validate message
        const message = data.message?.trim();
        if (!message || message.length === 0 || message.length > 500) {
            return callback?.({ error: 'Invalid message' });
        }

        const sanitizedMessage = sanitize(message);

        const msgData = {
            userId,
            username,
            message: sanitizedMessage,
            timestamp: new Date().toISOString(),
        };

        io.to(roomId).emit('new-message', msgData);
        callback?.({ success: true });
    });
};

module.exports = { chatHandler };
