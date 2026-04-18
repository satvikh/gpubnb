import Link from "next/link";
import { ArrowRight, Laptop, ReceiptText, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main>
      <section className="bg-[linear-gradient(120deg,#f8fafc_0%,#ecfdf5_52%,#fef3c7_100%)]">
        <div className="mx-auto grid min-h-[78vh] max-w-6xl content-center gap-8 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-800">
              Marketplace control plane for local compute
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Run lightweight AI jobs on spare laptops and desktops.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              GPUbnb lets users submit jobs through a web app while provider machines run a tiny CLI agent that polls, executes, and reports results.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/jobs/new">
                  Submit a job <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/providers">See providers</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-lg border bg-background/80 p-5 shadow-sm">
            <pre className="overflow-x-auto text-sm leading-7">
{`$ npm run worker
registered: Local Dev Machine
heartbeat: online
poll: assigned job_42
execute: shell_demo
progress: 50%
complete: payout $4.00`}
            </pre>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3">
        {[
          { icon: Laptop, title: "Provider agent", body: "A Node CLI registers a machine, heartbeats, polls for jobs, and executes one job at a time." },
          { icon: Terminal, title: "Simple scheduler", body: "The MVP assigns queued work to an online provider with readable mock logic." },
          { icon: ReceiptText, title: "Mock ledger", body: "Completed jobs split budget into 80% provider payout and 20% platform fee." }
        ].map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <item.icon className="h-5 w-5 text-emerald-700" />
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
