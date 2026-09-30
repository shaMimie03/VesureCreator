CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  category text,
  description text,
  links jsonb DEFAULT '[]'::jsonb,
  commission_rate text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  type text CHECK (type IN ('Product Collaboration', 'MCN Invite', 'Follow-up', 'Sample')),
  category text,
  channel text,
  language text DEFAULT 'EN',
  body text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_name text,
  tiktok_handle text UNIQUE,
  whatsapp_number text,
  email text,
  category text CHECK (category IN ('Health', 'FMCG', 'Baby', 'Beauty', 'Fashion', 'Food', 'Other')),
  follower_count bigint,
  engagement_rate numeric,
  source text CHECK (source IN ('Kalopilot', 'Manual', 'Competitor Mining', 'Referral')),
  status text DEFAULT 'Not Contacted' CHECK (status IN ('Not Contacted', 'Invited', 'Follow-up 1 Sent', 'Follow-up 2 Sent', 'Replied', 'Agreed', 'TAP Link Sent', 'Sample Sent', 'Sample Delivered', 'Content Posted', 'Active', 'Rejected', 'Cold Lead')),
  product_id uuid REFERENCES products(id),
  pic text,
  notes text,
  last_contact_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES creators(id) ON DELETE CASCADE,
  channel text CHECK (channel IN ('WhatsApp', 'TikTok DM', 'Email')),
  template_id uuid REFERENCES templates(id),
  message_body text,
  sent_at timestamptz,
  replied boolean DEFAULT false,
  replied_at timestamptz,
  reply_body text
);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES creators(id) ON DELETE CASCADE,
  action text,
  old_value text,
  new_value text,
  performed_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);
CREATE INDEX IF NOT EXISTS idx_creators_category ON creators(category);
CREATE INDEX IF NOT EXISTS idx_creators_last_contact_at ON creators(last_contact_at);
CREATE INDEX IF NOT EXISTS idx_contact_log_creator_id ON contact_log(creator_id);
CREATE INDEX IF NOT EXISTS idx_contact_log_sent_at ON contact_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_creator_id ON activity_log(creator_id);

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON creators
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON contact_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON activity_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_creators_updated_at
BEFORE UPDATE ON creators
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO settings (key, value, updated_at)
VALUES
  ('brand', '{"enterprise_name": "Vesure Enterprise", "mcn_name": "VesureMedia"}'::jsonb, now()),
  ('commission', '{"default_rate": "7%"}'::jsonb, now()),
  ('follow_up_days', '{"first": 7, "second": 30, "sample_reminder_1": 3, "sample_reminder_2": 7}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

INSERT INTO products (
  name, category, description, links, commission_rate, is_active
) VALUES (
  'Swiss Thomas',
  'Health',
  'Trusted health product for creator promotion',
  '[{"label": "Product 1", "url": "https://affiliate.tiktok.com/api/v1/share/ALJgz1BTA6Pk"}, {"label": "Product 2", "url": "https://affiliate.tiktok.com/api/v1/share/ALJgz1OMGNz8"}, {"label": "Product 3", "url": "https://affiliate.tiktok.com/api/v1/share/ALJgz1BTRIQG"}]'::jsonb,
  '7%',
  true
)
ON CONFLICT DO NOTHING;

INSERT INTO templates (
  name, type, category, channel, language, body, is_active
) VALUES
  ('Vesure Enterprise Invite', 'Product Collaboration', 'Health', 'WhatsApp', 'EN', 'Hi {{creator_name}}! 👋✨\n\nWe love your content and would like to invite you to collaborate with Vesure Enterprise! 💙\n\nPromote our trusted products Swiss Thomas and enjoy:\n💰 {{commission_rate}} Commission\n🎁 Free Samples\n📢 Free Ads Support\n\nView products here:\n{{product_links}}\n\nIf you''re interested, just let us know! 🤝✨\nWe''d love to work with you! 💙', true),
  ('VesureMedia MCN Invite', 'MCN Invite', 'Health', 'WhatsApp', 'EN', 'Hi {{creator_name}}! 👋\n\nWe''re from VesureMedia, and we''ve been following your content. We really enjoy what you''re creating and believe you''d be a great fit for our MCN.\n\nWe help creators grow with:\n📈 Dedicated support\n💰 Monetization guidance\n🎬 Content strategies\n🤝 Exciting brand collaboration opportunities\n\nWe''d love to have you join our creator community and support your journey. Let us know if you''re interested—we''d be happy to share more details!', true),
  ('Follow-up 1 (7 Days)', 'Follow-up', 'Health', 'WhatsApp', 'EN', 'Hi {{creator_name}}! 👋\n\nJust following up on our earlier message — we''d really love to have you join our creator community. 💙\n\nWe''ve helped creators like you grow with monetization support, brand deals, and content guidance. No pressure at all — just wanted to make sure you saw our message!\n\nLet us know if you''d like more details. 🤝', true),
  ('Follow-up 2 (30 Days)', 'Follow-up', 'Health', 'WhatsApp', 'EN', 'Hi {{creator_name}}! 👋\n\nWe reached out about a month ago — just checking in one last time. We''re still very interested in working with you! 💙\n\nIf the timing wasn''t right before, we''d love to reconnect. Our door is always open.\n\nReply "YES" if you''d like to hear more, or "NO" and we won''t follow up again. Either way, we appreciate your content! 🙏', true),
  ('Sample Sent Notification', 'Sample', 'Health', 'WhatsApp', 'EN', 'Hi {{creator_name}}! 📦✨\n\nGreat news — your free sample has been shipped!\n\nProduct: {{product_name}}\nTracking: {{tracking_number}}\n\nOnce you receive it, feel free to start creating content whenever you''re ready. We can''t wait to see what you make! 💙', true),
  ('Sample Reminder (Day 3)', 'Sample', 'Health', 'WhatsApp', 'EN', 'Hi {{creator_name}}! 👋\n\nHope you received your sample! Just checking in — how''s the product so far? 😊\n\nIf you need any content ideas or guidance, just let us know. We''re here to help! 💙', true),
  ('Sample Reminder (Day 7)', 'Sample', 'Health', 'WhatsApp', 'EN', 'Hi {{creator_name}}! ⏰\n\nJust a friendly reminder — we''d love to see your content whenever you''re ready! 🎬\n\nPosting within 7 days helps you unlock:\n✅ Priority for future samples\n✅ Higher commission tier\n✅ Featured on our brand page\n\nLet us know if you need anything! 💙', true)
ON CONFLICT DO NOTHING;
