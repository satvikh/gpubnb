import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

export const SOLANA_NETWORK = "devnet" as const;
const SOLANA_CENTS_PER_SOL_RAW = process.env.COMPUTEBNB_SOLANA_CENTS_PER_SOL ?? "5000";
const RATE_SCALE = BigInt(1_000_000);

export const SOLANA_CENTS_PER_SOL = Number.parseFloat(SOLANA_CENTS_PER_SOL_RAW);

const DEVNET_AIRDROP_SOL = Number.parseFloat(
  process.env.COMPUTEBNB_DEVNET_CONSUMER_AIRDROP_SOL ?? "2"
);

export interface GeneratedSolanaWallet {
  walletAddress: string;
  walletSecretKey: string;
  walletNetwork: typeof SOLANA_NETWORK;
}

export function getSolanaConnection() {
  return new Connection(
    process.env.COMPUTEBNB_SOLANA_RPC_URL ?? clusterApiUrl(SOLANA_NETWORK),
    "confirmed"
  );
}

export function generateSolanaWallet(): GeneratedSolanaWallet {
  const keypair = Keypair.generate();
  return {
    walletAddress: keypair.publicKey.toBase58(),
    walletSecretKey: Buffer.from(keypair.secretKey).toString("base64"),
    walletNetwork: SOLANA_NETWORK,
  };
}

export function keypairFromSecretKey(secretKey: string) {
  return Keypair.fromSecretKey(Uint8Array.from(Buffer.from(secretKey, "base64")));
}

function parsePositiveDecimalToScaled(value: string, name: string) {
  const normalized = value.trim();
  const match = normalized.match(/^(\d+)(?:\.(\d{1,6}))?$/);
  if (!match) {
    throw new Error(`${name} must be a positive decimal with up to 6 decimal places`);
  }

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(6, "0"));
  const scaled = whole * RATE_SCALE + fraction;
  if (scaled <= BigInt(0)) {
    throw new Error(`${name} must be greater than zero`);
  }

  return scaled;
}

function divideAndRound(numerator: bigint, denominator: bigint) {
  return (numerator + denominator / BigInt(2)) / denominator;
}

export function centsToLamportsAtRate(cents: number, centsPerSol: number | string) {
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new Error("cents must be a positive integer");
  }

  const scaledRate = parsePositiveDecimalToScaled(
    String(centsPerSol),
    "COMPUTEBNB_SOLANA_CENTS_PER_SOL"
  );
  const numerator = BigInt(cents) * BigInt(LAMPORTS_PER_SOL) * RATE_SCALE;
  const lamports = divideAndRound(numerator, scaledRate);

  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("lamports exceeds JavaScript's safe integer range");
  }

  return Math.max(1, Number(lamports));
}

export function centsToLamports(cents: number) {
  return centsToLamportsAtRate(cents, SOLANA_CENTS_PER_SOL_RAW);
}

export async function requestInitialConsumerAirdrop(walletAddress: string) {
  if (!Number.isFinite(DEVNET_AIRDROP_SOL) || DEVNET_AIRDROP_SOL <= 0) {
    return undefined;
  }

  const connection = getSolanaConnection();
  const signature = await connection.requestAirdrop(
    new PublicKey(walletAddress),
    Math.round(DEVNET_AIRDROP_SOL * LAMPORTS_PER_SOL)
  );
  const blockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...blockhash }, "confirmed");
  return signature;
}

export async function transferDevnetSol(input: {
  fromSecretKey: string;
  toWalletAddress: string;
  lamports: number;
}) {
  const from = keypairFromSecretKey(input.fromSecretKey);
  const to = new PublicKey(input.toWalletAddress);
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports: input.lamports,
    })
  );

  return sendAndConfirmTransaction(getSolanaConnection(), transaction, [from], {
    commitment: "confirmed",
  });
}
