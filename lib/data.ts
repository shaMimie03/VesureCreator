import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActivityLog, AppSettings, ContactLog, Creator, CreatorStatus, Product, Template } from "@/types/db";

const hasSupabaseConfig =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

const emptySettings: AppSettings = {
  brand: {
    enterprise_name: "",
    mcn_name: "",
  },
  commission: {
    default_rate: "",
  },
  follow_up_days: {
    first: 0,
    second: 0,
    sample_reminder_1: 0,
    sample_reminder_2: 0,
  },
};

export async function getCreators(): Promise<Creator[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createServerSupabaseClient();
  const creators: Creator[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("creators")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + 999);
    if (error) throw new Error(`Could not load creators: ${error.message}`);
    const page = (data ?? []) as Creator[];
    creators.push(...page);
    if (page.length < 1000) return creators;
  }
}

export async function getProducts(): Promise<Product[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load products: ${error.message}`);
  return (data ?? []) as Product[];
}

export async function getTemplates(): Promise<Template[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load templates: ${error.message}`);
  return (data ?? []) as Template[];
}

export async function getSettings(): Promise<AppSettings> {
  if (!hasSupabaseConfig) return emptySettings;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) throw new Error(`Could not load settings: ${error.message}`);

  const settingsObject = Object.fromEntries(
    (data ?? []).map((item) => [item.key, item.value]),
  ) as Partial<AppSettings>;

  return {
    brand: settingsObject.brand ?? emptySettings.brand,
    commission: settingsObject.commission ?? emptySettings.commission,
    follow_up_days: settingsObject.follow_up_days ?? emptySettings.follow_up_days,
  };
}

export async function getDashboardData() {
  const creators = await getCreators();
  const activity = await getActivityLog();
  const settings = await getSettings();
  const statuses: CreatorStatus[] = [
    "Not Contacted",
    "Invited",
    "Follow-up 1 Sent",
    "Follow-up 2 Sent",
    "Replied",
    "Agreed",
    "TAP Link Sent",
    "Sample Sent",
    "Sample Delivered",
    "Content Posted",
    "Active",
    "Rejected",
    "Cold Lead",
  ];
  const statusBreakdown = statuses.map((status) => ({
    name: status,
    value: creators.filter((creator) => creator.status === status).length,
  }));
  const categoryTotals = new Map<string, number>();
  creators.forEach((creator) => {
    categoryTotals.set(creator.category, (categoryTotals.get(creator.category) ?? 0) + 1);
  });
  const categoryBreakdown = [...categoryTotals.entries()]
    .map(([name, count]) => ({
      name,
      value: creators.length ? Math.round((count / creators.length) * 100) : 0,
    }))
    .sort((left, right) => right.value - left.value);
  const now = Date.now();
  const mytDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const startOfToday = new Date(`${mytDate}T00:00:00+08:00`).getTime();
  const firstFollowUpCutoff = now - settings.follow_up_days.first * 24 * 60 * 60 * 1000;
  const secondFollowUpCutoff = now - settings.follow_up_days.second * 24 * 60 * 60 * 1000;
  const dueToday = creators.filter((creator) => {
    if (!creator.last_contact_at) return false;
    const lastContact = new Date(creator.last_contact_at).getTime();
    if (creator.status === "Invited") return lastContact <= firstFollowUpCutoff;
    if (creator.status === "Follow-up 1 Sent") return lastContact <= secondFollowUpCutoff;
    return false;
  });

  return {
    totalCreators: creators.length,
    discoveredToday: creators.filter((creator) => new Date(creator.discovered_at ?? creator.created_at).getTime() >= startOfToday).length,
    mcnSignedCount: creators.filter((creator) => creator.mcn_status === "MCN Signed").length,
    mcnUnknownCount: creators.filter((creator) => !creator.mcn_status || creator.mcn_status === "MCN Unknown" || creator.mcn_status === "Checking MCN").length,
    notMcnSignedCount: creators.filter((creator) => creator.mcn_status === "Not MCN Signed").length,
    eligibleCount: creators.filter((creator) => creator.eligibility_status === "Eligible" && creator.mcn_status === "Not MCN Signed").length,
    notEligibleCount: creators.filter((creator) => creator.eligibility_status === "Not Eligible").length,
    contactedCount: creators.filter((creator) =>
      ["Already Contacted", "Invitation Sent", "Replied", "Interested", "Not Interested", "Joined", "Follow-up Required", "No Response"].includes(creator.recruitment_status) ||
      !["Not Contacted", "Cold Lead"].includes(creator.status),
    ).length,
    invitationSentCount: creators.filter((creator) =>
      creator.recruitment_status === "Invitation Sent" || creator.status === "Invited",
    ).length,
    invitationsSentToday: creators.filter((creator) =>
      (creator.recruitment_status === "Invitation Sent" || creator.status === "Invited") &&
      new Date(creator.last_contact_at ?? 0).getTime() >= startOfToday,
    ).length,
    awaitingResponseCount: creators.filter((creator) =>
      ["Invitation Sent", "Follow-up Required", "No Response"].includes(creator.recruitment_status) &&
      creator.status !== "Replied",
    ).length,
    followUpsDueTodayCount: dueToday.length,
    interestedCount: creators.filter((creator) => creator.recruitment_status === "Interested" || creator.status === "Agreed").length,
    joinedCount: creators.filter((creator) => creator.recruitment_status === "Joined").length,
    invitedCount: creators.filter((creator) => creator.status === "Invited").length,
    repliedCount: creators.filter((creator) => creator.recruitment_status === "Replied" || creator.status === "Replied").length,
    activeCount: creators.filter((creator) => creator.status === "Active").length,
    dueToday,
    statusBreakdown,
    categoryBreakdown,
    activity,
    settings,
  };
}

export async function getActivityLog(): Promise<ActivityLog[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10);
  if (error) throw new Error(`Could not load recent activity: ${error.message}`);
  return (data ?? []) as ActivityLog[];
}

export async function getCreatorById(id: string): Promise<Creator | null> {
  if (!hasSupabaseConfig) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("creators").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load creator: ${error.message}`);
  return data as Creator | null;
}

export async function getContactLogByCreatorId(creatorId: string): Promise<ContactLog[]> {
  if (!hasSupabaseConfig) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("contact_log").select("*").eq("creator_id", creatorId).order("sent_at", { ascending: false });
  if (error) throw new Error(`Could not load creator contact history: ${error.message}`);
  return (data ?? []) as ContactLog[];
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!hasSupabaseConfig) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load assigned product: ${error.message}`);
  return data as Product | null;
}
