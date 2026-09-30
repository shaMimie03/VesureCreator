import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { getCreators } from "@/lib/data";
import { formatNumber, toMytDate } from "@/lib/utils";

export default async function CreatorsPage() {
  const creators = await getCreators();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Creator CRM</p>
          <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
        </div>
        <Link href="/creators/new">
          <Button>Add Creator</Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
            <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option>All</option>
              <option>Not Contacted</option>
              <option>Invited</option>
              <option>Replied</option>
              <option>Active</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
            <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option>All</option>
              <option>Health</option>
              <option>Beauty</option>
              <option>Fashion</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">PIC</label>
            <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option>All</option>
              <option>Nadia</option>
              <option>Yasmin</option>
              <option>Aisha</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
            <input placeholder="Name or handle" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </thead>
            <tbody>
              {creators.map((creator) => (
                <TableRow key={creator.id}>
                  <TableCell>
                    <Link href={`/creators/${creator.id}`} className="font-medium text-slate-900 hover:text-violet-700">
                      {creator.creator_name}
                    </Link>
                  </TableCell>
                  <TableCell>{creator.tiktok_handle}</TableCell>
                  <TableCell>{creator.category}</TableCell>
                  <TableCell>{formatNumber(creator.follower_count)}</TableCell>
                  <TableCell>
                    <Badge className="bg-violet-50 text-violet-700">{creator.status}</Badge>
                  </TableCell>
                  <TableCell>{creator.pic}</TableCell>
                  <TableCell>{toMytDate(creator.last_contact_at)}</TableCell>
                  <TableCell className="space-x-2">
                    <Link href={`/creators/${creator.id}`} className="text-sm text-violet-700">
                      View
                    </Link>
                    <button className="text-sm text-slate-600">Assign</button>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
