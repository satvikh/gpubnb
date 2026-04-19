import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Job, Assignment, JobEvent } from "@/lib/models";
import { requireProvider } from "@/lib/provider-auth";

const schema = z.object({
  providerId: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const input = schema.parse(await request.json().catch(() => ({})));
  const auth = await requireProvider(request, input.providerId);
  if (auth.response) return auth.response;

  const assignment = await Assignment.findOneAndUpdate(
    { jobId: id, providerId: input.providerId, status: "assigned" },
    { $set: { status: "running", startedAt: new Date() } },
    { new: true }
  );
  if (!assignment) {
    return NextResponse.json({ error: "No assigned job for provider" }, { status: 409 });
  }

  const job = await Job.findOneAndUpdate(
    { _id: id, status: "assigned" },
    { $set: { status: "running" } },
    { new: true }
  );
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

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
