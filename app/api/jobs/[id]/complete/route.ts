import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/mock-store";

const schema = z.object({
  providerId: z.string().optional(),
  result: z.string().min(1),
  message: z.string().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const input = schema.parse(await request.json());
  const job = store.updateJob(id, "completed", {
    providerId: input.providerId,
    result: input.result,
    message: input.message ?? "Worker completed job"
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job });
}
