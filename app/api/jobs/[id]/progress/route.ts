import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Assignment, Job, JobEvent } from "@/lib/models";
import { requireProvider } from "@/lib/provider-auth";

const schema = z.object({
  providerId: z.string().min(1),
  message: z.string().default("Worker reported progress"),
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

  const assignment = await Assignment.findOne({
    jobId: id,
    providerId: input.providerId,
    status: "running"
  });
  if (!assignment) {
    return NextResponse.json({ error: "No running job for provider" }, { status: 409 });
  }

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
