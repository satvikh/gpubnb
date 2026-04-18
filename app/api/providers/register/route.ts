import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/mock-store";

const schema = z.object({
  name: z.string().min(1),
  capabilities: z.array(z.string()).optional(),
  hourlyRateCents: z.coerce.number().int().positive().optional()
});

export async function POST(request: Request) {
  // TODO: Persist provider registration in MongoDB Atlas and store a hashed provider token.
  const body = await request.json();
  const input = schema.parse(body);
  const provider = store.registerProvider(input);
  return NextResponse.json({ provider });
}
