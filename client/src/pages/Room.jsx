import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Canvas from '../components/Canvas';
import Chat from '../components/Chat';
import Participants from '../components/Participants';
import LeaderControls from '../components/LeaderControls';
import GamePanel from '../components/GamePanel';
import ThemeToggle from '../components/ThemeToggle';
import api from '../services/api';
import '../styles/room.css';

const Room = () => {
    const { roomId } = useParams();
    const { user } = useAuth();
    const { socket, connected } = useSocket();
    const navigate = useNavigate();

    const [participants, setParticipants] = useState([]);
    const [isLeader, setIsLeader] = useState(false);
    const [canvasLocked, setCanvasLocked] = useState(false);
    const [activeDrawer, setActiveDrawer] = useState(null);
    const [canDraw, setCanDraw] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [roomLocked, setRoomLocked] = useState(false);
    const [sidebarTab, setSidebarTab] = useState('chat');
    const [gameState, setGameState] = useState({ active: false });
    const [copied, setCopied] = useState(false);
    const [joined, setJoined] = useState(false);

    // Verify room access
    useEffect(() => {
        const verifyRoom = async () => {
            try {
                await api.get(`/rooms/${roomId}`);
            } catch {
                navigate('/dashboard');
            }
        };
        verifyRoom();
    }, [roomId, navigate]);

    // Join room via socket
    useEffect(() => {
        if (!socket || !connected || joined) return;

        socket.emit('join-room', roomId, (res) => {
            if (res?.error) {
                navigate('/dashboard');
                return;
            }
            if (res?.success) {
                setIsLeader(res.isLeader);
                setParticipants(res.participants || []);
                setCanvasLocked(res.canvasLocked);
                setActiveDrawer(res.activeDrawer);
                setJoined(true);
            }
        });
    }, [socket, connected, roomId, navigate, joined]);

    // Socket event listeners
    useEffect(() => {
        if (!socket) return;

        const onRoomUpdate = (data) => {
            setParticipants(data.participants || []);
            setCanvasLocked(data.canvasLocked);
            setActiveDrawer(data.activeDrawer);
            const me = data.participants?.find((p) => p.userId === user?._id);
            setIsLeader(data.leader === user?._id);
            setIsMuted(me?.isMuted || false);
            setCanDraw(
                data.leader === user?._id ||
                me?.hasDrawPermission ||
                data.activeDrawer === user?._id
            );
        };

        const onLeaderChanged = (data) => {
            setIsLeader(data.newLeaderId === user?._id);
        };

        const onDrawPermGranted = () => setCanDraw(true);
        const onDrawPermRevoked = () => setCanDraw(false);
        const onMuted = () => setIsMuted(true);
        const onUnmuted = () => setIsMuted(false);
        const onKicked = () => navigate('/dashboard');
        const onCanvasLocked = () => setCanvasLocked(true);
        const onCanvasUnlocked = () => setCanvasLocked(false);
        const onRoomLocked = () => setRoomLocked(true);
        const onRoomUnlocked = () => setRoomLocked(false);

        // Game events
        const onGameStarted = (data) => {
            setGameState({ active: true, ...data, timeLeft: data.drawTime });
        };
        const onTurnStarted = (data) => {
            setGameState((prev) => ({
                ...prev,
                drawerId: data.drawerId,
                drawerName: data.drawerName,
                wordLength: data.wordLength,
                round: data.round,
                timeLeft: data.timeLeft,
                word: null,
            }));
            setActiveDrawer(data.drawerId);
            setCanDraw(data.drawerId === user?._id);
        };
        const onYourTurn = (data) => {
            setGameState((prev) => ({ ...prev, word: data.word }));
            setCanDraw(true);
        };
        const onTimerTick = (data) => {
            setGameState((prev) => ({ ...prev, timeLeft: data.timeLeft }));
        };
        const onTurnEnded = (data) => {
            setGameState((prev) => ({ ...prev, scores: data.scores, word: data.word }));
        };
        const onGameEnded = (data) => {
            setGameState({ active: false, scores: data.scores });
            setCanDraw(isLeader);
        };
        const onCorrectGuess = (data) => {
            setGameState((prev) => ({ ...prev, scores: data.scores }));
        };

        socket.on('room-update', onRoomUpdate);
        socket.on('leader-changed', onLeaderChanged);
        socket.on('draw-permission-granted', onDrawPermGranted);
        socket.on('draw-permission-revoked', onDrawPermRevoked);
        socket.on('you-were-muted', onMuted);
        socket.on('you-were-unmuted', onUnmuted);
        socket.on('you-were-kicked', onKicked);
        socket.on('canvas-locked', onCanvasLocked);
        socket.on('canvas-unlocked', onCanvasUnlocked);
        socket.on('room-locked', onRoomLocked);
        socket.on('room-unlocked', onRoomUnlocked);
        socket.on('game-started', onGameStarted);
        socket.on('turn-started', onTurnStarted);
        socket.on('your-turn', onYourTurn);
        socket.on('timer-tick', onTimerTick);
        socket.on('turn-ended', onTurnEnded);
        socket.on('game-ended', onGameEnded);
        socket.on('correct-guess', onCorrectGuess);

        return () => {
            socket.off('room-update', onRoomUpdate);
            socket.off('leader-changed', onLeaderChanged);
            socket.off('draw-permission-granted', onDrawPermGranted);
            socket.off('draw-permission-revoked', onDrawPermRevoked);
            socket.off('you-were-muted', onMuted);
            socket.off('you-were-unmuted', onUnmuted);
            socket.off('you-were-kicked', onKicked);
            socket.off('canvas-locked', onCanvasLocked);
            socket.off('canvas-unlocked', onCanvasUnlocked);
            socket.off('room-locked', onRoomLocked);
            socket.off('room-unlocked', onRoomUnlocked);
            socket.off('game-started', onGameStarted);
            socket.off('turn-started', onTurnStarted);
            socket.off('your-turn', onYourTurn);
            socket.off('timer-tick', onTimerTick);
            socket.off('turn-ended', onTurnEnded);
            socket.off('game-ended', onGameEnded);
            socket.off('correct-guess', onCorrectGuess);
        };
    }, [socket, user, isLeader, navigate]);

    const copyRoomId = useCallback(() => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [roomId]);

    const requestDrawAccess = () => {
        socket?.emit('request-draw-access', (res) => {
            if (res?.success) {
                // Show brief notification
            }
        });
    };

    const handleLeaveRoom = () => {
        socket?.emit('leave-room');
        navigate('/dashboard');
    };

    return (
        <div className="room-page">
            <div className="room-topbar">
                <div className="room-topbar-left">
                    <Link to="/dashboard" className="topbar-logo">
                        <div className="logo-icon">⬡</div>
                        PlanShare
                    </Link>
                    <div className="room-id-badge" onClick={copyRoomId} title="Click to copy room code">
                        Room: <span className="code">{roomId}</span>
                        <span style={{ fontSize: '0.7rem' }}>{copied ? '✅' : '📋'}</span>
                    </div>
                    {activeDrawer && (
                        <div className="drawer-indicator">
                            🎨 Drawing: <strong>
                                {participants.find((p) => p.userId === activeDrawer)?.username || 'Unknown'}
                            </strong>
                        </div>
                    )}
                </div>
                <div className="room-topbar-right">
                    <div className="connection-status">
                        <div className={`status-dot ${connected ? '' : 'disconnected'}`} />
                        {connected ? 'Connected' : 'Reconnecting...'}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {user?.username}
                    </span>
                    {!canDraw && !isLeader && (
                        <button className="btn btn-secondary btn-sm" onClick={requestDrawAccess}>
                            ✋ Request Draw
                        </button>
                    )}
                    <ThemeToggle />
                    <button className="btn btn-secondary btn-sm" onClick={handleLeaveRoom} id="leave-room-btn">
                        Leave
                    </button>
                </div>
            </div>

            <div className="room-body">
                <Canvas socket={socket} canDraw={canDraw || isLeader} canvasLocked={canvasLocked} />

                <div className="room-sidebar">
                    <div className="sidebar-tabs">
                        <button
                            className={`sidebar-tab ${sidebarTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setSidebarTab('chat')}
                        >
                            💬 Chat
                        </button>
                        <button
                            className={`sidebar-tab ${sidebarTab === 'people' ? 'active' : ''}`}
                            onClick={() => setSidebarTab('people')}
                        >
                            👥 People ({participants.length})
                        </button>
                    </div>

                    <div className="sidebar-content">
                        {sidebarTab === 'chat' && (
                            <Chat socket={socket} isMuted={isMuted} />
                        )}
                        {sidebarTab === 'people' && (
                            <Participants
                                participants={participants}
                                currentUserId={user?._id}
                                isLeader={isLeader}
                                socket={socket}
                            />
                        )}
                    </div>

                    <GamePanel
                        socket={socket}
                        isLeader={isLeader}
                        gameState={gameState}
                    />

                    {isLeader && (
                        <LeaderControls
                            socket={socket}
                            canvasLocked={canvasLocked}
                            roomLocked={roomLocked}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Room;
