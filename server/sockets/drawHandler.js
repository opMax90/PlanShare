const { getRoomState } = require('./roomHandler');

const drawHandler = (io, socket) => {
    // Draw event
    socket.on('draw', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const state = getRoomState(roomId);
        if (!state) return;

        const userId = socket.user._id.toString();

        // Validate: canvas not locked, user is active drawer or has draw permission
        if (state.canvasLocked) return;
        if (state.activeDrawer && state.activeDrawer !== userId) return;
        if (!state.activeDrawer && !state.drawPermissions.has(userId) && state.leader !== userId) return;

        // Store canvas data for new joiners
        state.canvasData.push({ ...data, userId });

        // Broadcast to others in the room
        socket.to(roomId).emit('draw', { ...data, userId });
    });

    // Request draw access
    socket.on('request-draw-access', (callback) => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const state = getRoomState(roomId);
        if (!state) return;

        const userId = socket.user._id.toString();
        const username = socket.user.username;

        // Notify the leader
        for (const [socketId, info] of state.connectedUsers) {
            if (info.userId === state.leader) {
                io.to(socketId).emit('draw-access-requested', { userId, username });
            }
        }

        callback?.({ success: true, message: 'Request sent to leader' });
    });

    // Clear canvas
    socket.on('clear-canvas', () => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const state = getRoomState(roomId);
        if (!state) return;

        const userId = socket.user._id.toString();

        // Only leader can clear canvas
        if (userId !== state.leader) return;

        state.canvasData = [];
        io.to(roomId).emit('canvas-cleared');
    });
};

module.exports = { drawHandler };
