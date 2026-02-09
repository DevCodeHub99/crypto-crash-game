// Socket handler for real-time crash game events
import { Player } from "../models/player.model.js";
import { GameRound } from "../models/game.model.js";
import { Transaction } from "../models/transaction.model.js";
import { getCryptoPrice } from "../services/price.service.js";

// Global references for socket communication
let ioRef = null;              // Socket.IO instance reference
let currentMultiplier = 1;     // Live multiplier from game engine

export const socketHandler = (socket, io) => {
  ioRef = io;                  // Store io reference for broadcasting

  console.log("📡 New client connected:", socket.id);

  // Handle bet placement via socket (real-time)
  socket.on("place_bet", async ({ username, usd_amount, currency }) => {
    try {
      // Validate currency
      if (!["BTC", "ETH"].includes(currency)) {
        return socket.emit("bet_error", { msg: "Unsupported currency" });
      }

      // Find player
      const player = await Player.findOne({ username });
      if (!player) {
        return socket.emit("bet_error", { msg: "Player not found" });
      }

      // Get active round
      const round = await GameRound.findOne({ is_active: true }).sort({ createdAt: -1 });
      if (!round) {
        return socket.emit("bet_error", { msg: "No active round available" });
      }

      // Check if player already has a bet
      const existingBet = round.bets.some(
        (b) => b.player.toString() === player._id.toString()
      );
      if (existingBet) {
        return socket.emit("bet_error", { msg: "You already have a bet in this round" });
      }

      // Get crypto prices
      const prices = await getCryptoPrice(["bitcoin", "ethereum"]);
      const price = currency === "BTC" ? prices.bitcoin.usd : prices.ethereum.usd;

      // Validate and convert
      const cleanUsdAmount = parseFloat(usd_amount);
      if (!price || isNaN(cleanUsdAmount) || cleanUsdAmount <= 0) {
        return socket.emit("bet_error", { msg: "Invalid bet amount or crypto price" });
      }

      const cryptoAmount = parseFloat((cleanUsdAmount / price).toFixed(8));
      if (!cryptoAmount || isNaN(cryptoAmount)) {
        return socket.emit("bet_error", { msg: "Invalid crypto conversion" });
      }

      // Check balance
      const wallet = player.wallets.find((w) => w.currency === currency);
      if (!wallet || wallet.balance < cryptoAmount) {
        return socket.emit("bet_error", { msg: "Insufficient balance" });
      }

      // Deduct from wallet
      wallet.balance = parseFloat((wallet.balance - cryptoAmount).toFixed(8));
      await player.save();

      // Add bet to round
      round.bets.push({
        player: player._id,
        usd_amount: cleanUsdAmount,
        crypto_amount: cryptoAmount,
        currency,
        status: "active",
      });
      await round.save();

      // Record transaction
      await Transaction.create({
        player: player._id,
        usd_amount: cleanUsdAmount,
        crypto_amount: cryptoAmount,
        currency,
        transaction_type: "bet",
        transaction_hash: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        price_at_time: price,
      });

      // Emit success to the player
      socket.emit("bet_placed", {
        username,
        usd_amount: cleanUsdAmount,
        crypto_amount: cryptoAmount,
        currency,
        round_id: round.round_id,
      });

      // Broadcast to all clients that a bet was placed
      io.emit("player_bet", {
        username,
        usd_amount: cleanUsdAmount,
        currency,
        round_id: round.round_id,
      });

      console.log(`✅ Bet placed: ${username} - $${cleanUsdAmount} in ${currency}`);
    } catch (err) {
      console.error("❌ Bet Error:", err);
      socket.emit("bet_error", { msg: "Bet placement failed", error: err.message });
    }
  });

  // Handle player cashout requests
  socket.on("cashout", async ({ username }) => {
    try {
      // Find player in database
      const player = await Player.findOne({ username });
      if (!player) return socket.emit("error", { msg: "Player not found" });

      // Get current active game round
      const round = await GameRound.findOne({ is_active: true }).sort({
        createdAt: -1,
      });
      if (!round) return socket.emit("error", { msg: "No active round" });

      // Find player's active bet in current round
      const bet = round.bets.find(
        (b) =>
          b.player.toString() === player._id.toString() && b.status === "active"
      );

      if (!bet)
        return socket.emit("error", { msg: "No active bet to cash out" });

      // Calculate payout amounts
      const payoutCrypto = parseFloat(
        (bet.crypto_amount * currentMultiplier).toFixed(8)
      );
      const priceAtTime = bet.usd_amount / bet.crypto_amount; // Original crypto price
      const usdPayout = parseFloat((payoutCrypto * priceAtTime).toFixed(2));

      // Update player's wallet balance
      const wallet = player.wallets.find((w) => w.currency === bet.currency);
      wallet.balance += payoutCrypto;

      // Mark bet as cashed out
      bet.status = "cashed_out";
      bet.multiplier_at_cashout = currentMultiplier;

      // Save changes to database
      await player.save();
      await round.save();

      // Record transaction for audit trail
      await Transaction.create({
        player: player._id,
        usd_amount: usdPayout,
        crypto_amount: payoutCrypto,
        currency: bet.currency,
        transaction_type: "cashout",
        transaction_hash: `tx_${Date.now()}_${Math.floor(
          Math.random() * 1000
        )}`,
        price_at_time: priceAtTime,
      });

      // Broadcast cashout to all connected clients
      io.emit("player_cashout", {
        username,
        currency: bet.currency,
        payoutCrypto,
        usd_equivalent: usdPayout,
        multiplier: currentMultiplier,
      });

      console.log(`💰 Cashout: ${username} - ${payoutCrypto} ${bet.currency} ($${usdPayout})`);
    } catch (err) {
      console.error("❌ Cashout Error:", err);
      socket.emit("error", { msg: "Cashout failed", error: err.message });
    }
  });
};

// Update multiplier from game engine
export const setLiveMultiplier = (m) => {
  currentMultiplier = m;
};

// Broadcast game events to all clients
export const broadcastGameEvent = (event, payload) => {
  if (ioRef) {
    ioRef.emit(event, payload);
  }
};
