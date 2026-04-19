import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { calculateSuccessRate, formatProvider, getDbUnavailablePayload } from "@/lib/marketplace";
import { Machine } from "@/lib/models";
import { createProviderToken, hashProviderToken } from "@/lib/provider-auth";
import { generateSolanaWallet } from "@/lib/solana";

const schema = z.object({
  name: z.string().min(1),
  capabilities: z.array(z.string()).optional(),
  hourlyRateCents: z.coerce.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const input = schema.parse(body);

    const token = createProviderToken();
    const tokenHash = hashProviderToken(token);
    const wallet = generateSolanaWallet();

    const machine = await Machine.create({
      name: input.name,
      capabilities: input.capabilities ?? ["python", "cpu"],
      hourlyRateCents: input.hourlyRateCents ?? 250,
      status: "online",
      lastHeartbeatAt: new Date(),
      successRate: calculateSuccessRate(0, 0),
      tokenHash,
      ...wallet
    });

    const payload = {
      ...formatProvider(machine),
      token
    };

    return NextResponse.json({
      provider: payload,
      machine: payload,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid machine payload", issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("MONGODB_URI")) {
      return NextResponse.json(getDbUnavailablePayload(), { status: 503 });
    }
    return NextResponse.json({ error: "Failed to register provider" }, { status: 500 });
  }
}
