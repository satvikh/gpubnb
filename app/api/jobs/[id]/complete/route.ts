import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Job, Assignment, Provider, JobEvent } from "@/lib/models";
import { calculatePayout } from "@/lib/pricing";
import { assignNextJob } from "@/lib/scheduling";
import { recordCompletedJobLedger } from "@/lib/ledger";
import { requireProvider } from "@/lib/provider-auth";

const schema = z.object({
  providerId: z.string().min(1),
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
  const auth = await requireProvider(request, input.providerId);
  if (auth.response) return auth.response;

  const existingAssignment = await Assignment.findOne({
    jobId: id,
    providerId: input.providerId,
    status: "completed"
  });
  if (existingAssignment) {
    const existingJob = await Job.findById(id);
    if (!existingJob) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ job: serializeJob(existingJob) });
  }

  const assignment = await Assignment.findOneAndUpdate(
    { jobId: id, providerId: input.providerId, status: "running" },
    { $set: { status: "completed", completedAt: new Date() } },
    { new: true }
  );
  if (!assignment) {
    return NextResponse.json({ error: "No running job for provider" }, { status: 409 });
  }

  const job = await Job.findOne({ _id: id, status: "running" });
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

  await recordCompletedJobLedger({
    jobId: job._id,
    providerId: assignment.providerId,
    budgetCents: job.budgetCents,
    providerPayoutCents,
    platformFeeCents
  });

  await Provider.findByIdAndUpdate(assignment.providerId, {
    $set: { status: "online" },
  });

  await JobEvent.create({
    jobId: id,
    providerId: input.providerId,
    type: "completed",
    message: input.message ?? "Worker completed job",
  });

  // Try to assign any waiting jobs to the now-free provider
  await assignNextJob();

  return NextResponse.json({
    job: serializeJob(job),
  });
}

function serializeJob(job: typeof Job.prototype) {
  return {
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
  };
}
