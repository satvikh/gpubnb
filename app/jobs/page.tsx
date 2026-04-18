import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { centsToDollars } from "@/lib/utils";
import { store } from "@/lib/mock-store";

export const dynamic = "force-dynamic";

export default function JobsPage() {
  const jobs = store.listJobs();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="mt-2 text-muted-foreground">Queued, assigned, running, and completed work.</p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">Submit job</Link>
        </Button>
      </div>
      <div className="mt-6 grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{job.title}</CardTitle>
                <StatusPill status={job.status} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p>Type: {job.type}</p>
                <p>Budget: {centsToDollars(job.budgetCents)}</p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/jobs/${job.id}/results`}>View results</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
