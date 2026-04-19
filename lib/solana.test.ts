import assert from "node:assert/strict";
import test from "node:test";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  SOLANA_CENTS_PER_SOL,
  centsToLamports,
  centsToLamportsAtRate,
  generateSolanaWallet,
} from "./solana";

test("centsToLamports uses the fixed configured conversion rate", () => {
  assert.equal(centsToLamports(SOLANA_CENTS_PER_SOL), LAMPORTS_PER_SOL);
});

test("centsToLamportsAtRate keeps decimal fixed rates precise", () => {
  assert.equal(centsToLamportsAtRate(12_345, "12345"), LAMPORTS_PER_SOL);
  assert.equal(centsToLamportsAtRate(6_172, "12345"), 499_959_498);
  assert.equal(centsToLamportsAtRate(100, "12345.67"), 8_100_006);
});

test("centsToLamportsAtRate rejects ambiguous rates", () => {
  assert.throws(() => centsToLamportsAtRate(100, "123.1234567"));
  assert.throws(() => centsToLamportsAtRate(100, "0"));
  assert.throws(() => centsToLamportsAtRate(1.5, "5000"));
});

test("generateSolanaWallet returns a devnet wallet payload", () => {
  const wallet = generateSolanaWallet();
  assert.equal(wallet.walletNetwork, "devnet");
  assert.ok(wallet.walletAddress.length > 30);
  assert.ok(wallet.walletSecretKey.length > 80);
});
