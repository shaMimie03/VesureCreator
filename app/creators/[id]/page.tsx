import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCreatorById, getContactLogByCreatorId, getProducts, getSettings, getTemplates } from "@/lib/data";
import { renderTemplate } from "@/lib/utils/render-template";
import { toMytDate } from "@/lib/utils";

export default async function CreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const creator = await getCreatorById(id);
  const products = await getProducts();
  const templates = await getTemplates();
  const settings = await getSettings();
  const contactLog = await getContactLogByCreatorId(id);

  if (!creator) {
    return <div className="text-center text-slate-600">Creator not found.</div>;
  }

  const product = products.find((item) => item.id === creator.product_id) ?? products[0];
  const template = templates[0];
  const preview = renderTemplate(template, creator, product, settings);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Creator profile</p>
          <h1 className="text-3xl font-bold tracking-tight">{creator.creator_name}</h1>
          <p className="text-slate-500">{creator.tiktok_handle}</p>
        </div>
        <div className="flex gap-3">
          <Badge className="bg-violet-50 text-violet-700">{creator.status}</Badge>
          <Button>Send Message</Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <h2 className="mb-5 text-xl font-semibold">Edit creator</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input value={creator.creator_name} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">TikTok handle</label>
              <input value={creator.tiktok_handle} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">WhatsApp</label>
              <input value={creator.whatsapp_number} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input value={creator.email} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <option>{creator.category}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <option>{creator.status}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Followers</label>
              <input value={creator.follower_count} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">ENG rate</label>
              <input value={creator.engagement_rate} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <textarea value={creator.notes} className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 text-xl font-semibold">Assigned product</h2>
          <select className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <option>{product.name}</option>
            {products.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>

          <div className="mt-6 space-y-3">
            <Button type="button" className="w-full">Mark as Replied</Button>
            <Button type="button" className="w-full bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
              Mark as Sent
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Contact log</h2>
        <div className="space-y-4">
          {contactLog.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-800">{entry.channel}</p>
                <span className="text-xs text-slate-500">{toMytDate(entry.sent_at)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{entry.message_body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Send message preview</h2>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview}</pre>
        </div>
      </Card>
    </div>
  );
}
