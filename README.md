# 🎯 Crypto Crash Game

> **Real-time multiplayer crash game with provably fair gameplay and cryptocurrency betting**

## ✨ Features

🎲 **Fair Algo** - Cryptographic hash-based crash point generation
💰 **Crypto Wallets** - BTC/ETH betting with real-time USD conversion
⚡ **Real-time Gameplay** - Live multiplier updates via Socket.IO
📊 **Live Prices** - CoinGecko API integration
📈 **Complete History** - Transaction and game round tracking

## 🚀 Quick Start

**New to the project?** See [SETUP.md](SETUP.md) for complete setup instructions.

**Test the game:** Use username `elon` on the [live demo](https://crypto-crash-game947.netlify.app/)

```bash
# Quick setup (requires MongoDB & CoinMarketCap API key)
git clone https://github.com/vikasmukhiya1999/crypto-crash-game.git
cd crypto-crash-game

# Configure environment (see SETUP.md for details)
cd server && cp .env.example .env
# Edit .env with your credentials
npm install && node seed/seed.js && npm run dev

# In another terminal
cd client && cp .env.example .env
npm install && npm run dev
```

**📖 Documentation:**
- [SETUP.md](SETUP.md) - Complete setup guide with troubleshooting
- [SECURITY.md](SECURITY.md) - Security best practices
- [QUICK_START.md](QUICK_START.md) - Quick reference guide

## ⚙️ Environment Setup

### Server Configuration

1. Copy the example environment file:
```bash
cd server
cp .env.example .env
```

2. Edit `server/.env` and add your credentials:
```bash
PORT=3000
MONGO_URI=your_mongodb_connection_string
API_KEY=your_coinmarketcap_api_key
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Get your credentials:**
- MongoDB: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- CoinMarketCap API: [coinmarketcap.com/api](https://coinmarketcap.com/api/) (free tier available)

### Client Configuration

1. Copy the example environment file:
```bash
cd client
cp .env.example .env
```

2. Edit `client/.env` if needed (defaults work for local development):
```bash
VITE_SOCKET_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000/api
```

## 🎮 How It Works

1. **Place Bet** - Choose BTC/ETH amount during betting phase
2. **Watch Multiplier** - Live multiplier increases in real-time
3. **Cash Out** - Click before crash to win (bet × multiplier)
4. **Crash** - Game ends randomly, uncashed bets lost

## 🛠️ Tech Stack

**Frontend:** React + Vite + Socket.IO Client
**Backend:** Node.js + Express + Socket.IO
**Database:** MongoDB
**APIs:** CoinMarketCap (crypto prices)

## 📚 Documentation

For detailed information checkout:

- [`client/README.md`](client/README.md) - Frontend implementation
- [`server/README.md`](server/README.md) - Backend API \& WebSocket docs

## 🔐 Fair Algorithm

Each round uses cryptographic hashing to ensure fairness:

- Random seed → SHA-256 hash → Crash multiplier
- Transparent, verifiable, impossible to manipulate

**🎯 Start playing:** [crypto-crash-game947.netlify.app](https://crypto-crash-game947.netlify.app/) |

**Test user:**
under username type `elon` and test the application
