const Room = require('../models/Room');

// In-memory room state
const roomStates = new Map();

const getDefaultRoomState = (leaderId) => ({
    leader: leaderId,
    activeDrawer: null,
    canvasLocked: false,
    mutedUsers: new Set(),
    drawPermissions: new Set(),
    connectedUsers: new Map(), // socketId -> { userId, username }
    canvasData: [],
    gameMode: null,
});

const getRoomState = (roomId) => roomStates.get(roomId);
const setRoomState = (roomId, state) => roomStates.set(roomId, state);

const roomHandler = (io, socket) => {
    // Join room
    socket.on('join-room', async (roomId, callback) => {
        try {
            const room = await Room.findOne({ roomId: roomId.toUpperCase() });
            if (!room) {
                return callback?.({ error: 'Room not found' });
            }

            const userId = socket.user._id.toString();
            const username = socket.user.username;

            // Check if user is a participant
            const isParticipant = room.participants.some(
                (p) => p.toString() === userId
            );
            if (!isParticipant) {
                return callback?.({ error: 'Not a participant' });
            }

            // Initialize room state if needed
            if (!roomStates.has(roomId)) {
                setRoomState(roomId, getDefaultRoomState(room.leaderId.toString()));
            }

            const state = getRoomState(roomId);

            // Check for duplicate username in room (different user)
            for (const [, info] of state.connectedUsers) {
                if (info.username === username && info.userId !== userId) {
                    return callback?.({ error: 'Username already in room' });
                }
            }

            // Join socket room
            socket.join(roomId);
            socket.roomId = roomId;

            // Add to connected users
            state.connectedUsers.set(socket.id, { userId, username });

            // Build participant list
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

            // Notify all in room
            io.to(roomId).emit('room-update', {
                participants,
                leader: state.leader,
                activeDrawer: state.activeDrawer,
                canvasLocked: state.canvasLocked,
            });

            // Send existing canvas data to the joining user
            if (state.canvasData.length > 0) {
                socket.emit('canvas-history', state.canvasData);
            }

            socket.to(roomId).emit('user-joined', { userId, username });

            callback?.({
                success: true,
                roomId,
                isLeader: userId === state.leader,
                participants,
                canvasLocked: state.canvasLocked,
                activeDrawer: state.activeDrawer,
            });
        } catch (error) {
            console.error('Join room socket error:', error);
            callback?.({ error: 'Server error' });
        }
    });

    // Leave room
    socket.on('leave-room', () => {
        handleDisconnect(io, socket);
    });

    // Disconnect
    socket.on('disconnect', () => {
        handleDisconnect(io, socket);
    });
};

const handleDisconnect = async (io, socket) => {
    const roomId = socket.roomId;
    if (!roomId) return;

    const state = getRoomState(roomId);
    if (!state) return;

    const userInfo = state.connectedUsers.get(socket.id);
    if (!userInfo) return;

    const { userId, username } = userInfo;
    state.connectedUsers.delete(socket.id);

    // Check if user still has other connected sockets in this room
    let stillConnected = false;
    for (const [, info] of state.connectedUsers) {
        if (info.userId === userId) {
            stillConnected = true;
            break;
        }
    }

    if (!stillConnected) {
        // Clear draw permissions and active drawer if needed
        if (state.activeDrawer === userId) {
            state.activeDrawer = null;
        }
        state.drawPermissions.delete(userId);
        state.mutedUsers.delete(userId);

        // Remove from DB participants
        try {
            await Room.updateOne(
                { roomId },
                { $pull: { participants: userId } }
            );
        } catch (e) {
            console.error('Error removing participant:', e);
        }

        // Auto-transfer leadership if leader disconnects
        if (state.leader === userId) {
            const remainingUsers = [];
            for (const [, info] of state.connectedUsers) {
                remainingUsers.push(info);
            }

            if (remainingUsers.length > 0) {
                const newLeader = remainingUsers[0];
                state.leader = newLeader.userId;

                // Update DB
                try {
                    await Room.updateOne(
                        { roomId },
                        { leaderId: newLeader.userId }
                    );
                } catch (e) {
                    console.error('Error transferring leadership:', e);
                }

                io.to(roomId).emit('leader-changed', {
                    newLeaderId: newLeader.userId,
                    newLeaderName: newLeader.username,
                });
            } else {
                // No one left, clean up
                roomStates.delete(roomId);
                try {
                    await Room.deleteOne({ roomId });
                } catch (e) {
                    console.error('Error deleting room:', e);
                }
                return;
            }
        }

        // Build updated participant list
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

        io.to(roomId).emit('user-left', { userId, username });
    }

    socket.leave(roomId);
};

module.exports = { roomHandler, getRoomState, setRoomState, roomStates };
