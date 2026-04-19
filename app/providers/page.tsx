import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/status-pill";
import { centsToDollars } from "@/lib/utils";
import dbConnect from "@/lib/db";
import { Provider } from "@/lib/models";
import { markStaleProvidersOffline } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  await dbConnect();
  await markStaleProvidersOffline();
  const providers = await Provider.find().sort({ lastHeartbeatAt: -1 }).lean();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Providers</h1>
      <p className="mt-2 text-muted-foreground">Machines running the local GPUbnb CLI agent.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <Card key={String(provider._id)}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{provider.name}</CardTitle>
                <StatusPill status={provider.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Capabilities: {provider.capabilities.join(", ")}</p>
              <p>Rate: {centsToDollars(provider.hourlyRateCents)} / hour</p>
              <p>Earned: {centsToDollars(provider.totalEarnedCents)}</p>
              <p className="text-muted-foreground">
                Last heartbeat: {provider.lastHeartbeatAt?.toISOString() ?? "never"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
