import { createClient } from "@supabase/supabase-js";

type Workflow =
  | "follow_up_7_days"
  | "follow_up_30_days"
  | "sample_reminder_day_3"
  | "sample_reminder_day_7";

type CreatorRecord = {
  id: string;
  creator_name: string;
  tiktok_handle: string;
  category: string;
  product_id: string | null;
  status: string;
  last_contact_at: string | null;
  mcn_status: string;
  eligibility_status: string;
};

type ContactRecord = {
  id: string;
  creator_id: string;
  template_id: string;
  channel: string;
  message_body: string;
  sent_at: string | null;
  replied: boolean;
  status: string;
  templates: { id: string; name: string; type: string } | null;
};

type TemplateRecord = {
  id: string;
  name: string;
  type: string;
  category: string;
  channel: string;
  body: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const workflowConfig: Record<Workflow, {
  targetStatus: string;
  templateType: string;
  templateName: RegExp;
}> = {
  follow_up_7_days: {
    targetStatus: "Invited",
    templateType: "Follow-up",
    templateName: /7/,
  },
  follow_up_30_days: {
    targetStatus: "Follow-up 1 Sent",
    templateType: "Follow-up",
    templateName: /30/,
  },
  sample_reminder_day_3: {
    targetStatus: "Sample Sent",
    templateType: "Sample",
    templateName: /day\s*3/i,
  },
  sample_reminder_day_7: {
    targetStatus: "Sample Sent",
    templateType: "Sample",
    templateName: /day\s*7/i,
  },
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function renderBody(body: string, creator: CreatorRecord, product: Record<string, unknown> | null, settings: Record<string, Record<string, unknown>>) {
  const links = Array.isArray(product?.links)
    ? (product.links as { label?: string; url?: string }[])
        .map((link) => `${link.label ?? "Link"}: ${link.url ?? ""}`)
        .join("\n")
    : "";
  const variables: Record<string, string> = {
    creator_name: creator.creator_name ?? "",
    creator_handle: creator.tiktok_handle ?? "",
    product_name: String(product?.name ?? ""),
    product_links: links,
    commission_rate: String(product?.commission_rate ?? settings.commission?.default_rate ?? ""),
    brand_name: String(settings.brand?.enterprise_name ?? ""),
    mcn_name: String(settings.brand?.mcn_name ?? ""),
  };

  return body.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (placeholder, key: string) =>
    Object.hasOwn(variables, key) ? variables[key] : placeholder,
  );
}

async function getSentContactsByCreator(
  supabaseUrl: string,
  serviceRoleKey: string,
  creatorIds: string[],
) {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const contactsByCreator = new Map<string, ContactRecord[]>();

  for (let creatorOffset = 0; creatorOffset < creatorIds.length; creatorOffset += 200) {
    const creatorBatch = creatorIds.slice(creatorOffset, creatorOffset + 200);
    for (let rowOffset = 0; ; rowOffset += 1000) {
      const { data, error } = await supabase
        .from("contact_log")
        .select("id, creator_id, template_id, channel, message_body, sent_at, replied, status, templates!inner(id,name,type)")
        .in("creator_id", creatorBatch)
        .eq("status", "sent")
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .range(rowOffset, rowOffset + 999);
      if (error) throw error;

      const rows = (data ?? []) as unknown as ContactRecord[];
      for (const contact of rows) {
        const creatorContacts = contactsByCreator.get(contact.creator_id) ?? [];
        creatorContacts.push(contact);
        contactsByCreator.set(contact.creator_id, creatorContacts);
      }
      if (rows.length < 1000) break;
    }
  }

  return contactsByCreator;
}

function qualifyingSource(contacts: ContactRecord[], workflow: Workflow): ContactRecord | undefined {
  if (workflow === "follow_up_7_days") {
    return contacts.find((contact) =>
      !contact.replied &&
      ["Product Collaboration", "MCN Invite"].includes(contact.templates?.type ?? ""),
    );
  }
  if (workflow === "follow_up_30_days") {
    return contacts.find((contact) =>
      !contact.replied &&
      contact.templates?.type === "Follow-up" &&
      /7/.test(contact.templates.name),
    );
  }
  const sampleMessage = contacts.find((contact) =>
    !contact.replied &&
    contact.templates?.type === "Sample" &&
    /sent notification/i.test(contact.templates.name),
  );
  return sampleMessage;
}

export async function handleScheduledReminder(request: Request, workflow: Workflow) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return jsonResponse(405, { error: "Method not allowed." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Scheduled function is missing its Supabase server configuration." });
  }

  if (request.headers.get("Authorization") !== `Bearer ${serviceRoleKey}`) {
    return jsonResponse(401, { error: "Unauthorized." });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: settingsRows, error: settingsError } = await supabase.from("settings").select("key,value");
  if (settingsError) return jsonResponse(500, { error: settingsError.message });
  const settings = Object.fromEntries((settingsRows ?? []).map((row) => [row.key, row.value])) as Record<string, Record<string, unknown>>;
  const followUpDays = settings.follow_up_days ?? {};
  const delayDays = workflow === "follow_up_7_days"
    ? Number(followUpDays.first)
    : workflow === "follow_up_30_days"
      ? Number(followUpDays.second)
      : workflow === "sample_reminder_day_3"
        ? Number(followUpDays.sample_reminder_1)
        : Number(followUpDays.sample_reminder_2);

  if (!Number.isInteger(delayDays) || delayDays < 1) {
    return jsonResponse(500, { error: `The delay setting for ${workflow} must be a positive whole number of days.` });
  }

  const config = workflowConfig[workflow];
  const cutoff = new Date(Date.now() - delayDays * 24 * 60 * 60 * 1000).toISOString();
  const statuses = workflow.startsWith("sample_reminder") ? ["Sample Sent", "Sample Delivered"] : [config.targetStatus];
  let candidates: CreatorRecord[] = [];

  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("creators")
      .select("id,creator_name,tiktok_handle,category,product_id,status,last_contact_at,mcn_status,eligibility_status")
      .in("status", statuses)
      .lte("last_contact_at", cutoff)
      .not("last_contact_at", "is", null)
      .order("id")
      .range(offset, offset + 999);
    if (error) return jsonResponse(500, { error: error.message });
    const page = (data ?? []) as CreatorRecord[];
    candidates = candidates.concat(page);
    if (page.length < 1000) break;
  }
  if (workflow.startsWith("follow_up")) {
    candidates = candidates.filter(
      (creator) => creator.mcn_status === "Not MCN Signed" && creator.eligibility_status === "Eligible",
    );
  }

  const { data: templatesData, error: templatesError } = await supabase
    .from("templates")
    .select("id,name,type,category,channel,body")
    .eq("is_active", true)
    .eq("type", config.templateType)
    .eq("channel", "WhatsApp");
  if (templatesError) return jsonResponse(500, { error: templatesError.message });
  const templates = (templatesData ?? []) as TemplateRecord[];
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id,name,links,commission_rate");
  if (productsError) return jsonResponse(500, { error: productsError.message });
  const productsById = new Map(
    (productsData ?? []).map((product) => [product.id, product as Record<string, unknown>]),
  );
  let contactsByCreator: Map<string, ContactRecord[]>;
  try {
    contactsByCreator = await getSentContactsByCreator(
      supabaseUrl,
      serviceRoleKey,
      candidates.map((creator) => creator.id),
    );
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Could not load creator contact history.",
    });
  }
  let queued = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const creator of candidates) {
    try {
      const contacts = contactsByCreator.get(creator.id) ?? [];
      const source = qualifyingSource(contacts, workflow);
      if (!source?.sent_at || !source.templates) {
        skipped += 1;
        continue;
      }
      if (workflow === "sample_reminder_day_7") {
        const { data: day3Run, error: day3RunError } = await supabase.from("scheduled_reminder_runs")
          .select("queued_contact_id")
          .eq("workflow_key", "sample_reminder_day_3")
          .eq("source_contact_id", source.id)
          .maybeSingle();
        if (day3RunError) throw day3RunError;
        if (day3Run?.queued_contact_id) {
          const { data: day3Message, error: day3MessageError } = await supabase.from("contact_log")
            .select("status")
            .eq("id", day3Run.queued_contact_id)
            .maybeSingle();
          if (day3MessageError) throw day3MessageError;
          if (day3Message?.status === "pending_send") {
            skipped += 1;
            continue;
          }
        }
      }

      const sourceSentAt = new Date(source.sent_at).getTime();
      if (!Number.isFinite(sourceSentAt) || Date.now() - sourceSentAt < delayDays * 24 * 60 * 60 * 1000) {
        skipped += 1;
        continue;
      }

      const seen = await supabase
        .from("scheduled_reminder_runs")
        .select("id")
        .eq("workflow_key", workflow)
        .eq("source_contact_id", source.id)
        .maybeSingle();
      if (seen.error) throw seen.error;
      if (seen.data) {
        skipped += 1;
        continue;
      }

      const template = templates
        .filter((item) => config.templateName.test(item.name))
        .sort((a, b) => Number(b.category === creator.category) - Number(a.category === creator.category))[0];
      if (!template) {
        errors.push(`${creator.tiktok_handle}: no active ${config.templateType} template matching ${workflow} is configured.`);
        continue;
      }

      const product = creator.product_id ? productsById.get(creator.product_id) ?? null : null;
      const { data: insertedLog, error: logError } = await supabase
        .from("contact_log")
        .insert({
          creator_id: creator.id,
          channel: template.channel,
          template_id: template.id,
          message_body: renderBody(template.body, creator, product, settings),
          sent_at: null,
          replied: false,
          status: "pending_send",
        })
        .select("id")
        .single();
      if (logError) throw logError;

      const { error: runError } = await supabase.from("scheduled_reminder_runs").insert({
        creator_id: creator.id,
        workflow_key: workflow,
        source_contact_id: source.id,
        queued_contact_id: insertedLog.id,
      });
      if (runError) {
        const { error: cleanupError } = await supabase.from("contact_log").delete().eq("id", insertedLog.id);
        if (cleanupError) {
          throw new Error(`Could not register the reminder run (${runError.message}) or remove its queued message (${cleanupError.message}).`);
        }
        if (runError.code === "23505") {
          skipped += 1;
          continue;
        }
        throw runError;
      }

      queued += 1;
    } catch (error) {
      errors.push(`${creator.tiktok_handle}: ${error instanceof Error ? error.message : "Unexpected queue error."}`);
    }
  }

  return jsonResponse(errors.length ? 207 : 200, {
    workflow,
    examined: candidates.length,
    queued,
    skipped,
    errors,
  });
}
