import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Job, JobEvent } from "@/lib/models";

const schema = z.object({
  providerId: z.string().optional(),
  message: z.string().default("Worker reported progress"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const input = schema.parse(await request.json());

  const job = await Job.findByIdAndUpdate(
    id,
    { $set: { status: "running" } },
    { new: true }
  );
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await JobEvent.create({
    jobId: id,
    providerId: input.providerId || undefined,
    type: "progress",
    message: input.message,
  });

  return NextResponse.json({
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
  });
}
