import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Job, Assignment, JobEvent } from "@/lib/models";

const schema = z.object({
  providerId: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const input = schema.parse(await request.json().catch(() => ({})));

  const job = await Job.findByIdAndUpdate(
    id,
    { $set: { status: "running" } },
    { new: true }
  );
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Update the assignment's startedAt and status
  await Assignment.findOneAndUpdate(
    { jobId: id, status: "assigned" },
    { $set: { status: "running", startedAt: new Date() } }
  );

  await JobEvent.create({
    jobId: id,
    providerId: input.providerId || undefined,
    type: "started",
    message: "Worker started execution",
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
