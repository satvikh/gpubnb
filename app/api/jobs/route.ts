import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Job, JobEvent } from "@/lib/models";
import { assignNextJob } from "@/lib/scheduling";

const schema = z.object({
  title: z.string().min(1),
  type: z.enum(["text_generation", "image_caption", "embedding", "shell_demo"]),
  input: z.string().min(1),
  budgetCents: z.coerce.number().int().positive().optional(),
});

export async function GET() {
  await dbConnect();
  const jobs = await Job.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j._id,
      title: j.title,
      type: j.type,
      status: j.status,
      input: j.input,
      result: j.result,
      error: j.error,
      budgetCents: j.budgetCents,
      providerPayoutCents: j.providerPayoutCents,
      platformFeeCents: j.platformFeeCents,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  await dbConnect();

  const contentType = request.headers.get("content-type") ?? "";
  const raw = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());

  const input = schema.parse(raw);

  const job = await Job.create({
    title: input.title,
    type: input.type,
    input: input.input,
    budgetCents: input.budgetCents ?? 500,
    status: "queued",
  });

  await JobEvent.create({
    jobId: job._id,
    type: "created",
    message: "Job queued from web app",
  });

  // Try to assign immediately
  await assignNextJob();

  if (contentType.includes("application/json")) {
    return NextResponse.json(
      {
        job: {
          id: job._id,
          title: job.title,
          type: job.type,
          status: job.status,
          input: job.input,
          budgetCents: job.budgetCents,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        },
      },
      { status: 201 }
    );
  }

  return NextResponse.redirect(
    new URL(`/jobs/${job._id}/results`, request.url),
    { status: 303 }
  );
}
