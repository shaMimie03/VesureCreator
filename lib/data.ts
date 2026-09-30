import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActivityLog, AppSettings, ContactLog, Creator, Product, Template } from "@/types/db";

const hasSupabaseConfig =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("creators").select("*").order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as Creator[];
  } catch {
    return [];
  }
}

export async function getProducts(): Promise<Product[]> {
  if (!hasSupabaseConfig) return [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as Product[];
  } catch {
    return [];
  }
}

export async function getTemplates(): Promise<Template[]> {
  if (!hasSupabaseConfig) return [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("templates").select("*").order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as Template[];
  } catch {
    return [];
  }
}

export async function getSettings(): Promise<AppSettings> {
  if (!hasSupabaseConfig) return emptySettings;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("settings").select("key, value");

    if (error || !data) return emptySettings;

    const settingsObject = Object.fromEntries(
      (data ?? []).map((item) => [item.key, item.value]),
    ) as Partial<AppSettings>;

    return {
      brand: settingsObject.brand ?? emptySettings.brand,
      commission: settingsObject.commission ?? emptySettings.commission,
      follow_up_days: settingsObject.follow_up_days ?? emptySettings.follow_up_days,
    };
  } catch {
    return emptySettings;
  }
}

export async function getDashboardData() {
  const creators = await getCreators();
  const activity = await getActivityLog();
  const settings = await getSettings();

  return {
    totalCreators: creators.length,
    invitedCount: creators.filter((creator) => creator.status === "Invited").length,
    repliedCount: creators.filter((creator) => creator.status === "Replied").length,
    activeCount: creators.filter((creator) => creator.status === "Active").length,
    dueToday: creators.filter((creator) => creator.status === "Invited"),
    activity,
    settings,
  };
}

export async function getActivityLog(): Promise<ActivityLog[]> {
  if (!hasSupabaseConfig) return [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10);
    if (error || !data) return [];
    return data as ActivityLog[];
  } catch {
    return [];
  }
}

export async function getCreatorById(id: string): Promise<Creator | null> {
  if (!hasSupabaseConfig) return null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("creators").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return data as Creator;
  } catch {
    return null;
  }
}

export async function getContactLogByCreatorId(creatorId: string): Promise<ContactLog[]> {
  if (!hasSupabaseConfig) return [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("contact_log").select("*").eq("creator_id", creatorId).order("sent_at", { ascending: false });
    if (error || !data) return [];
    return data as ContactLog[];
  } catch {
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!hasSupabaseConfig) return null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return data as Product;
  } catch {
    return null;
  }
}
