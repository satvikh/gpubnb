/**
 * Top up all consumer wallets from the Solana devnet master wallet.
 *
 * Run:
 *   npm run solana:consumers:fund
 *
 * Env:
 *   COMPUTEBNB_MASTER_WALLET_SECRET_KEY=...
 *   COMPUTEBNB_CONSUMER_DEMO_TARGET_SOL=1
 */
import process from "node:process";
import mongoose from "mongoose";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { loadLocalEnv } from "./env";
import Consumer from "../lib/models/Consumer";
import { getSolanaConnection, keypairFromSecretKey } from "../lib/solana";

loadLocalEnv();

function printHelp() {
  console.log(`Top up all consumer wallets from the Solana devnet master wallet.

Usage:
  npm run solana:consumers:fund

Env:
  COMPUTEBNB_MASTER_WALLET_SECRET_KEY  Required master wallet secret key.
  COMPUTEBNB_CONSUMER_DEMO_TARGET_SOL  Target balance per consumer. Defaults to 1.
  MONGODB_URI                          Required MongoDB connection string.
  MONGODB_DB_NAME                      Optional database name. Defaults to gpubnb.`);
}

function parseSolToLamports(value: string, name: string) {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,9}))?$/);
  if (!match) {
    throw new Error(`${name} must be a positive SOL decimal with up to 9 places`);
  }

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(9, "0"));
  const lamports = whole * BigInt(LAMPORTS_PER_SOL) + fraction;
  if (lamports <= BigInt(0)) {
    throw new Error(`${name} must be greater than zero`);
  }
  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${name} is too large`);
  }
  return Number(lamports);
}

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME ?? "gpubnb",
  });
}

async function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const masterSecret = process.env.COMPUTEBNB_MASTER_WALLET_SECRET_KEY;
  if (!masterSecret) {
    throw new Error(
      "COMPUTEBNB_MASTER_WALLET_SECRET_KEY is required. Run npm run solana:master:create -- --write-env first."
    );
  }

  const targetLamports = parseSolToLamports(
    process.env.COMPUTEBNB_CONSUMER_DEMO_TARGET_SOL ?? "1",
    "COMPUTEBNB_CONSUMER_DEMO_TARGET_SOL"
  );
  const connection = getSolanaConnection();
  const master = keypairFromSecretKey(masterSecret);

  await connectMongo();
  const consumers = await Consumer.find({ walletNetwork: "devnet" })
    .select("name email walletAddress")
    .sort({ createdAt: 1 });

  console.log(`Master wallet: ${master.publicKey.toBase58()}`);
  console.log(`Consumer target balance: ${targetLamports / LAMPORTS_PER_SOL} SOL`);
  console.log(`Found ${consumers.length} consumer wallet(s)`);

  let funded = 0;
  let skipped = 0;

  for (const consumer of consumers) {
    const to = new PublicKey(consumer.walletAddress);
    const balance = await connection.getBalance(to, "confirmed");
    const needed = targetLamports - balance;

    if (needed <= 0) {
      skipped += 1;
      console.log(`Skip ${consumer.name}: ${balance / LAMPORTS_PER_SOL} SOL`);
      continue;
    }

    const masterBalance = await connection.getBalance(master.publicKey, "confirmed");
    if (masterBalance <= needed + 5_000) {
      throw new Error(
        `Master wallet needs ${needed / LAMPORTS_PER_SOL} SOL plus fees, but only has ${masterBalance / LAMPORTS_PER_SOL} SOL`
      );
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: master.publicKey,
        toPubkey: to,
        lamports: needed,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [master], {
      commitment: "confirmed",
    });

    funded += 1;
    console.log(
      `Funded ${consumer.name}: +${needed / LAMPORTS_PER_SOL} SOL -> ${consumer.walletAddress}`
    );
    console.log(`Signature: ${signature}`);
  }

  console.log(`Done. Funded ${funded}, skipped ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
