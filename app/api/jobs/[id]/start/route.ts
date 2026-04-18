import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/mock-store";

const schema = z.object({
  providerId: z.string().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const input = schema.parse(await request.json().catch(() => ({})));
  const job = store.updateJob(id, "running", {
    providerId: input.providerId,
    message: "Worker started execution"
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job });
}
