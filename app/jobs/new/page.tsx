import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewJobPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Submit a job</h1>
      <p className="mt-2 text-muted-foreground">Create lightweight work for an available provider machine.</p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Job details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/api/jobs" method="post" className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Title
              <input name="title" defaultValue="Summarize customer notes" required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Type
              <select name="type" defaultValue="text_generation">
                <option value="text_generation">Text generation</option>
                <option value="image_caption">Image caption</option>
                <option value="embedding">Embedding</option>
                <option value="shell_demo">Shell demo</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Budget in cents
              <input name="budgetCents" type="number" min="100" defaultValue="500" required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Input
              <textarea name="input" rows={6} defaultValue="Turn this paragraph into three crisp bullets." required />
            </label>
            <Button type="submit">Queue job</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
