import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import { Provider, Job } from "@/lib/models";
import { getAssignmentForProvider, assignNextJob } from "@/lib/scheduling";
import { requireProvider } from "@/lib/provider-auth";

const schema = z.object({
  providerId: z.string().min(1),
});

export async function POST(request: Request) {
  await dbConnect();
  const input = schema.parse(await request.json());
  const auth = await requireProvider(request, input.providerId);
  if (auth.response) return auth.response;

  // Heartbeat the provider
  const provider = await Provider.findByIdAndUpdate(
    input.providerId,
    { $set: { lastHeartbeatAt: new Date() } },
    { new: true }
  );
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  // Keep online unless busy
  if (provider.status !== "busy") {
    provider.status = "online";
    await provider.save();
  }

  // Check for existing active assignment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assignment: any = await getAssignmentForProvider(input.providerId);

  // If no active assignment, try to schedule one
  if (!assignment) {
    const newAssignment = await assignNextJob();
    if (newAssignment && newAssignment.providerId.toString() === input.providerId) {
      assignment = newAssignment;
    }
  }

  if (!assignment) {
    return NextResponse.json({ assignment: null, job: null });
  }

  const job = await Job.findById(assignment.jobId).lean();

  return NextResponse.json({
    assignment: {
      id: assignment._id,
      jobId: assignment.jobId,
      providerId: assignment.providerId,
      status: assignment.status,
      startedAt: assignment.startedAt,
      completedAt: assignment.completedAt,
      createdAt: assignment.createdAt,
    },
    job: job
      ? {
          id: job._id,
          title: job.title,
          type: job.type,
          status: job.status,
          input: job.input,
          requiredCapabilities: job.requiredCapabilities,
          runnerPayload: job.runnerPayload,
          budgetCents: job.budgetCents,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        }
      : null,
  });
}
