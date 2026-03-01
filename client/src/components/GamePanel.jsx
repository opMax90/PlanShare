import { useState } from 'react';

const GamePanel = ({ socket, isLeader, gameState }) => {
    const [rounds, setRounds] = useState(3);
    const [drawTime, setDrawTime] = useState(60);

    const startGame = () => {
        if (!socket) return;
        socket.emit('start-game', { rounds, drawTime }, (res) => {
            if (res?.error) console.error('Start game error:', res.error);
        });
    };

    const stopGame = () => {
        if (!socket) return;
        socket.emit('stop-game', (res) => {
            if (res?.error) console.error('Stop game error:', res.error);
        });
    };

    if (!gameState?.active && isLeader) {
        return (
            <div className="game-panel">
                <div className="leader-panel-title">🎮 Game Mode</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div className="input-group" style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem' }}>Rounds</label>
                        <input
                            type="number"
                            className="input"
                            style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                            value={rounds}
                            onChange={(e) => setRounds(Number(e.target.value))}
                            min={1}
                            max={10}
                        />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem' }}>Time (sec)</label>
                        <input
                            type="number"
                            className="input"
                            style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                            value={drawTime}
                            onChange={(e) => setDrawTime(Number(e.target.value))}
                            min={20}
                            max={180}
                        />
                    </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={startGame} style={{ width: '100%' }}>
                    🎮 Start Game
                </button>
            </div>
        );
    }

    if (!gameState?.active) return null;

    return (
        <div className="game-panel">
            <div className="game-info">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Round {gameState.round}/{gameState.rounds}
                </span>
                <div className="game-timer">{gameState.timeLeft}s</div>
            </div>

            {gameState.word && (
                <div className="game-word">{gameState.word}</div>
            )}

            {gameState.wordLength && !gameState.word && (
                <div className="game-word">
                    {Array.from({ length: gameState.wordLength }).map((_, i) => (
                        <span key={i} style={{ margin: '0 2px' }}>_</span>
                    ))}
                </div>
            )}

            {gameState.scores && (
                <div className="scoreboard">
                    {Object.entries(gameState.scores)
                        .sort(([, a], [, b]) => b - a)
                        .map(([userId, score]) => {
                            const player = gameState.players?.find((p) => p.userId === userId);
                            return (
                                <div key={userId} className="score-item">
                                    <span>{player?.username || userId}</span>
                                    <span className="score-value">{score}</span>
                                </div>
                            );
                        })}
                </div>
            )}

            {isLeader && (
                <button
                    className="btn btn-danger btn-sm"
                    onClick={stopGame}
                    style={{ width: '100%', marginTop: '0.5rem' }}
                >
                    Stop Game
                </button>
            )}
        </div>
    );
};

export default GamePanel;
