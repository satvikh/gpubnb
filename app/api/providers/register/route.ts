import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Provider } from "@/lib/models";
import { createProviderToken, hashProviderToken } from "@/lib/provider-auth";

const schema = z.object({
  name: z.string().min(1),
  capabilities: z.array(z.string()).optional(),
  hourlyRateCents: z.coerce.number().int().positive().optional(),
});

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();
  const input = schema.parse(body);

  // Generate a plain-text token to return once, store a hash
  const token = createProviderToken();
  const tokenHash = hashProviderToken(token);

  const provider = await Provider.create({
    name: input.name,
    capabilities: input.capabilities ?? ["cpu", "node"],
    hourlyRateCents: input.hourlyRateCents ?? 250,
    status: "online",
    lastHeartbeatAt: new Date(),
    tokenHash,
  });

  // Return the plain token only on registration so the worker can store it
  return NextResponse.json({
    provider: {
      id: provider._id,
      name: provider.name,
      status: provider.status,
      capabilities: provider.capabilities,
      hourlyRateCents: provider.hourlyRateCents,
      totalEarnedCents: provider.totalEarnedCents,
      lastHeartbeatAt: provider.lastHeartbeatAt,
      createdAt: provider.createdAt,
      token, // only exposed here
    },
  });
}
