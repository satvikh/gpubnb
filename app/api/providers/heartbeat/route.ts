import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/mock-store";

const schema = z.object({
  providerId: z.string().min(1)
});

export async function POST(request: Request) {
  // TODO: Validate provider token before accepting heartbeat updates.
  const input = schema.parse(await request.json());
  const provider = store.heartbeat(input.providerId);
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  return NextResponse.json({ provider });
}
