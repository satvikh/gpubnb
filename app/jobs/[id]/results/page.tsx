import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/status-pill";
import { centsToDollars } from "@/lib/utils";
import { store } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = store.getJob(id);
  if (!job) notFound();
  const events = store.listEvents(job.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <p className="mt-2 text-muted-foreground">{job.id}</p>
        </div>
        <StatusPill status={job.status} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{job.input}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {job.result ?? job.error ?? "Waiting for the worker agent to finish this job."}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-3">
          <p>Budget: {centsToDollars(job.budgetCents)}</p>
          <p>Provider payout: {centsToDollars(job.providerPayoutCents ?? 0)}</p>
          <p>Platform fee: {centsToDollars(job.platformFeeCents ?? 0)}</p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {events.map((event) => (
            <div key={event.id} className="border-b pb-3 last:border-0 last:pb-0">
              <p className="font-medium">{event.type}: {event.message}</p>
              <p className="text-muted-foreground">{event.createdAt}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
