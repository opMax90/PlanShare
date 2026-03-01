import { useRef, useEffect, useState, useCallback } from 'react';

const Canvas = ({ socket, canDraw, canvasLocked }) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#f1f1f5');
    const [brushSize, setBrushSize] = useState(3);
    const [tool, setTool] = useState('pen'); // pen | eraser
    const lastPos = useRef(null);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            const wrapper = canvas.parentElement;
            const w = Math.min(wrapper.clientWidth - 40, 1200);
            const h = Math.min(wrapper.clientHeight - 20, 800);

            // Save current image
            const imageData = ctxRef.current?.getImageData(0, 0, canvas.width, canvas.height);

            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            // Restore image
            if (imageData) {
                ctx.putImageData(imageData, 0, 0);
            }

            ctxRef.current = ctx;
        };

        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        const handleDraw = (data) => {
            drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
        };

        const handleCanvasHistory = (history) => {
            history.forEach((data) => {
                drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
            });
        };

        const handleCanvasCleared = () => {
            const canvas = canvasRef.current;
            const ctx = ctxRef.current;
            if (canvas && ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        };

        socket.on('draw', handleDraw);
        socket.on('canvas-history', handleCanvasHistory);
        socket.on('canvas-cleared', handleCanvasCleared);

        return () => {
            socket.off('draw', handleDraw);
            socket.off('canvas-history', handleCanvasHistory);
            socket.off('canvas-cleared', handleCanvasCleared);
        };
    }, [socket]);

    const drawLine = useCallback((x0, y0, x1, y1, strokeColor, size) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = size;
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.closePath();
    }, []);

    const getCanvasPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if (e.touches) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const startDrawing = (e) => {
        if (!canDraw || canvasLocked) return;
        e.preventDefault();
        setIsDrawing(true);
        const pos = getCanvasPos(e);
        lastPos.current = pos;
    };

    const draw = (e) => {
        if (!isDrawing || !canDraw || canvasLocked) return;
        e.preventDefault();

        const pos = getCanvasPos(e);
        const prev = lastPos.current;

        const drawColor = tool === 'eraser' ? '#ffffff' : color;
        const drawSize = tool === 'eraser' ? brushSize * 3 : brushSize;

        drawLine(prev.x, prev.y, pos.x, pos.y, drawColor, drawSize);

        if (socket) {
            socket.emit('draw', {
                x0: prev.x,
                y0: prev.y,
                x1: pos.x,
                y1: pos.y,
                color: drawColor,
                size: drawSize,
            });
        }

        lastPos.current = pos;
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPos.current = null;
    };

    const presetColors = ['#f1f1f5', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];

    return (
        <div className="canvas-area">
            <div className="canvas-toolbar">
                <div className="toolbar-group">
                    {presetColors.map((c) => (
                        <button
                            key={c}
                            className={`toolbar-btn${color === c && tool === 'pen' ? ' active' : ''}`}
                            onClick={() => { setColor(c); setTool('pen'); }}
                            style={{ padding: 0 }}
                            title={c}
                        >
                            <span
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: c,
                                    display: 'block',
                                    border: c === '#ffffff' || c === '#f1f1f5' ? '1px solid var(--border)' : 'none',
                                }}
                            />
                        </button>
                    ))}
                    <div className="color-picker-wrap">
                        <div className="color-picker-swatch" style={{ background: color }} />
                        <input
                            type="color"
                            className="color-picker-input"
                            value={color}
                            onChange={(e) => { setColor(e.target.value); setTool('pen'); }}
                        />
                    </div>
                </div>

                <div className="toolbar-group">
                    <button
                        className={`toolbar-btn${tool === 'pen' ? ' active' : ''}`}
                        onClick={() => setTool('pen')}
                        title="Pen"
                    >
                        ✏️
                    </button>
                    <button
                        className={`toolbar-btn${tool === 'eraser' ? ' active' : ''}`}
                        onClick={() => setTool('eraser')}
                        title="Eraser"
                    >
                        🧽
                    </button>
                </div>

                <div className="toolbar-group">
                    <div className="brush-size-control">
                        <span className="brush-size-label">{brushSize}</span>
                        <input
                            type="range"
                            className="brush-size-slider"
                            min="1"
                            max="20"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            <div className="canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{
                        cursor: canDraw && !canvasLocked ? 'crosshair' : 'not-allowed',
                        maxWidth: '100%',
                        maxHeight: '100%',
                    }}
                />
                {canvasLocked && (
                    <div className="canvas-locked-overlay">
                        <div className="canvas-locked-text">🔒 Canvas is locked</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Canvas;
