import mongoose from "mongoose";
import dotenv from "dotenv";
import { Player } from "../models/player.model.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const seedPlayers = async () => {
  await Player.deleteMany({});

  const players = [
    {
      username: "test",
      wallets: [
        { currency: "BTC", balance: 0.1 },      // ~$10,000 worth
        { currency: "ETH", balance: 5 },        // ~$15,000 worth
      ],
    },
    {
      username: "vikas",
      wallets: [
        { currency: "BTC", balance: 0.05 },     // ~$5,000 worth
        { currency: "ETH", balance: 2 },        // ~$6,000 worth
      ],
    },
    {
      username: "elon",
      wallets: [
        { currency: "BTC", balance: 0.02 },     // ~$2,000 worth
        { currency: "ETH", balance: 1 },        // ~$3,000 worth
      ],
    },
    {
      username: "satoshi",
      wallets: [
        { currency: "BTC", balance: 1 },        // ~$100,000 worth
        { currency: "ETH", balance: 10 },       // ~$30,000 worth
      ],
    },
    {
      username: "demo",
      wallets: [
        { currency: "BTC", balance: 0.001 },    // ~$100 worth
        { currency: "ETH", balance: 0.05 },     // ~$150 worth
      ],
    },
  ];

  await Player.insertMany(players);
  console.log("✅ Sample players created with wallet balances:");
  console.log("   - test: 0.1 BTC, 5 ETH");
  console.log("   - vikas: 0.05 BTC, 2 ETH");
  console.log("   - elon: 0.02 BTC, 1 ETH");
  console.log("   - satoshi: 1 BTC, 10 ETH");
  console.log("   - demo: 0.001 BTC, 0.05 ETH");
  console.log("\n🎮 You can now login with any of these usernames!");
  process.exit();
};

seedPlayers();
