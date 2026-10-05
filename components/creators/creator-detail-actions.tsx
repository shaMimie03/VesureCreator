"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { logMessageSent, markCreatorReplied, markQueuedMessageSent, type CreatorActionState } from "@/lib/actions/creators";
import { renderTemplate } from "@/lib/utils/render-template";
import type { AppSettings, ContactLog, Creator, Product, Template } from "@/types/db";

const initialState: CreatorActionState = {};

function MarkQueuedSentButton({ creatorId, contactLogId, messageBody }: { creatorId: string; contactLogId: string; messageBody: string }) {
  const [state, action, pending] = useActionState(markQueuedMessageSent.bind(null, creatorId), initialState);
  const [copyMessage, setCopyMessage] = useState("");
  async function copyMessageBody() {
    try {
      await navigator.clipboard.writeText(messageBody);
      setCopyMessage("Message copied. Paste it into WhatsApp before marking it sent.");
    } catch {
      setCopyMessage("Could not copy the message. Select the text above and copy it manually.");
    }
  }
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="contact_log_id" value={contactLogId} />
      <p className="mb-2 text-xs text-amber-800">Send this message in WhatsApp first, then mark it as sent here.</p>
      {copyMessage && <p className="mb-2 text-xs text-slate-600" role="status">{copyMessage}</p>}
      {state.error && <p className="mb-2 text-sm text-red-700" role="alert">{state.error}</p>}
      {state.success && <p className="mb-2 text-sm text-emerald-700" role="status">{state.success}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copyMessageBody} className="bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Copy message</Button>
        <Button type="submit" disabled={pending} className="bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
          {pending ? "Saving…" : "Mark as sent"}
        </Button>
      </div>
    </form>
  );
}

export function MarkRepliedButton({ creatorId, contactLogId }: { creatorId: string; contactLogId: string }) {
  const [state, action, pending] = useActionState(markCreatorReplied.bind(null, creatorId), initialState);
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="contact_log_id" value={contactLogId} />
      {state.error && <p className="mb-2 text-sm text-red-700" role="alert">{state.error}</p>}
      {state.success && <p className="mb-2 text-sm text-emerald-700" role="status">{state.success}</p>}
      <Button type="submit" disabled={pending} className="bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
        {pending ? "Saving…" : "Mark replied"}
      </Button>
    </form>
  );
}

export function MessageModal({
  creator,
  templates,
  product,
  settings,
}: {
  creator: Creator;
  templates: Template[];
  product?: Product;
  settings: AppSettings;
}) {
  const usableTemplates = templates.filter((template) => template.is_active && template.channel === "WhatsApp");
  const categories = [...new Set(usableTemplates.map((template) => template.category).filter(Boolean))].sort();
  const firstTemplate = usableTemplates[0];
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [templateId, setTemplateId] = useState(firstTemplate?.id ?? "");
  const [body, setBody] = useState(firstTemplate ? renderTemplate(firstTemplate, creator, product, settings) : "");
  const [copyMessage, setCopyMessage] = useState("");
  const [state, action, pending] = useActionState(logMessageSent.bind(null, creator.id), initialState);
  const visibleTemplates = usableTemplates.filter((template) => !category || template.category === category);
  const selectedTemplate = usableTemplates.find((template) => template.id === templateId);

  function selectTemplate(id: string) {
    setTemplateId(id);
    const template = usableTemplates.find((item) => item.id === id);
    setBody(template ? renderTemplate(template, creator, product, settings) : "");
    setCopyMessage("");
  }

  async function copyBody() {
    try {
      await navigator.clipboard.writeText(body);
      setCopyMessage("Message copied to clipboard.");
    } catch {
      setCopyMessage("Could not copy to clipboard. Select and copy the message manually.");
    }
  }

  return (
    <>
      <Button type="button" onClick={() => { setOpen(true); setCopyMessage(""); }}>Send Message</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="message-modal-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-violet-600">Manual WhatsApp message</p>
                <h2 id="message-modal-title" className="text-xl font-semibold">Message {creator.creator_name || "creator"}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close message dialog" className="rounded px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100">×</button>
            </div>
            {!creator.whatsapp_number && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No WhatsApp number is saved for this creator. Confirm the recipient before sending.</p>}

            <form action={action} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="template-category" className="mb-1 block text-sm font-medium">Template category</label>
                  <select id="template-category" value={category} onChange={(event) => {
                    const nextCategory = event.target.value;
                    setCategory(nextCategory);
                    if (templateId && !usableTemplates.some((template) => template.id === templateId && (!nextCategory || template.category === nextCategory))) {
                      const next = usableTemplates.find((template) => !nextCategory || template.category === nextCategory);
                      selectTemplate(next?.id ?? "");
                    }
                  }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <option value="">All categories</option>
                    {categories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="message-template" className="mb-1 block text-sm font-medium">WhatsApp template</label>
                  <select id="message-template" name="template_id" value={templateId} onChange={(event) => selectTemplate(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <option value="">Custom message</option>
                    {visibleTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </div>
              </div>
              {selectedTemplate && <p className="text-xs text-slate-500">{selectedTemplate.type}{selectedTemplate.category ? ` · ${selectedTemplate.category}` : ""}</p>}
              <div>
                <label htmlFor="message-body" className="mb-1 block text-sm font-medium">Preview / message text</label>
                <textarea id="message-body" name="message_body" required maxLength={40000} value={body} onChange={(event) => setBody(event.target.value)} className="min-h-64 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6" />
              </div>
              {copyMessage && <p className="text-sm text-slate-600" role="status">{copyMessage}</p>}
              {state.error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{state.error}</p>}
              {state.success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{state.success}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" onClick={copyBody} className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Copy message</Button>
                <Button type="button" onClick={() => setOpen(false)} className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Close</Button>
                <Button type="submit" disabled={pending}>{pending ? "Recording…" : "Mark as sent"}</Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export function ContactTimelineEntry({
  creatorId,
  entry,
  templateName,
}: {
  creatorId: string;
  entry: ContactLog;
  templateName?: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-slate-800">{entry.channel}{templateName ? ` · ${templateName}` : ""}</p>
        <span className="text-xs text-slate-500">
          {entry.status === "pending_send" ? "Waiting to send" : entry.sent_at ? new Date(entry.sent_at).toLocaleString() : "Sent date unavailable"}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{entry.message_body || "No message text recorded."}</p>
      {entry.status === "pending_send" ? (
        <div className="mt-3 rounded-md bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">Queued — not sent yet</p>
          <MarkQueuedSentButton creatorId={creatorId} contactLogId={entry.id} messageBody={entry.message_body || ""} />
        </div>
      ) : entry.replied ? (
        <p className="mt-3 text-sm font-medium text-emerald-700">Replied{entry.replied_at ? ` · ${new Date(entry.replied_at).toLocaleString()}` : ""}</p>
      ) : (
        <MarkRepliedButton creatorId={creatorId} contactLogId={entry.id} />
      )}
      {entry.reply_body && <p className="mt-2 rounded bg-white p-3 text-sm text-slate-700">Reply: {entry.reply_body}</p>}
    </article>
  );
}
