import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Job, Assignment, Provider, JobEvent } from "@/lib/models";
import { calculatePayout } from "@/lib/pricing";
import { assignNextJob } from "@/lib/scheduling";

const schema = z.object({
  providerId: z.string().optional(),
  result: z.string().min(1),
  message: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const input = schema.parse(await request.json());

  const job = await Job.findById(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Calculate payout
  const { providerPayoutCents, platformFeeCents } = calculatePayout(
    job.budgetCents
  );

  // Update job
  job.status = "completed";
  job.result = input.result;
  job.providerPayoutCents = providerPayoutCents;
  job.platformFeeCents = platformFeeCents;
  await job.save();

  // Update assignment
  const assignment = await Assignment.findOneAndUpdate(
    { jobId: id },
    { $set: { status: "completed", completedAt: new Date() } },
    { new: true }
  );

  // Free provider and credit earnings
  if (assignment) {
    await Provider.findByIdAndUpdate(assignment.providerId, {
      $set: { status: "online" },
      $inc: { totalEarnedCents: providerPayoutCents },
    });
  }

  await JobEvent.create({
    jobId: id,
    providerId: input.providerId || assignment?.providerId || undefined,
    type: "completed",
    message: input.message ?? "Worker completed job",
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
      result: job.result,
      budgetCents: job.budgetCents,
      providerPayoutCents: job.providerPayoutCents,
      platformFeeCents: job.platformFeeCents,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  });
}
