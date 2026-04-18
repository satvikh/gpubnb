import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/mock-store";

const schema = z.object({
  providerId: z.string().optional(),
  message: z.string().default("Worker reported progress")
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const input = schema.parse(await request.json());
  const job = store.getJob(id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  store.reportProgress(id, input);
  return NextResponse.json({ job: store.getJob(id) });
}
