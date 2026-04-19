/**
 * Create a Solana devnet master wallet for demo funding.
 *
 * Run:
 *   npm run solana:master:create
 *
 * Optional:
 *   COMPUTEBNB_MASTER_AIRDROP_SOL=5 npm run solana:master:create -- --write-env
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { loadLocalEnv } from "./env";
import { generateSolanaWallet, getSolanaConnection } from "../lib/solana";

loadLocalEnv();

function shouldWriteEnv() {
  return process.argv.includes("--write-env");
}

function shouldSkipAirdrop() {
  return process.argv.includes("--no-airdrop");
}

function printHelp() {
  console.log(`Create a Solana devnet master wallet for demo funding.

Usage:
  npm run solana:master:create
  npm run solana:master:create -- --write-env
  npm run solana:master:create -- --no-airdrop

Options:
  --write-env    Save COMPUTEBNB_MASTER_WALLET_SECRET_KEY and address to .env.local.
  --no-airdrop   Create the wallet without requesting a devnet airdrop.
  --help         Show this help.

Env:
  COMPUTEBNB_MASTER_AIRDROP_SOL  Devnet SOL to request. Defaults to 5.`);
}

function updateEnvLocal(secretKey: string, walletAddress: string) {
  const path = ".env.local";
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = existing
    .split(/\r?\n/)
    .filter(
      (line) =>
        !line.startsWith("COMPUTEBNB_MASTER_WALLET_SECRET_KEY=") &&
        !line.startsWith("COMPUTEBNB_MASTER_WALLET_ADDRESS=")
    )
    .filter((line, index, all) => line || index < all.length - 1);

  lines.push(`COMPUTEBNB_MASTER_WALLET_SECRET_KEY=${secretKey}`);
  lines.push(`COMPUTEBNB_MASTER_WALLET_ADDRESS=${walletAddress}`);
  writeFileSync(path, `${lines.join("\n")}\n`);
}

async function maybeAirdrop(walletAddress: string) {
  const amountSol = Number.parseFloat(process.env.COMPUTEBNB_MASTER_AIRDROP_SOL ?? "5");
  if (!Number.isFinite(amountSol) || amountSol <= 0) {
    return undefined;
  }

  const connection = getSolanaConnection();
  const signature = await connection.requestAirdrop(
    new PublicKey(walletAddress),
    Math.round(amountSol * LAMPORTS_PER_SOL)
  );
  const blockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...blockhash }, "confirmed");
  return { amountSol, signature };
}

async function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const wallet = generateSolanaWallet();

  console.log("Created Solana devnet master wallet:");
  console.log(`Address: ${wallet.walletAddress}`);
  console.log(`Secret env: COMPUTEBNB_MASTER_WALLET_SECRET_KEY=${wallet.walletSecretKey}`);
  console.log(`Address env: COMPUTEBNB_MASTER_WALLET_ADDRESS=${wallet.walletAddress}`);

  if (shouldWriteEnv()) {
    updateEnvLocal(wallet.walletSecretKey, wallet.walletAddress);
    console.log("Wrote master wallet values to .env.local");
  }

  if (!shouldSkipAirdrop()) {
    try {
      const airdrop = await maybeAirdrop(wallet.walletAddress);
      if (airdrop) {
        console.log(`Airdropped ${airdrop.amountSol} devnet SOL`);
        console.log(`Airdrop signature: ${airdrop.signature}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.warn(`Devnet airdrop failed: ${message}`);
      console.warn("The wallet was still created. You can fund it later and reuse the env secret.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
