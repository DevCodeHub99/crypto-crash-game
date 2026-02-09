import { useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import CrashGraph from "./components/CrashGraph";
import "./App.css";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Quick bet amounts
const QUICK_BETS = [10, 25, 50, 100];

function App() {
  // Auth State
  const [inputUsername, setInputUsername] = useState("");
  const [username, setUsername] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  // Socket State
  const [socket, setSocket] = useState(null);
  const [socketId, setSocketId] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // Game State
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [gamePhase, setGamePhase] = useState("waiting");
  const [crashPoint, setCrashPoint] = useState(null);

  // Betting State
  const [betAmount, setBetAmount] = useState("");
  const [betCurrency, setBetCurrency] = useState("BTC");
  const [hasBet, setHasBet] = useState(false);
  const [betPlaced, setBetPlaced] = useState(null);
  const [canCashout, setCanCashout] = useState(false);

  // UI State
  const [status, setStatus] = useState("Welcome! Login to start playing.");
  const [notification, setNotification] = useState(null);
  const [wallet, setWallet] = useState({ BTC: "0.0000000000", ETH: "0.0000000000" });
  const [gameHistory, setGameHistory] = useState([]);
  const [txHistory, setTxHistory] = useState([]);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [showTxHistory, setShowTxHistory] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [activePlayers, setActivePlayers] = useState(0);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalWins: 0,
    totalLosses: 0,
    biggestWin: 0,
    totalProfit: 0
  });

  // Refs
  const betPlacedRef = useRef(betPlaced);
  const usernameRef = useRef(username);
  const canCashoutRef = useRef(canCashout);

  useEffect(() => {
    betPlacedRef.current = betPlaced;
    usernameRef.current = username;
    canCashoutRef.current = canCashout;
  }, [betPlaced, username, canCashout]);

  const showNotification = useCallback((type, message, duration = 3000) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), duration);
  }, []);

  const fetchWallet = useCallback(async (user) => {
    try {
      const res = await axios.get(`${API_URL}/player/wallet/${user}`);
      const btc = res.data.wallets?.find((w) => w.currency === "BTC");
      const eth = res.data.wallets?.find((w) => w.currency === "ETH");
      setWallet({
        BTC: btc ? Number(btc.balance).toFixed(10) : "0.0000000000",
        ETH: eth ? Number(eth.balance).toFixed(10) : "0.0000000000",
      });
    } catch (error) {
      console.error("Failed to fetch wallet:", error);
    }
  }, []);

  // Socket connection
  useEffect(() => {
    if (!authenticated) return;

    console.log("🔌 Connecting to socket:", SOCKET_URL);
    
    const s = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'],
      forceNew: false
    });

    s.on("connect", () => {
      console.log("✅ Socket connected:", s.id);
      setIsConnected(true);
      setSocketId(s.id);
      setStatus("🎮 Connected! Waiting for next round...");
      showNotification("success", "Connected to game server!");
    });

    s.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      setIsConnected(false);
    });

    s.on("reconnect", () => {
      console.log("✅ Reconnected to server");
      showNotification("success", "Reconnected to server!");
    });

    s.on("disconnect", () => {
      setIsConnected(false);
      setSocketId("");
      setStatus("❌ Disconnected from server");
      showNotification("error", "Lost connection to server");
    });

    s.on("player_bet", (payload) => {
      console.log("🎲 Player placed bet:", payload);
      if (payload.username !== usernameRef.current) {
        setActivePlayers(prev => prev + 1);
      }
    });

    s.on("round_start", (data) => {
      console.log("🎮 Round started:", data);
      setGamePhase("betting");
      setCurrentMultiplier(1.0);
      setCrashPoint(null);
      setCountdown(null);
      setStatus("🎲 Round started! Place your bets!");
      setHasBet(false);
      setCanCashout(false);
      setActivePlayers(0);
      showNotification("info", "New round started! Place your bet now!");
    });

    s.on("multiplier_update", (data) => {
      setCurrentMultiplier(data.multiplier);
      setGamePhase("flying");
      
      if (betPlacedRef.current && !canCashoutRef.current) {
        setCanCashout(true);
      }
    });

    s.on("round_crash", async (data) => {
      console.log("💥 Round crashed:", data);
      const finalMultiplier = data.multiplier || currentMultiplier;
      setCurrentMultiplier(finalMultiplier);
      setCrashPoint(finalMultiplier);
      setGamePhase("crashed");
      setCanCashout(false);
      
      const currentBet = betPlacedRef.current;
      if (currentBet) {
        const lostAmount = currentBet.amount;
        showNotification("error", `💔 Crashed at ${finalMultiplier.toFixed(2)}x! Lost $${lostAmount}`);
        setBetPlaced(null);
        setHasBet(false);
        
        setStats(prev => ({
          ...prev,
          totalLosses: prev.totalLosses + 1,
          totalProfit: prev.totalProfit - lostAmount
        }));
        
        setTimeout(() => fetchWallet(usernameRef.current), 500);
      }
      
      setStatus(`💥 Crashed at ${finalMultiplier.toFixed(2)}x`);
      setCountdown(5);
    });

    s.on("bet_placed", (payload) => {
      console.log("✅ Bet placed successfully:", payload);
      
      if (payload.username === usernameRef.current) {
        setBetPlaced({
          amount: payload.usd_amount,
          currency: payload.currency,
          timestamp: Date.now()
        });
        setHasBet(true);
        setBetAmount("");
        setIsPlacingBet(false);
        showNotification("success", `✅ Bet placed: $${payload.usd_amount} in ${payload.currency}`);
        
        fetchWallet(usernameRef.current);
      }
    });

    s.on("bet_error", (payload) => {
      console.error("❌ Bet error:", payload);
      setIsPlacingBet(false);
      showNotification("error", payload.msg || "Failed to place bet");
    });

    s.on("player_cashout", (payload) => {
      console.log("💰 Player cashed out:", payload);
      
      const currentBet = betPlacedRef.current;
      if (payload.username === usernameRef.current && currentBet) {
        const profit = payload.usd_equivalent - currentBet.amount;
        showNotification(
          "success", 
          `🎉 Cashed out at ${payload.multiplier.toFixed(2)}x! Won $${payload.usd_equivalent.toFixed(2)}`
        );
        
        setBetPlaced(null);
        setHasBet(false);
        setCanCashout(false);
        
        setStats(prev => ({
          ...prev,
          totalWins: prev.totalWins + 1,
          biggestWin: Math.max(prev.biggestWin, profit),
          totalProfit: prev.totalProfit + profit
        }));
        
        setTimeout(() => fetchWallet(usernameRef.current), 500);
      }
    });

    s.on("error", (err) => {
      console.error("Socket error:", err);
      showNotification("error", err.msg || "An error occurred");
    });

    setSocket(s);

    return () => {
      console.log("🔌 Disconnecting socket");
      s.disconnect();
      setSocket(null);
    };
  }, [authenticated, showNotification, fetchWallet]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!inputUsername.trim()) {
      showNotification("error", "Please enter a username");
      return;
    }

    try {
      await axios.post(`${API_URL}/player/create`, { username: inputUsername });
      setUsername(inputUsername);
      setAuthenticated(true);
      showNotification("success", `Welcome ${inputUsername}!`);
      fetchWallet(inputUsername);
    } catch (err) {
      showNotification("error", err.response?.data?.msg || "Registration failed");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!inputUsername.trim()) {
      showNotification("error", "Please enter your username");
      return;
    }

    setUsername(inputUsername);
    setAuthenticated(true);
    showNotification("success", `Welcome back ${inputUsername}!`);
    fetchWallet(inputUsername);
  };

  const handlePlaceBet = (amount) => {
    if (!socket || !isConnected) {
      showNotification("error", "Not connected to server");
      return;
    }

    if (hasBet) {
      showNotification("error", "You already have a bet in this round");
      return;
    }

    const betValue = amount || parseFloat(betAmount);
    if (!betValue || betValue <= 0) {
      showNotification("error", "Enter a valid bet amount");
      return;
    }

    setIsPlacingBet(true);

    socket.emit("place_bet", {
      username,
      usd_amount: betValue,
      currency: betCurrency,
    });
  };

  const handleCashout = () => {
    if (!canCashout || !betPlaced) {
      showNotification("error", "Cannot cash out right now");
      return;
    }

    if (socket) {
      socket.emit("cashout", { username });
      setStatus("⏳ Cashing out...");
    }
  };

  const handleLogout = () => {
    if (socket) socket.disconnect();
    setAuthenticated(false);
    setUsername("");
    setInputUsername("");
    setBetAmount("");
    setBetPlaced(null);
    setHasBet(false);
    setWallet({ BTC: "0.0000000000", ETH: "0.0000000000" });
    setGameHistory([]);
    setTxHistory([]);
    setStats({ totalWins: 0, totalLosses: 0, biggestWin: 0, totalProfit: 0 });
    showNotification("info", "Logged out successfully");
  };

  const fetchGameHistory = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/game/history`);
      setGameHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch game history:", error);
    }
  };

  const fetchTxHistory = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/player/transactions/${username}`);
      setTxHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  };

  // ===== AUTH SCREEN =====
  if (!authenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="logo-icon">🎮</div>
            <h1>Crypto Crash</h1>
          </div>
          <p className="auth-subtitle">
            Real-time multiplayer crash game with provably fair gameplay
          </p>
          
          <form className="auth-form" onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enter username"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary">
              🔑 Login
            </button>
          </form>

          <div className="auth-divider">OR</div>

          <form className="auth-form" onSubmit={handleRegister}>
            <button type="submit" className="btn-secondary">
              🚀 Create Account
            </button>
          </form>

          <div className="auth-footer">
            <p>Test users: test, vikas, elon, satoshi, demo</p>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN GAME SCREEN =====
  return (
    <div className="app">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Top Bar */}
      <header className="top-bar">
        <div className="logo-section">
          <span className="logo-icon">🎮</span>
          <span className="logo-text">Crypto Crash</span>
        </div>

        <div className="top-bar-center">
          <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>

        <div className="top-bar-right">
          <div className="wallet-dropdown">
            <button 
              className="wallet-trigger"
              onClick={() => setShowWalletDropdown(!showWalletDropdown)}
            >
              <span className="wallet-icon">💰</span>
              <span className="wallet-preview">
                {wallet[betCurrency]} {betCurrency}
              </span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {showWalletDropdown && (
              <div className="wallet-dropdown-menu">
                <div className="wallet-item-dropdown">
                  <span className="currency-icon">₿</span>
                  <div>
                    <div className="currency-name">Bitcoin</div>
                    <div className="currency-balance">{wallet.BTC}</div>
                  </div>
                </div>
                <div className="wallet-item-dropdown">
                  <span className="currency-icon">Ξ</span>
                  <div>
                    <div className="currency-name">Ethereum</div>
                    <div className="currency-balance">{wallet.ETH}</div>
                  </div>
                </div>
                <div className="wallet-divider"></div>
                <div className="stats-mini">
                  <div>Wins: {stats.totalWins}</div>
                  <div>Losses: {stats.totalLosses}</div>
                  <div className={stats.totalProfit >= 0 ? 'profit' : 'loss'}>
                    P/L: ${stats.totalProfit.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="user-menu">
            <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
            <span className="username-text">{username}</span>
            <button onClick={handleLogout} className="btn-logout-mini">
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="game-screen">
        {/* Multiplier Display - Full Screen with Graph */}
        <div className={`game-canvas phase-${gamePhase}`}>
          <CrashGraph 
            multiplier={currentMultiplier}
            gamePhase={gamePhase}
            countdown={countdown}
            betPlaced={betPlaced}
          />

          {/* Game Status Overlay */}
          <div className="game-status-overlay">
            <div className="game-status-label">
              {gamePhase === "waiting" && "⏳ Waiting..."}
              {gamePhase === "betting" && "🎲 Betting Phase"}
              {gamePhase === "flying" && "🚀 Flying!"}
              {gamePhase === "crashed" && "💥 Crashed!"}
            </div>

            {activePlayers > 0 && gamePhase !== 'crashed' && (
              <div className="active-players-overlay">
                👥 {activePlayers} player{activePlayers !== 1 ? 's' : ''} in game
              </div>
            )}
          </div>

          {/* Betting Controls Overlay */}
          <div className="betting-overlay">
            {!hasBet ? (
              <div className="bet-controls">
                <div className="bet-input-section">
                  <div className="currency-selector">
                    <button
                      className={`currency-btn ${betCurrency === 'BTC' ? 'active' : ''}`}
                      onClick={() => setBetCurrency('BTC')}
                    >
                      ₿ BTC
                    </button>
                    <button
                      className={`currency-btn ${betCurrency === 'ETH' ? 'active' : ''}`}
                      onClick={() => setBetCurrency('ETH')}
                    >
                      Ξ ETH
                    </button>
                  </div>

                  <div className="quick-bet-buttons">
                    {QUICK_BETS.map(amount => (
                      <button
                        key={amount}
                        className="quick-bet-btn"
                        onClick={() => handlePlaceBet(amount)}
                        disabled={!isConnected || isPlacingBet}
                      >
                        <span>${amount}</span>
                      </button>
                    ))}
                  </div>

                  <div className="custom-bet-input">
                    <input
                      type="number"
                      placeholder="Custom amount"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      disabled={!isConnected || isPlacingBet}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handlePlaceBet();
                        }
                      }}
                    />
                    <button
                      className="btn-place-bet"
                      onClick={() => handlePlaceBet()}
                      disabled={!isConnected || isPlacingBet || !betAmount}
                    >
                      {isPlacingBet ? "⏳" : "🚀"} Place Bet
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="cashout-controls">
                <div className="active-bet-info">
                  <div className="bet-label">Your Bet</div>
                  <div className="bet-value">${betPlaced.amount} {betPlaced.currency}</div>
                </div>
                <button
                  className="btn-cashout-main"
                  onClick={handleCashout}
                  disabled={!canCashout}
                >
                  {canCashout 
                    ? `💰 CASH OUT ${currentMultiplier.toFixed(2)}x`
                    : "⏳ Waiting for flight..."}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom History Bar */}
        <div className="history-bar">
          <button
            className={`history-tab ${showGameHistory ? 'active' : ''}`}
            onClick={() => {
              setShowGameHistory(!showGameHistory);
              setShowTxHistory(false);
              if (!showGameHistory) fetchGameHistory();
            }}
          >
            🎮 Game History
          </button>
          <button
            className={`history-tab ${showTxHistory ? 'active' : ''}`}
            onClick={() => {
              setShowTxHistory(!showTxHistory);
              setShowGameHistory(false);
              if (!showTxHistory) fetchTxHistory();
            }}
          >
            📋 My Bets
          </button>
        </div>

        {(showGameHistory || showTxHistory) && (
          <div className="history-panel">
            {showGameHistory && (
              <div className="history-content-detailed">
                {gameHistory.length === 0 ? (
                  <p className="empty-msg">No history yet</p>
                ) : (
                  <div className="history-table">
                    <div className="history-table-header">
                      <div>Round ID</div>
                      <div>Crash Point</div>
                      <div>Players</div>
                      <div>Duration</div>
                      <div>Time</div>
                    </div>
                    {gameHistory.slice(0, 10).map((round, idx) => {
                      const duration = round.duration_ms 
                        ? (round.duration_ms / 1000).toFixed(1) + 's'
                        : 'N/A';
                      const crashColor = round.crash_point >= 2 
                        ? 'var(--accent-primary)' 
                        : round.crash_point >= 1.5 
                        ? 'var(--accent-warning)' 
                        : 'var(--accent-danger)';
                      
                      return (
                        <div key={round._id || idx} className="history-table-row">
                          <div className="round-id-cell">
                            <span className="round-badge">#{round.round_id?.slice(-6) || "Unknown"}</span>
                          </div>
                          <div className="crash-point-cell">
                            <span className="crash-value-large" style={{ color: crashColor }}>
                              {round.crash_point ? `${round.crash_point.toFixed(2)}x` : "N/A"}
                            </span>
                          </div>
                          <div className="players-cell">
                            <span className="player-count">
                              👥 {round.bets?.length || 0}
                            </span>
                          </div>
                          <div className="duration-cell">
                            <span className="duration-badge">{duration}</span>
                          </div>
                          <div className="time-cell">
                            {round.createdAt
                              ? new Date(round.createdAt).toLocaleTimeString()
                              : "Unknown"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {showTxHistory && (
              <div className="history-content-detailed">
                {txHistory.length === 0 ? (
                  <p className="empty-msg">No bets yet</p>
                ) : (
                  <div className="history-table">
                    <div className="history-table-header">
                      <div>Type</div>
                      <div>Amount</div>
                      <div>Currency</div>
                      <div>Crypto Amount</div>
                      <div>Price</div>
                      <div>Time</div>
                    </div>
                    {txHistory.slice(0, 10).map((tx, idx) => {
                      const isBet = tx.transaction_type === 'bet';
                      const profit = isBet ? null : tx.usd_amount;
                      
                      return (
                        <div key={tx._id || idx} className="history-table-row">
                          <div className="type-cell">
                            <span className={`type-badge ${isBet ? 'bet-badge' : 'win-badge'}`}>
                              {isBet ? '📤 BET' : '📥 WIN'}
                            </span>
                          </div>
                          <div className="amount-cell">
                            <span className={`amount-value ${isBet ? 'negative' : 'positive'}`}>
                              {isBet ? '-' : '+'}${Number(tx.usd_amount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="currency-cell">
                            <span className="currency-badge">
                              {tx.currency === 'BTC' ? '₿' : 'Ξ'} {tx.currency || "N/A"}
                            </span>
                          </div>
                          <div className="crypto-cell">
                            <span className="crypto-amount">
                              {Number(tx.crypto_amount || 0).toFixed(8)}
                            </span>
                          </div>
                          <div className="price-cell">
                            <span className="price-value">
                              ${Number(tx.price_at_time || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="time-cell">
                            {tx.createdAt
                              ? new Date(tx.createdAt).toLocaleString()
                              : "Unknown"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
