import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/landing.css';

const Landing = () => {
    const { user } = useAuth();

    return (
        <div className="landing">
            <nav className="landing-nav">
                <div className="landing-logo">
                    <div className="landing-logo-icon">⬡</div>
                    PlanShare
                </div>
                <div className="landing-nav-actions">
                    <ThemeToggle />
                    {user ? (
                        <Link to="/dashboard" className="btn btn-primary" id="go-dashboard">
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-secondary" id="login-btn">
                                Log In
                            </Link>
                            <Link to="/register" className="btn btn-primary" id="register-btn">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            <section className="landing-hero">
                <div className="hero-content fade-in">
                    <div className="hero-badge">✨ Real-Time Collaboration Platform</div>
                    <h1 className="hero-title">
                        Collaborate in <span className="gradient-text">Real Time.</span>
                        <br />
                        Share Ideas Visually.
                    </h1>
                    <p className="hero-subtitle">
                        Create or join rooms to draw, chat, and brainstorm with your team.
                        PlanShare brings everyone together on one shared canvas with secure, role-based controls.
                    </p>
                    <div className="hero-actions">
                        {user ? (
                            <Link to="/dashboard" className="btn btn-primary" id="hero-dashboard">
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/register" className="btn btn-primary" id="hero-register">
                                    Create Free Account
                                </Link>
                                <Link to="/login" className="btn btn-secondary" id="hero-login">
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <section className="landing-features">
                <div className="feature-card">
                    <div className="feature-icon">🎨</div>
                    <h3>Shared Canvas</h3>
                    <p>Draw together in real-time with color, brush, and eraser tools. One canvas, infinite ideas.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">💬</div>
                    <h3>Live Chat</h3>
                    <p>Communicate instantly alongside the canvas. Every message timestamped and visible to the team.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">🔒</div>
                    <h3>Leader Controls</h3>
                    <p>The Host manages drawing permissions, mutes, kicks, and room locks with full authority.</p>
                </div>
            </section>

            <footer className="landing-footer">
                © 2026 PlanShare. Built for teams that think visually.
            </footer>
        </div>
    );
};

export default Landing;
