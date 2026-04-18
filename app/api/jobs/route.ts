import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/mock-store";

const schema = z.object({
  title: z.string().min(1),
  type: z.enum(["text_generation", "image_caption", "embedding", "shell_demo"]),
  input: z.string().min(1),
  budgetCents: z.coerce.number().int().positive().optional()
});

export async function GET() {
  return NextResponse.json({ jobs: store.listJobs() });
}

export async function POST(request: Request) {
  // TODO: Persist job input in MongoDB Atlas and move large payloads to object storage.
  const contentType = request.headers.get("content-type") ?? "";
  const raw = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const input = schema.parse(raw);
  const job = store.createJob(input);

  if (contentType.includes("application/json")) {
    return NextResponse.json({ job }, { status: 201 });
  }

  return NextResponse.redirect(new URL(`/jobs/${job.id}/results`, request.url), { status: 303 });
}
