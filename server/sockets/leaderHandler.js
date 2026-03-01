const { getRoomState } = require('./roomHandler');
const Room = require('../models/Room');

const leaderHandler = (io, socket) => {
    // Helper: check if caller is leader
    const isLeader = (state, userId) => state.leader === userId;

    // Helper: broadcast updated participants
    const broadcastUpdate = (roomId, state) => {
        const participants = [];
        const seenUsers = new Set();
        for (const [, info] of state.connectedUsers) {
            if (!seenUsers.has(info.userId)) {
                seenUsers.add(info.userId);
                participants.push({
                    userId: info.userId,
                    username: info.username,
                    isLeader: info.userId === state.leader,
                    isMuted: state.mutedUsers.has(info.userId),
                    hasDrawPermission: state.drawPermissions.has(info.userId),
                });
            }
        }
        io.to(roomId).emit('room-update', {
            participants,
            leader: state.leader,
            activeDrawer: state.activeDrawer,
            canvasLocked: state.canvasLocked,
        });
    };

    // Grant drawing permission
    socket.on('grant-draw', ({ targetUserId }, callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !isLeader(state, socket.user._id.toString())) {
            return callback?.({ error: 'Not authorized' });
        }

        state.drawPermissions.add(targetUserId);
        state.activeDrawer = targetUserId;

        broadcastUpdate(roomId, state);

        // Notify the target user
        for (const [socketId, info] of state.connectedUsers) {
            if (info.userId === targetUserId) {
                io.to(socketId).emit('draw-permission-granted');
            }
        }

        callback?.({ success: true });
    });

    // Revoke drawing permission
    socket.on('revoke-draw', ({ targetUserId }, callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !isLeader(state, socket.user._id.toString())) {
            return callback?.({ error: 'Not authorized' });
        }

        state.drawPermissions.delete(targetUserId);
        if (state.activeDrawer === targetUserId) {
            state.activeDrawer = null;
        }

        broadcastUpdate(roomId, state);

        for (const [socketId, info] of state.connectedUsers) {
            if (info.userId === targetUserId) {
                io.to(socketId).emit('draw-permission-revoked');
            }
        }

        callback?.({ success: true });
    });

    // Lock/unlock canvas
    socket.on('lock-canvas', (callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !isLeader(state, socket.user._id.toString())) {
            return callback?.({ error: 'Not authorized' });
        }

        state.canvasLocked = true;
        broadcastUpdate(roomId, state);
        io.to(roomId).emit('canvas-locked');
        callback?.({ success: true });
    });

    socket.on('unlock-canvas', (callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !isLeader(state, socket.user._id.toString())) {
            return callback?.({ error: 'Not authorized' });
        }

        state.canvasLocked = false;
        broadcastUpdate(roomId, state);
        io.to(roomId).emit('canvas-unlocked');
        callback?.({ success: true });
    });

    // Mute/unmute user
    socket.on('mute-user', ({ targetUserId }, callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !isLeader(state, socket.user._id.toString())) {
            return callback?.({ error: 'Not authorized' });
        }

        state.mutedUsers.add(targetUserId);
        broadcastUpdate(roomId, state);

        for (const [socketId, info] of state.connectedUsers) {
            if (info.userId === targetUserId) {
                io.to(socketId).emit('you-were-muted');
            }
        }

        callback?.({ success: true });
    });

    socket.on('unmute-user', ({ targetUserId }, callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !isLeader(state, socket.user._id.toString())) {
            return callback?.({ error: 'Not authorized' });
        }

        state.mutedUsers.delete(targetUserId);
        broadcastUpdate(roomId, state);

        for (const [socketId, info] of state.connectedUsers) {
            if (info.userId === targetUserId) {
                io.to(socketId).emit('you-were-unmuted');
            }
        }

        callback?.({ success: true });
    });

    // Kick user
    socket.on('kick-user', async ({ targetUserId }, callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !isLeader(state, socket.user._id.toString())) {
            return callback?.({ error: 'Not authorized' });
        }

        // Clean up user state
        state.drawPermissions.delete(targetUserId);
        state.mutedUsers.delete(targetUserId);
        if (state.activeDrawer === targetUserId) {
            state.activeDrawer = null;
        }

        // Find and disconnect target's sockets
        for (const [socketId, info] of state.connectedUsers) {
            if (info.userId === targetUserId) {
                io.to(socketId).emit('you-were-kicked');
                const targetSocket = io.sockets.sockets.get(socketId);
                if (targetSocket) {
                    targetSocket.leave(roomId);
                    targetSocket.roomId = null;
                }
                state.connectedUsers.delete(socketId);
            }
        }

        // Remove from DB
        try {
            await Room.updateOne(
                { roomId },
                { $pull: { participants: targetUserId } }
            );
        } catch (e) {
            console.error('Error kicking user:', e);
        }

        broadcastUpdate(roomId, state);
        callback?.({ success: true });
    });

    // Transfer leadership
    socket.on('transfer-leader', async ({ targetUserId }, callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !isLeader(state, socket.user._id.toString())) {
            return callback?.({ error: 'Not authorized' });
        }

        state.leader = targetUserId;

        try {
            await Room.updateOne({ roomId }, { leaderId: targetUserId });
        } catch (e) {
            console.error('Error transferring leadership:', e);
        }

        let newLeaderName = '';
        for (const [, info] of state.connectedUsers) {
            if (info.userId === targetUserId) {
                newLeaderName = info.username;
                break;
            }
        }

        broadcastUpdate(roomId, state);
        io.to(roomId).emit('leader-changed', {
            newLeaderId: targetUserId,
            newLeaderName,
        });

        callback?.({ success: true });
    });

    // Lock/unlock room
    socket.on('lock-room', async (callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !isLeader(state, socket.user._id.toString())) {
            return callback?.({ error: 'Not authorized' });
        }

        try {
            await Room.updateOne({ roomId }, { isLocked: true });
        } catch (e) {
            console.error('Error locking room:', e);
        }

        io.to(roomId).emit('room-locked');
        callback?.({ success: true });
    });

    socket.on('unlock-room', async (callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !isLeader(state, socket.user._id.toString())) {
            return callback?.({ error: 'Not authorized' });
        }

        try {
            await Room.updateOne({ roomId }, { isLocked: false });
        } catch (e) {
            console.error('Error unlocking room:', e);
        }

        io.to(roomId).emit('room-unlocked');
        callback?.({ success: true });
    });
};

module.exports = { leaderHandler };
