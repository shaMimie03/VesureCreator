"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { bulkUpdateCreators, type CreatorActionState } from "@/lib/actions/creators";
import { CREATOR_STATUSES } from "@/lib/creators/constants";
import { formatNumber, toMytDate } from "@/lib/utils";
import type { Creator } from "@/types/db";

const initialState: CreatorActionState = {};

export function CreatorListTable({ creators }: { creators: Creator[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [state, action, pending] = useActionState(bulkUpdateCreators, initialState);

  const allSelected = creators.length > 0 && creators.every((creator) => selectedIds.includes(creator.id));

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? creators.map((creator) => creator.id) : []);
  }

  function toggleCreator(id: string, checked: boolean) {
    setSelectedIds((current) => checked ? [...new Set([...current, id])] : current.filter((selected) => selected !== id));
  }

  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label htmlFor="bulk-mode" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Bulk action</label>
          <select id="bulk-mode" name="mode" className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <option value="status">Change status</option>
            <option value="pic">Assign PIC</option>
          </select>
        </div>
        <div>
          <label htmlFor="bulk-status" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">New status</label>
          <select id="bulk-status" name="status" defaultValue="Not Contacted" className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            {CREATOR_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bulk-pic" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">PIC (blank clears assignment)</label>
          <input id="bulk-pic" name="pic" maxLength={100} placeholder="PIC name" className="rounded-lg border border-slate-200 bg-white px-3 py-2" />
        </div>
        <Button type="submit" disabled={pending || selectedIds.length === 0}>
          {pending ? "Updating…" : `Apply to ${selectedIds.length || "selected"}`}
        </Button>
        {selectedIds.length > 0 && (
          <button type="button" onClick={() => setSelectedIds([])} className="px-2 py-2 text-sm text-slate-600 hover:text-slate-900">Clear selection</button>
        )}
        <span className="ml-auto text-xs text-slate-500">Select up to 50 creators on this page.</span>
      </div>
      {state.error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{state.error}</p>}
      {state.success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{state.success}</p>}

      <div className="overflow-x-auto">
        <Table>
          <thead>
            <TableRow>
              <TableHead>
                <input type="checkbox" aria-label="Select all creators on this page" checked={allSelected} onChange={(event) => toggleAll(event.target.checked)} />
              </TableHead>
              <TableHead>Name</TableHead><TableHead>Handle</TableHead><TableHead>Category</TableHead>
              <TableHead>Followers</TableHead><TableHead>Status</TableHead><TableHead>PIC</TableHead>
              <TableHead>Source</TableHead><TableHead>Last Contact</TableHead>
            </TableRow>
          </thead>
          <tbody>
            {creators.map((creator) => (
              <TableRow key={creator.id}>
                <TableCell>
                  <input type="checkbox" name="creator_ids" value={creator.id} aria-label={`Select ${creator.creator_name || creator.tiktok_handle || "creator"}`} checked={selectedIds.includes(creator.id)} onChange={(event) => toggleCreator(creator.id, event.target.checked)} />
                </TableCell>
                <TableCell><Link href={`/creators/${creator.id}`} className="font-medium text-slate-900 hover:text-violet-700">{creator.creator_name || "Unnamed creator"}</Link></TableCell>
                <TableCell>{creator.tiktok_handle ? `@${creator.tiktok_handle.replace(/^@/, "")}` : "—"}</TableCell>
                <TableCell>{creator.category || "—"}</TableCell>
                <TableCell>{formatNumber(creator.follower_count)}</TableCell>
                <TableCell><Badge className="bg-violet-50 text-violet-700">{creator.status}</Badge></TableCell>
                <TableCell>{creator.pic || "—"}</TableCell>
                <TableCell>{creator.source || "—"}</TableCell>
                <TableCell>{toMytDate(creator.last_contact_at)}</TableCell>
              </TableRow>
            ))}
            {creators.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-slate-500">No creators match these filters.</TableCell></TableRow>}
          </tbody>
        </Table>
      </div>
    </form>
  );
}
