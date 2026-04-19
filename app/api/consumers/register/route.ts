import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Consumer } from "@/lib/models";
import {
  generateSolanaWallet,
  requestInitialConsumerAirdrop,
} from "@/lib/solana";
import { getDbUnavailablePayload } from "@/lib/marketplace";

const schema = z.object({
  name: z.string().min(1).default("Consumer"),
  email: z.string().email().optional(),
});

function formatConsumer(consumer: {
  _id: unknown;
  name: string;
  email?: string | null;
  walletAddress: string;
  walletNetwork: string;
  initialAirdropSignature?: string | null;
  totalSpentCents: number;
  createdAt?: Date | null;
}) {
  return {
    id: String(consumer._id),
    name: consumer.name,
    email: consumer.email ?? null,
    walletAddress: consumer.walletAddress,
    walletNetwork: consumer.walletNetwork,
    initialAirdropSignature: consumer.initialAirdropSignature ?? null,
    totalSpentCents: consumer.totalSpentCents,
    createdAt: consumer.createdAt ?? null,
  };
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const input = schema.parse(await request.json());
    const wallet = generateSolanaWallet();

    let initialAirdropSignature: string | undefined;
    try {
      initialAirdropSignature = await requestInitialConsumerAirdrop(wallet.walletAddress);
    } catch (error) {
      console.warn("Devnet consumer airdrop failed", error);
    }

    const consumer = await Consumer.create({
      ...input,
      ...wallet,
      initialAirdropSignature,
    });

    return NextResponse.json({ consumer: formatConsumer(consumer) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid consumer payload", issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("MONGODB_URI")) {
      return NextResponse.json(getDbUnavailablePayload(), { status: 503 });
    }
    return NextResponse.json({ error: "Failed to register consumer" }, { status: 500 });
  }
}
