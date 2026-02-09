import { useEffect, useRef } from 'react';
import './CrashGraph.css';

const CrashGraph = ({ 
  multiplier, 
  gamePhase, 
  countdown,
  betPlaced 
}) => {
  const canvasRef = useRef(null);
  const historyRef = useRef([]);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx, width, height);

    if (countdown !== null) {
      // Show countdown
      drawCountdown(ctx, width, height, countdown);
    } else if (gamePhase === 'waiting') {
      drawWaiting(ctx, width, height);
    } else if (gamePhase === 'betting') {
      drawBetting(ctx, width, height);
    } else if (gamePhase === 'flying' || gamePhase === 'crashed') {
      // Draw the graph
      drawGraph(ctx, width, height, multiplier, gamePhase);
    }
  }, [multiplier, gamePhase, countdown]);

  // Reset history when new round starts
  useEffect(() => {
    if (gamePhase === 'betting' || gamePhase === 'waiting') {
      historyRef.current = [];
      startTimeRef.current = null;
    }
  }, [gamePhase]);

  // Add multiplier to history
  useEffect(() => {
    if (gamePhase === 'flying') {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      historyRef.current.push({ time: elapsed, value: multiplier });
      
      // Keep only last 100 points for performance
      if (historyRef.current.length > 100) {
        historyRef.current.shift();
      }
    }
  }, [multiplier, gamePhase]);

  const drawGrid = (ctx, width, height) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let i = 0; i < 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i < 8; i++) {
      const y = (height / 8) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawCountdown = (ctx, width, height, count) => {
    ctx.fillStyle = 'rgba(255, 165, 2, 0.1)';
    ctx.fillRect(0, 0, width, height);

    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = '#ffa502';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count, width / 2, height / 2);

    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('Starting in...', width / 2, height / 2 - 80);
  };

  const drawWaiting = (ctx, width, height) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, width, height);

    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Waiting for round...', width / 2, height / 2);
  };

  const drawBetting = (ctx, width, height) => {
    ctx.fillStyle = 'rgba(255, 165, 2, 0.05)';
    ctx.fillRect(0, 0, width, height);

    // Draw starting line
    ctx.strokeStyle = '#ffa502';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(50, height - 50);
    ctx.lineTo(width - 50, height - 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw rocket at start
    ctx.font = '48px Arial';
    ctx.fillText('🚀', 50, height - 80);

    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#ffa502';
    ctx.textAlign = 'center';
    ctx.fillText('Place your bets!', width / 2, height / 2);
  };

  const drawGraph = (ctx, width, height, currentMultiplier, phase) => {
    const history = historyRef.current;
    if (history.length < 2) return;

    const padding = 50;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Calculate max values for scaling
    const maxTime = Math.max(...history.map(p => p.time), 10);
    const maxValue = Math.max(...history.map(p => p.value), currentMultiplier, 2);

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw Y-axis labels (multiplier)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = (maxValue / 5) * i;
      const y = height - padding - (graphHeight / 5) * i;
      ctx.fillText(value.toFixed(1) + 'x', padding - 10, y + 5);
    }

    // Draw the curve
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (phase === 'crashed') {
      gradient.addColorStop(0, 'rgba(255, 71, 87, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 71, 87, 0.2)');
    } else {
      gradient.addColorStop(0, 'rgba(0, 255, 136, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 255, 136, 0.2)');
    }

    // Fill area under curve
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    
    history.forEach((point, index) => {
      const x = padding + (point.time / maxTime) * graphWidth;
      const y = height - padding - (point.value / maxValue) * graphHeight;
      
      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(padding + (history[history.length - 1].time / maxTime) * graphWidth, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = phase === 'crashed' ? '#ff4757' : '#00ff88';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    history.forEach((point, index) => {
      const x = padding + (point.time / maxTime) * graphWidth;
      const y = height - padding - (point.value / maxValue) * graphHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw rocket at current position
    if (history.length > 0) {
      const lastPoint = history[history.length - 1];
      const rocketX = padding + (lastPoint.time / maxTime) * graphWidth;
      const rocketY = height - padding - (lastPoint.value / maxValue) * graphHeight;

      // Draw glow
      const glowGradient = ctx.createRadialGradient(rocketX, rocketY, 0, rocketX, rocketY, 30);
      glowGradient.addColorStop(0, phase === 'crashed' ? 'rgba(255, 71, 87, 0.6)' : 'rgba(0, 255, 136, 0.6)');
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(rocketX, rocketY, 30, 0, Math.PI * 2);
      ctx.fill();

      // Draw rocket emoji
      ctx.font = '32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(phase === 'crashed' ? '💥' : '🚀', rocketX, rocketY);
    }

    // Draw current multiplier value
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = phase === 'crashed' ? '#ff4757' : '#00ff88';
    ctx.textAlign = 'center';
    ctx.shadowColor = phase === 'crashed' ? '#ff4757' : '#00ff88';
    ctx.shadowBlur = 20;
    ctx.fillText(currentMultiplier.toFixed(2) + 'x', width / 2, 80);
    ctx.shadowBlur = 0;

    // Draw crash indicator
    if (phase === 'crashed') {
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#ff4757';
      ctx.fillText('CRASHED!', width / 2, 140);
    }
  };

  return (
    <div className="crash-graph-container">
      <canvas ref={canvasRef} className="crash-graph-canvas" />
      {betPlaced && gamePhase === 'flying' && (
        <div className="bet-indicator">
          <div className="bet-indicator-label">Your Bet</div>
          <div className="bet-indicator-value">${betPlaced.amount}</div>
          <div className="bet-indicator-potential">
            → ${(betPlaced.amount * multiplier).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CrashGraph;
