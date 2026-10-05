"use client";

import Papa from "papaparse";
import { readSheet } from "read-excel-file/browser";
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
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function normalizeHandle(value: string) {
  const trimmed = value.trim();
  const profileUrl = trimmed.match(/tiktok\.com\/@([^/?]+)/i);
  const handle = profileUrl?.[1] ?? trimmed;
  const withoutAt = handle.replace(/^@+/, "").trim();
  return withoutAt ? `@${withoutAt}` : "";
}

function parseNumber(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace(/,/g, "").replace(/%$/, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRow(row: Record<string, string | number | boolean | null | undefined>) {
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
    tiktok_handle: normalizeHandle(matched.tiktok_handle ?? ""),
    whatsapp_number: matched.whatsapp_number ?? "",
    email: matched.email ?? "",
    category: matched.category || "Other",
    follower_count: parseNumber(matched.follower_count),
    engagement_rate: parseNumber(matched.engagement_rate),
    source: matched.source || "Kalopilot",
    status: matched.status || "Not Contacted",
    pic: matched.pic || "",
    notes: matched.notes || "",
  };
}

export default function ImportPage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    imported: number;
    skipped: number;
    errors: number;
    message: string;
    details?: string[];
  } | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setSummary(null);

    try {
      const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      const isXlsx = signature[0] === 0x50 && signature[1] === 0x4b;
      let data: Record<string, string | number | boolean | null | undefined>[] = [];
      let parseErrors: Papa.ParseError[] = [];

      if (isXlsx) {
        const sheet = await readSheet(file, 1);
        if (sheet.length > 0) {
          const headers = sheet[0].map((value) => String(value ?? ""));
          data = sheet.slice(1).map((values) =>
            Object.fromEntries(
              headers.map((header, index) => {
                const value = values[index];
                const safeValue =
                  typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                    ? value
                    : value == null
                      ? ""
                      : String(value);
                return [header, safeValue];
              }),
            ),
          );
        }
      } else {
        const results = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
          Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            delimitersToGuess: [",", "\t", ";", "|", "\x1e", "\x1f"],
            complete: resolve,
            error: reject,
          });
        });
        data = results.data;
        parseErrors = results.errors;
      }

      const parserErrors = parseErrors.filter(
        (error): error is typeof error & { row: number } => typeof error.row === "number",
      );
      const rowsWithParseErrors = new Set(parserErrors.map((error) => error.row));

      if (parseErrors.length > 0 && parserErrors.length !== parseErrors.length) {
        setSummary({
          imported: 0,
          skipped: 0,
          errors: parseErrors.length,
          message: "The CSV parser could not locate every problem row, so nothing was imported. Open the workbook in Excel and save a fresh CSV UTF-8 copy to try again.",
          details: parseErrors.slice(0, 5).map((error) => `Row ${error.row ?? "unknown"}: ${error.message}`),
        });
        return;
      }

      const readableRows = data.filter((_, index) => !rowsWithParseErrors.has(index));
      if (readableRows.length === 0) {
        setSummary({
          imported: 0,
          skipped: rowsWithParseErrors.size,
          errors: 0,
          message: `No readable rows were found in this ${isXlsx ? "Excel workbook" : "CSV file"}.`,
        });
        return;
      }

      const supabase = createClient();
      const mappedRows = readableRows.map((row) => mapRow(row));
      const rows = mappedRows.filter((row) => row.creator_name && row.tiktok_handle);
      const missingRequired = mappedRows.length - rows.length;

      if (rows.length === 0) {
        const exampleHeaders = Object.keys(readableRows[0] ?? {}).join(", ");
        setSummary({
          imported: 0,
          skipped: mappedRows.length + rowsWithParseErrors.size,
          errors: 1,
          message: "The file has rows, but no rows contain both a creator name and TikTok handle.",
          details: [
            `Headers found: ${exampleHeaders || "none"}`,
            "This file needs columns like Creator Name and Handle, with values in both columns.",
          ],
        });
        return;
      }

      const uniqueRows = [];
      const seenHandles = new Set<string>();
      let duplicateInFile = 0;
      for (const row of rows) {
        const handleKey = row.tiktok_handle.toLowerCase();
        if (seenHandles.has(handleKey)) {
          duplicateInFile += 1;
          continue;
        }
        seenHandles.add(handleKey);
        uniqueRows.push(row);
      }

      const existingHandles = new Set<string>();
      const uniqueHandles = uniqueRows.map((row) => row.tiktok_handle);
      for (let start = 0; start < uniqueHandles.length; start += 500) {
        const handleBatch = uniqueHandles.slice(start, start + 500);
        const { data: existingRows, error: lookupError } = await supabase
          .from("creators")
          .select("tiktok_handle")
          .in("tiktok_handle", handleBatch);

        if (lookupError) {
          setSummary({
            imported: 0,
            skipped: 0,
            errors: 1,
            message: `Could not check for existing TikTok handles: ${lookupError.message}`,
          });
          return;
        }

        (existingRows ?? []).forEach((row) => existingHandles.add(row.tiktok_handle.toLowerCase()));
      }

      const newRows = uniqueRows.filter((row) => !existingHandles.has(row.tiktok_handle.toLowerCase()));
      const databaseDuplicates = uniqueRows.length - newRows.length;
      let imported = 0;
      let failedRows = 0;
      const errorDetails: string[] = [];

      for (let start = 0; start < newRows.length; start += 500) {
        const batch = newRows.slice(start, start + 500).map((row) => ({
          ...row,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { error: insertError } = await supabase.from("creators").insert(batch);

        if (insertError) {
          failedRows += batch.length;
          errorDetails.push(insertError.message);
        } else {
          imported += batch.length;
        }
      }

      const malformedRowsSkipped = rowsWithParseErrors.size;
      const skipped = missingRequired + duplicateInFile + databaseDuplicates + malformedRowsSkipped;
      setSummary({
        imported,
        skipped,
        errors: failedRows,
        message: `Found ${data.length} data rows: ${imported} imported, ${skipped} skipped, ${failedRows} failed.`,
        details: [
          ...(malformedRowsSkipped
            ? [`${malformedRowsSkipped} source row(s) skipped because CSV quotes are malformed.`]
            : []),
          ...(missingRequired ? [`${missingRequired} row(s) skipped because Creator Name or Handle was blank or not recognized.`] : []),
          ...(duplicateInFile ? [`${duplicateInFile} duplicate handle(s) found inside the file.`] : []),
          ...(databaseDuplicates ? [`${databaseDuplicates} handle(s) were already in the database.`] : []),
          ...errorDetails,
        ],
      });
    } catch (error) {
      setSummary({
        imported: 0,
        skipped: 0,
        errors: 1,
        message: error instanceof Error ? `Could not read/import this file: ${error.message}` : "Unexpected file import error.",
      });
    } finally {
      setLoading(false);
    }
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
          <p className="mt-2 text-sm text-slate-500">Upload an Excel workbook (.xlsx) or CSV. Creator Name, Handle, and Followers are supported; Revenue and Growth are not stored yet.</p>
          <div className="mt-5 flex justify-center">
            <input
              type="file"
              accept=".csv,.xlsx"
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
          {summary.details && summary.details.length > 0 && (
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
              {summary.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          )}
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
