import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreatorListTable } from "@/components/creators/creator-list-table";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CREATOR_CATEGORIES, CREATOR_SOURCES, CREATOR_STATUSES } from "@/lib/creators/constants";
import type { Creator } from "@/types/db";

const PAGE_SIZE = 50;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function pageHref(page: number, filters: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/creators${query ? `?${query}` : ""}`;
}

export default async function CreatorsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    q: singleParam(params.q).replace(/[^a-zA-Z0-9 ._@+-]/g, "").trim().slice(0, 100),
    status: singleParam(params.status),
    mcn_status: singleParam(params.mcn_status),
    eligibility_status: singleParam(params.eligibility_status),
    category: singleParam(params.category),
    pic: singleParam(params.pic).replace(/[,%()]/g, "").trim().slice(0, 100),
    source: singleParam(params.source),
    sort: ["created_at", "discovered_at", "last_contact_at", "follower_count", "eligibility_score"].includes(singleParam(params.sort))
      ? singleParam(params.sort)
      : "created_at",
  };
  const requestedPage = Number.parseInt(singleParam(params.page), 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  let creators: Creator[] = [];
  let total = 0;
  let loadError = "";

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from("creators").select("*", { count: "exact" });
    if (filters.q) query = query.or(`creator_name.ilike.%${filters.q}%,tiktok_handle.ilike.%${filters.q}%,whatsapp_number.ilike.%${filters.q}%`);
    if (CREATOR_STATUSES.includes(filters.status as (typeof CREATOR_STATUSES)[number])) {
      query = query.eq("status", filters.status);
    }
    if (["Checking MCN", "MCN Signed", "Not MCN Signed", "MCN Unknown"].includes(filters.mcn_status)) {
      query = query.eq("mcn_status", filters.mcn_status);
    }
    if (["Pending", "Eligible", "Not Eligible"].includes(filters.eligibility_status)) {
      query = query.eq("eligibility_status", filters.eligibility_status);
    }
    if (CREATOR_CATEGORIES.includes(filters.category as (typeof CREATOR_CATEGORIES)[number])) {
      query = query.eq("category", filters.category);
    }
    if (filters.pic) query = query.ilike("pic", `%${filters.pic}%`);
    if (CREATOR_SOURCES.includes(filters.source as (typeof CREATOR_SOURCES)[number])) {
      query = query.eq("source", filters.source);
    }
    const { data, count, error } = await query
      .order(filters.sort, { ascending: false, nullsFirst: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error) {
      loadError = `Could not load creators: ${error.message}`;
    } else {
      creators = (data ?? []) as Creator[];
      total = count ?? 0;
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not connect to the creator database.";
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const preservedFilters = { ...filters };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Creator CRM</p>
          <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
          <p className="mt-1 text-sm text-slate-500">{total.toLocaleString()} creator{total === 1 ? "" : "s"}</p>
        </div>
        <Link href="/creators/new"><Button>Add Creator</Button></Link>
      </div>

      <Card className="p-4">
        <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-9" action="/creators">
          <div className="xl:col-span-2">
            <label htmlFor="creator-search" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search name, handle, or phone</label>
            <input id="creator-search" name="q" defaultValue={filters.q} placeholder="Name, TikTok handle, or WhatsApp" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
          </div>
          <div>
            <label htmlFor="creator-status" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
            <select id="creator-status" name="status" defaultValue={filters.status} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option value="">All statuses</option>
              {CREATOR_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="creator-category" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
            <select id="creator-category" name="category" defaultValue={filters.category} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option value="">All categories</option>
              {CREATOR_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="creator-mcn-status" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">MCN screening</label>
            <select id="creator-mcn-status" name="mcn_status" defaultValue={filters.mcn_status} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option value="">All MCN statuses</option>
              {["Checking MCN", "MCN Signed", "Not MCN Signed", "MCN Unknown"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="creator-eligibility" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Eligibility</label>
            <select id="creator-eligibility" name="eligibility_status" defaultValue={filters.eligibility_status} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option value="">All eligibility</option>
              {["Pending", "Eligible", "Not Eligible"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="creator-pic" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">PIC</label>
            <input id="creator-pic" name="pic" defaultValue={filters.pic} placeholder="Search PIC" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
          </div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="creator-source" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Source</label>
              <select id="creator-source" name="source" defaultValue={filters.source} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                <option value="">All sources</option>
                {CREATOR_SOURCES.map((source) => <option key={source}>{source}</option>)}
              </select>
            </div>
            <Button type="submit">Filter</Button>
          </div>
          <div>
            <label htmlFor="creator-sort" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sort by</label>
            <select id="creator-sort" name="sort" defaultValue={filters.sort} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option value="created_at">Created date</option>
              <option value="discovered_at">Discovery date</option>
              <option value="last_contact_at">Last contact</option>
              <option value="follower_count">Follower count</option>
              <option value="eligibility_score">Eligibility score</option>
            </select>
          </div>
        </form>
      </Card>

      {loadError ? (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800" role="alert">{loadError}</Card>
      ) : (
        <>
          <CreatorListTable creators={creators} />
          <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
            <span>Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-2">
              <Link aria-disabled={page <= 1} className={`rounded-md border px-3 py-2 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`} href={pageHref(Math.max(1, page - 1), preservedFilters)}>Previous</Link>
              <span>Page {page} of {pageCount}</span>
              <Link aria-disabled={page >= pageCount} className={`rounded-md border px-3 py-2 ${page >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`} href={pageHref(Math.min(pageCount, page + 1), preservedFilters)}>Next</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
