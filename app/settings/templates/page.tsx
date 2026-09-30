import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { getTemplates } from "@/lib/data";

export default async function TemplatesSettingsPage() {
  const templates = await getTemplates();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-violet-600">Templates</p>
          <h1 className="text-3xl font-bold tracking-tight">Message Templates</h1>
        </div>
        <Button>New Template</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>{template.type}</TableCell>
                    <TableCell>{template.channel}</TableCell>
                    <TableCell className="space-x-3">
                      <button className="text-violet-700">Edit</button>
                      <button className="text-red-600">Delete</button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Live preview</h2>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            Hi Alicia! 👋✨
            <br />
            We love your content and would like to invite you to collaborate with Vesure Enterprise!
          </div>
        </Card>
      </div>
    </div>
  );
}
