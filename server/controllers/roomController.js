const Room = require('../models/Room');
const generateRoomId = require('../utils/generateRoomId');

// @desc    Create a new room
// @route   POST /api/rooms/create
const createRoom = async (req, res) => {
    try {
        let roomId;
        let exists = true;

        // Generate unique room ID
        while (exists) {
            roomId = generateRoomId();
            exists = await Room.findOne({ roomId });
        }

        const room = await Room.create({
            roomId,
            leaderId: req.user._id,
            participants: [req.user._id],
        });

        await room.populate('participants', 'username email');
        await room.populate('leaderId', 'username');

        res.status(201).json({ success: true, room });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Join an existing room
// @route   POST /api/rooms/join
const joinRoom = async (req, res) => {
    try {
        const { roomId } = req.body;

        if (!roomId || roomId.length !== 6) {
            return res.status(400).json({ message: 'Valid 6-character room code required' });
        }

        const room = await Room.findOne({ roomId: roomId.toUpperCase() });

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (room.isLocked) {
            return res.status(403).json({ message: 'Room is locked' });
        }

        // Check if already a participant
        if (room.participants.includes(req.user._id)) {
            await room.populate('participants', 'username email');
            await room.populate('leaderId', 'username');
            return res.json({ success: true, room });
        }

        room.participants.push(req.user._id);
        await room.save();

        await room.populate('participants', 'username email');
        await room.populate('leaderId', 'username');

        res.json({ success: true, room });
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get room info
// @route   GET /api/rooms/:roomId
const getRoomInfo = async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() })
            .populate('participants', 'username email')
            .populate('leaderId', 'username');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Only participants can view room info
        const isParticipant = room.participants.some(
            (p) => p._id.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({ message: 'Not a participant of this room' });
        }

        res.json({ success: true, room });
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { createRoom, joinRoom, getRoomInfo };
