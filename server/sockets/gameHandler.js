const { getRoomState } = require('./roomHandler');
const { getRandomWord } = require('../utils/words');

const gameHandler = (io, socket) => {
    // Start game mode
    socket.on('start-game', ({ rounds = 3, drawTime = 60 }, callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || state.leader !== socket.user._id.toString()) {
            return callback?.({ error: 'Not authorized' });
        }

        // Get list of players
        const players = [];
        const seenUsers = new Set();
        for (const [, info] of state.connectedUsers) {
            if (!seenUsers.has(info.userId)) {
                seenUsers.add(info.userId);
                players.push({ userId: info.userId, username: info.username });
            }
        }

        if (players.length < 2) {
            return callback?.({ error: 'Need at least 2 players' });
        }

        state.gameMode = {
            active: true,
            rounds,
            currentRound: 1,
            drawTime,
            currentDrawerIndex: 0,
            players,
            scores: {},
            currentWord: null,
            guessedUsers: new Set(),
            timer: null,
            timeLeft: drawTime,
        };

        // Initialize scores
        players.forEach((p) => {
            state.gameMode.scores[p.userId] = 0;
        });

        io.to(roomId).emit('game-started', {
            rounds,
            drawTime,
            players,
            scores: state.gameMode.scores,
        });

        // Start first turn
        startTurn(io, roomId, state);
        callback?.({ success: true });
    });

    // Guess word
    socket.on('guess-word', ({ guess }, callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || !state.gameMode?.active) return;

        const userId = socket.user._id.toString();
        const game = state.gameMode;

        if (game.players[game.currentDrawerIndex].userId === userId) return;
        if (game.guessedUsers.has(userId)) return;

        if (guess.toLowerCase().trim() === game.currentWord.toLowerCase()) {
            game.guessedUsers.add(userId);

            // Score based on time remaining
            const timeBonus = Math.ceil(game.timeLeft / game.drawTime * 100);
            game.scores[userId] = (game.scores[userId] || 0) + timeBonus;

            // Drawer gets points too
            const drawerId = game.players[game.currentDrawerIndex].userId;
            game.scores[drawerId] = (game.scores[drawerId] || 0) + 10;

            io.to(roomId).emit('correct-guess', {
                userId,
                username: socket.user.username,
                scores: game.scores,
            });

            // Check if all players guessed
            const nonDrawerCount = game.players.length - 1;
            if (game.guessedUsers.size >= nonDrawerCount) {
                endTurn(io, roomId, state);
            }

            callback?.({ success: true, correct: true });
        } else {
            callback?.({ success: true, correct: false });
        }
    });

    // Stop game mode
    socket.on('stop-game', (callback) => {
        const roomId = socket.roomId;
        const state = getRoomState(roomId);
        if (!state || state.leader !== socket.user._id.toString()) {
            return callback?.({ error: 'Not authorized' });
        }

        if (state.gameMode?.timer) {
            clearInterval(state.gameMode.timer);
        }
        state.gameMode = null;
        state.activeDrawer = null;
        state.canvasData = [];

        io.to(roomId).emit('game-ended', { message: 'Game stopped by leader' });
        callback?.({ success: true });
    });
};

const startTurn = (io, roomId, state) => {
    const game = state.gameMode;
    if (!game || !game.active) return;

    const drawer = game.players[game.currentDrawerIndex];
    game.currentWord = getRandomWord();
    game.guessedUsers = new Set();
    game.timeLeft = game.drawTime;
    state.activeDrawer = drawer.userId;
    state.canvasData = [];

    // Send word only to drawer
    for (const [socketId, info] of state.connectedUsers) {
        if (info.userId === drawer.userId) {
            io.to(socketId).emit('your-turn', { word: game.currentWord });
        }
    }

    // Tell everyone else
    io.to(roomId).emit('turn-started', {
        drawerId: drawer.userId,
        drawerName: drawer.username,
        wordLength: game.currentWord.length,
        round: game.currentRound,
        timeLeft: game.drawTime,
    });

    io.to(roomId).emit('canvas-cleared');

    // Timer
    game.timer = setInterval(() => {
        game.timeLeft--;

        if (game.timeLeft <= 0) {
            endTurn(io, roomId, state);
        } else {
            io.to(roomId).emit('timer-tick', { timeLeft: game.timeLeft });
        }
    }, 1000);
};

const endTurn = (io, roomId, state) => {
    const game = state.gameMode;
    if (!game) return;

    if (game.timer) {
        clearInterval(game.timer);
        game.timer = null;
    }

    io.to(roomId).emit('turn-ended', {
        word: game.currentWord,
        scores: game.scores,
    });

    state.activeDrawer = null;

    // Move to next drawer
    game.currentDrawerIndex++;

    // Check if round is over
    if (game.currentDrawerIndex >= game.players.length) {
        game.currentDrawerIndex = 0;
        game.currentRound++;

        // Check if game is over
        if (game.currentRound > game.rounds) {
            game.active = false;
            io.to(roomId).emit('game-ended', {
                scores: game.scores,
                message: 'Game over!',
            });
            state.gameMode = null;
            return;
        }
    }

    // Start next turn after a delay
    setTimeout(() => {
        if (state.gameMode?.active) {
            startTurn(io, roomId, state);
        }
    }, 3000);
};

module.exports = { gameHandler };
