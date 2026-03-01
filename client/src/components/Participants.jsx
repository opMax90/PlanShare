const Participants = ({ participants, currentUserId, isLeader, socket }) => {
    const handleAction = (action, targetUserId) => {
        if (!socket) return;
        socket.emit(action, { targetUserId }, (res) => {
            if (res?.error) {
                console.error(`${action} failed:`, res.error);
            }
        });
    };

    return (
        <div className="participants-list">
            {participants.map((p) => (
                <div key={p.userId} className="participant-item">
                    <div className="participant-info">
                        <div className="participant-avatar">
                            {p.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <div className="participant-name">
                                {p.username}
                                {p.userId === currentUserId && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> (you)</span>
                                )}
                            </div>
                            <div className="participant-badges">
                                {p.isLeader && <span className="badge badge-leader">👑 Leader</span>}
                                {p.hasDrawPermission && <span className="badge badge-success">✏️ Drawing</span>}
                                {p.isMuted && <span className="badge badge-warning">🔇 Muted</span>}
                            </div>
                        </div>
                    </div>

                    {isLeader && p.userId !== currentUserId && (
                        <div className="participant-actions">
                            {p.hasDrawPermission ? (
                                <button
                                    className="btn btn-xs btn-secondary"
                                    onClick={() => handleAction('revoke-draw', p.userId)}
                                    title="Revoke drawing"
                                >
                                    ✏️✕
                                </button>
                            ) : (
                                <button
                                    className="btn btn-xs btn-secondary"
                                    onClick={() => handleAction('grant-draw', p.userId)}
                                    title="Grant drawing"
                                >
                                    ✏️
                                </button>
                            )}
                            {p.isMuted ? (
                                <button
                                    className="btn btn-xs btn-secondary"
                                    onClick={() => handleAction('unmute-user', p.userId)}
                                    title="Unmute"
                                >
                                    🔊
                                </button>
                            ) : (
                                <button
                                    className="btn btn-xs btn-secondary"
                                    onClick={() => handleAction('mute-user', p.userId)}
                                    title="Mute"
                                >
                                    🔇
                                </button>
                            )}
                            <button
                                className="btn btn-xs btn-secondary"
                                onClick={() => handleAction('transfer-leader', p.userId)}
                                title="Transfer leadership"
                            >
                                👑
                            </button>
                            <button
                                className="btn btn-xs btn-danger"
                                onClick={() => handleAction('kick-user', p.userId)}
                                title="Kick"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default Participants;
