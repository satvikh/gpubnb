import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/mock-store";

const schema = z.object({
  providerId: z.string().min(1)
});

export async function POST(request: Request) {
  // TODO: Enforce one active assignment per provider in MongoDB with an atomic update.
  const input = schema.parse(await request.json());
  store.heartbeat(input.providerId);
  const assignment = store.getAssignmentForProvider(input.providerId) ?? store.assignNextJob();
  if (!assignment || assignment.providerId !== input.providerId) {
    return NextResponse.json({ assignment: null, job: null });
  }

  return NextResponse.json({
    assignment,
    job: store.getJob(assignment.jobId)
  });
}
