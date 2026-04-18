import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Job, Assignment, Provider, JobEvent } from "@/lib/models";
import { assignNextJob } from "@/lib/scheduling";

const schema = z.object({
  providerId: z.string().optional(),
  error: z.string().min(1),
  message: z.string().optional(),
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
    { $set: { status: "failed", error: input.error } },
    { new: true }
  );
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Update assignment
  const assignment = await Assignment.findOneAndUpdate(
    { jobId: id },
    { $set: { status: "failed", completedAt: new Date() } },
    { new: true }
  );

  // Free the provider
  if (assignment) {
    await Provider.findByIdAndUpdate(assignment.providerId, {
      $set: { status: "online" },
    });
  }

  await JobEvent.create({
    jobId: id,
    providerId: input.providerId || assignment?.providerId || undefined,
    type: "failed",
    message: input.message ?? "Worker failed job",
  });

  // Try to assign any waiting jobs to the now-free provider
  await assignNextJob();

  return NextResponse.json({
    job: {
      id: job._id,
      title: job.title,
      type: job.type,
      status: job.status,
      input: job.input,
      error: job.error,
      budgetCents: job.budgetCents,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  });
}
