import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({
      ok: mongoose.connection.readyState === 1,
      service: "computebnb-web",
      database: mongoose.connection.readyState === 1 ? "connected" : "not_connected",
      at: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "computebnb-web",
        database: "error",
        error: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
