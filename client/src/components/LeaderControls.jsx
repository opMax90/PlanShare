const LeaderControls = ({ socket, canvasLocked, roomLocked }) => {
    const emit = (event, data, cb) => {
        if (!socket) return;
        socket.emit(event, data || {}, (res) => {
            if (res?.error) console.error(`${event} failed:`, res.error);
            cb?.(res);
        });
    };

    return (
        <div className="leader-panel">
            <div className="leader-panel-title">👑 Leader Controls</div>
            <div className="leader-controls-grid">
                <button
                    className={`btn btn-sm ${canvasLocked ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => emit(canvasLocked ? 'unlock-canvas' : 'lock-canvas')}
                >
                    {canvasLocked ? '🔓 Unlock Canvas' : '🔒 Lock Canvas'}
                </button>
                <button
                    className={`btn btn-sm ${roomLocked ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => emit(roomLocked ? 'unlock-room' : 'lock-room')}
                >
                    {roomLocked ? '🔓 Unlock Room' : '🔒 Lock Room'}
                </button>
                <button
                    className="btn btn-sm btn-danger"
                    onClick={() => emit('clear-canvas')}
                >
                    🗑️ Clear Canvas
                </button>
            </div>
        </div>
    );
};

export default LeaderControls;
