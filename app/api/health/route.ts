import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Provider, Job } from "@/lib/models";

export async function GET() {
  try {
    await dbConnect();

    const [providerCount, jobCount] = await Promise.all([
      Provider.countDocuments(),
      Job.countDocuments(),
    ]);

    return NextResponse.json({
      status: "ok",
      db: "connected",
      providerCount,
      jobCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { status: "error", db: "disconnected", error: message },
      { status: 503 }
    );
  }
}
