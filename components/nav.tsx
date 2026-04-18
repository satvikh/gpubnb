import Link from "next/link";
import { Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Nav() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Cpu className="h-5 w-5" />
          GPUbnb
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Button asChild variant="ghost">
            <Link href="/providers">Providers</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/jobs">Jobs</Link>
          </Button>
          <Button asChild>
            <Link href="/jobs/new">Submit job</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
