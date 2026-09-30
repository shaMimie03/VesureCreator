"use client";

import Papa from "papaparse";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const fieldMap = {
  creator_name: ["creator_name", "name", "creator"],
  tiktok_handle: ["tiktok_handle", "handle", "tiktok"],
  whatsapp_number: ["whatsapp_number", "whatsapp", "phone"],
  email: ["email", "email_address"],
  category: ["category"],
  follower_count: ["follower_count", "followers"],
  engagement_rate: ["engagement_rate", "engagement"],
  source: ["source"],
  status: ["status"],
  pic: ["pic", "owner"],
  notes: ["notes"],
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function mapRow(row: Record<string, string | number | null | undefined>) {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), String(value ?? "")]),
  );

  const matched: Record<string, string> = {};
  Object.entries(fieldMap).forEach(([target, candidates]) => {
    const sourceKey = candidates.find((candidate) => normalized[candidate] !== undefined && normalized[candidate] !== "");
    if (sourceKey) matched[target] = normalized[sourceKey].trim();
  });

  return {
    creator_name: matched.creator_name ?? "",
    tiktok_handle: matched.tiktok_handle ? (matched.tiktok_handle.startsWith("@") ? matched.tiktok_handle : `@${matched.tiktok_handle}`) : "",
    whatsapp_number: matched.whatsapp_number ?? "",
    email: matched.email ?? "",
    category: matched.category || "Other",
    follower_count: Number(matched.follower_count || 0),
    engagement_rate: Number(matched.engagement_rate || 0),
    source: matched.source || "Manual",
    status: matched.status || "Not Contacted",
    pic: matched.pic || "",
    notes: matched.notes || "",
  };
}

export default function ImportPage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ imported: number; skipped: number; errors: number; message: string } | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setSummary(null);

    Papa.parse<Record<string, string | number | null | undefined>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: Papa.ParseResult<Record<string, string | number | null | undefined>>) => {
        try {
          const supabase = createClient();
          const rows = results.data.map((row: Record<string, string | number | null | undefined>) => mapRow(row)).filter((row) => row.creator_name && row.tiktok_handle);

          const handles = rows.map((row) => row.tiktok_handle);
          const { data: existingRows } = await supabase.from("creators").select("tiktok_handle").in("tiktok_handle", handles);
          const existingHandles = new Set((existingRows ?? []).map((row) => row.tiktok_handle));

          const validRows = rows.filter((row) => !existingHandles.has(row.tiktok_handle));
          const skipped = rows.length - validRows.length;

          if (!validRows.length) {
            setSummary({ imported: 0, skipped, errors: 0, message: "No new creators were imported. Duplicates were skipped." });
            setLoading(false);
            return;
          }

          const { error } = await supabase.from("creators").insert(
            validRows.map((row) => ({
              ...row,
              follower_count: Number(row.follower_count ?? 0),
              engagement_rate: Number(row.engagement_rate ?? 0),
              status: row.status || "Not Contacted",
              source: row.source || "Manual",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })),
          );

          if (error) {
            setSummary({ imported: 0, skipped, errors: 1, message: error.message || "Import failed." });
            setLoading(false);
            return;
          }

          setSummary({
            imported: validRows.length,
            skipped,
            errors: 0,
            message: `Successfully imported ${validRows.length} creators into Supabase.`,
          });
        } catch (error) {
          setSummary({ imported: 0, skipped: 0, errors: 1, message: error instanceof Error ? error.message : "Unexpected CSV import error." });
        } finally {
          setLoading(false);
        }
      },
      error: (error: Error) => {
        setSummary({ imported: 0, skipped: 0, errors: 1, message: error.message });
        setLoading(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">Bulk import</p>
        <h1 className="text-3xl font-bold tracking-tight">Import Creators</h1>
      </div>

      <Card className="p-6">
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-lg font-medium text-slate-700">Upload CSV file</p>
          <p className="mt-2 text-sm text-slate-500">Supported columns: creator_name, tiktok_handle, whatsapp_number, email, category, follower_count, engagement_rate, source, status, pic, notes.</p>
          <div className="mt-5 flex justify-center">
            <input
              type="file"
              accept=".csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) processFile(file);
              }}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <span className="inline-flex cursor-pointer items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? "Importing..." : "Choose CSV"}
              </span>
            </label>
          </div>
        </div>
      </Card>

      {summary && (
        <Card className="p-5">
          <p className="font-medium text-slate-800">Import summary</p>
          <p className="mt-2 text-sm text-slate-600">{summary.message}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-emerald-50 p-4 text-sm"><span className="block text-slate-500">Imported</span><span className="mt-2 block text-2xl font-bold text-emerald-700">{summary.imported}</span></div>
            <div className="rounded-lg bg-amber-50 p-4 text-sm"><span className="block text-slate-500">Skipped</span><span className="mt-2 block text-2xl font-bold text-amber-700">{summary.skipped}</span></div>
            <div className="rounded-lg bg-red-50 p-4 text-sm"><span className="block text-slate-500">Errors</span><span className="mt-2 block text-2xl font-bold text-red-700">{summary.errors}</span></div>
          </div>
        </Card>
      )}
    </div>
  );
}
