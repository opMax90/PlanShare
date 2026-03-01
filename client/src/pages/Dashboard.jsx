import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import api from '../services/api';
import '../styles/dashboard.css';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateRoom = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.post('/rooms/create');
            navigate(`/room/${data.room.roomId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create room');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        if (!joinCode.trim() || joinCode.trim().length !== 6) {
            setError('Please enter a valid 6-character room code');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/rooms/join', { roomId: joinCode.trim().toUpperCase() });
            navigate(`/room/${joinCode.trim().toUpperCase()}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join room');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <Link to="/" className="dashboard-nav-logo">
                    <div className="logo-icon">⬡</div>
                    PlanShare
                </Link>
                <div className="dashboard-nav-actions">
                    <div className="dashboard-nav-user">
                        <div className="user-avatar">
                            {user?.username?.[0]?.toUpperCase()}
                        </div>
                        {user?.username}
                    </div>
                    <ThemeToggle />
                    <button className="btn btn-secondary btn-sm" onClick={handleLogout} id="logout-btn">
                        Logout
                    </button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="dashboard-grid">
                    {error && (
                        <div className="error-msg" style={{ gridColumn: '1 / -1' }}>
                            {error}
                        </div>
                    )}

                    <div className="card dashboard-card">
                        <div className="dashboard-card-icon">🚀</div>
                        <h2>Create Room</h2>
                        <p>Start a new collaboration room and invite your team with a unique code.</p>
                        <button
                            className="btn btn-primary"
                            onClick={handleCreateRoom}
                            disabled={loading}
                            id="create-room-btn"
                            style={{ width: '100%' }}
                        >
                            {loading ? 'Creating...' : 'Create New Room'}
                        </button>
                    </div>

                    <div className="card dashboard-card">
                        <div className="dashboard-card-icon">🔗</div>
                        <h2>Join Room</h2>
                        <p>Enter a room code to join an existing collaboration session.</p>
                        <form className="join-form" onSubmit={handleJoinRoom}>
                            <input
                                type="text"
                                className="input"
                                placeholder="ABC123"
                                value={joinCode}
                                onChange={(e) => {
                                    setJoinCode(e.target.value.toUpperCase());
                                    setError('');
                                }}
                                maxLength={6}
                                id="join-code-input"
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading || joinCode.length !== 6}
                                id="join-room-btn"
                                style={{ width: '100%' }}
                            >
                                {loading ? 'Joining...' : 'Join Room'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
