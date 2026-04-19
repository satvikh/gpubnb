import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Job, Machine } from "@/lib/models";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const machine = await Machine.findById(id);
    if (!machine) {
      return NextResponse.json({ ok: true, deleted: false });
    }

    await Job.deleteMany({ machineId: machine._id, status: "queued" });
    await machine.deleteOne();

    return NextResponse.json({ ok: true, deleted: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete machine" }, { status: 500 });
  }
}
