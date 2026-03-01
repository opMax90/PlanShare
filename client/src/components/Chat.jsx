import { useState, useEffect, useRef } from 'react';

const Chat = ({ socket, isMuted }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (data) => {
            setMessages((prev) => [...prev, data]);
        };

        const handleSystemMsg = (type, data) => {
            setMessages((prev) => [
                ...prev,
                {
                    system: true,
                    message: type === 'join'
                        ? `${data.username} joined the room`
                        : type === 'left'
                            ? `${data.username} left the room`
                            : type === 'leader'
                                ? `${data.newLeaderName} is now the leader`
                                : data.message || 'System event',
                    timestamp: new Date().toISOString(),
                },
            ]);
        };

        socket.on('new-message', handleMessage);
        socket.on('user-joined', (d) => handleSystemMsg('join', d));
        socket.on('user-left', (d) => handleSystemMsg('left', d));
        socket.on('leader-changed', (d) => handleSystemMsg('leader', d));
        socket.on('correct-guess', (d) => {
            setMessages((prev) => [
                ...prev,
                {
                    system: true,
                    message: `🎉 ${d.username} guessed the word!`,
                    timestamp: new Date().toISOString(),
                },
            ]);
        });

        return () => {
            socket.off('new-message', handleMessage);
            socket.off('user-joined');
            socket.off('user-left');
            socket.off('leader-changed');
            socket.off('correct-guess');
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !socket || isMuted) return;

        socket.emit('send-message', { message: input.trim() }, (res) => {
            if (res?.error) {
                setMessages((prev) => [
                    ...prev,
                    { system: true, message: `⚠️ ${res.error}`, timestamp: new Date().toISOString() },
                ]);
            }
        });
        setInput('');
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-system-msg">No messages yet. Say hello! 👋</div>
                )}
                {messages.map((msg, i) =>
                    msg.system ? (
                        <div key={i} className="chat-system-msg">
                            {msg.message}
                        </div>
                    ) : (
                        <div key={i} className="chat-message">
                            <div className="chat-message-header">
                                <span className="chat-username">{msg.username}</span>
                                <span className="chat-time">{formatTime(msg.timestamp)}</span>
                            </div>
                            <div className="chat-text">{msg.message}</div>
                        </div>
                    )
                )}
                <div ref={messagesEndRef} />
            </div>

            {isMuted ? (
                <div className="muted-notice">🔇 You are muted by the leader</div>
            ) : (
                <form className="chat-input-area" onSubmit={sendMessage}>
                    <input
                        type="text"
                        className="input"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        maxLength={500}
                        id="chat-input"
                    />
                    <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={!input.trim()}
                        id="chat-send"
                    >
                        Send
                    </button>
                </form>
            )}
        </div>
    );
};

export default Chat;
