import { createClient } from "@supabase/supabase-js";

export const handler = async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  );
  void supabase;

  return new Response(JSON.stringify({ ok: true, message: "Follow-up 7 days function ready." }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
};
