import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job, JobEvent } from "@/lib/models";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;

  const job = await Job.findById(id).lean();
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const events = await JobEvent.find({ jobId: id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    job: {
      id: job._id,
      title: job.title,
      type: job.type,
      status: job.status,
      input: job.input,
      result: job.result,
      error: job.error,
      budgetCents: job.budgetCents,
      providerPayoutCents: job.providerPayoutCents,
      platformFeeCents: job.platformFeeCents,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
    events: events.map((e) => ({
      id: e._id,
      jobId: e.jobId,
      providerId: e.providerId,
      type: e.type,
      message: e.message,
      createdAt: e.createdAt,
    })),
  });
}
