import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Provider } from "@/lib/models";
import { requireProvider } from "@/lib/provider-auth";

const schema = z.object({
  providerId: z.string().min(1),
});

export async function POST(request: Request) {
  await dbConnect();
  const input = schema.parse(await request.json());
  const auth = await requireProvider(request, input.providerId);
  if (auth.response) return auth.response;

  const provider = await Provider.findByIdAndUpdate(
    input.providerId,
    {
      $set: { lastHeartbeatAt: new Date() },
      // Keep "busy" if already busy, otherwise set to "online"
    },
    { new: true }
  );

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  // Only flip to online if not currently busy
  if (provider.status !== "busy") {
    provider.status = "online";
    await provider.save();
  }

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
    },
  });
}
