import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Consumer } from "@/lib/models";
import { getDbUnavailablePayload } from "@/lib/marketplace";

export async function GET() {
  try {
    await dbConnect();
    const consumers = await Consumer.find()
      .sort({ createdAt: -1 })
      .select("-walletSecretKey")
      .lean();

    return NextResponse.json({
      consumers: consumers.map((consumer) => ({
        id: String(consumer._id),
        name: consumer.name,
        email: consumer.email ?? null,
        walletAddress: consumer.walletAddress,
        walletNetwork: consumer.walletNetwork,
        initialAirdropSignature: consumer.initialAirdropSignature ?? null,
        totalSpentCents: consumer.totalSpentCents,
        createdAt: consumer.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("MONGODB_URI")) {
      return NextResponse.json(getDbUnavailablePayload(), { status: 503 });
    }
    return NextResponse.json({ error: "Failed to load consumers" }, { status: 500 });
  }
}
