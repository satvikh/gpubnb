import { NextResponse } from "next/server";
import { store } from "@/lib/mock-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = store.getJob(id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job, events: store.listEvents(id) });
}
