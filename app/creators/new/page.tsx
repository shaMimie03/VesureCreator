import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NewCreatorPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">New creator</p>
        <h1 className="text-3xl font-bold tracking-tight">Add Creator</h1>
      </div>

      <Card className="p-6">
        <form className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Creator name</label>
            <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">TikTok handle</label>
            <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">WhatsApp number</label>
            <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option>Health</option>
              <option>Beauty</option>
              <option>Fashion</option>
              <option>Food</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Source</label>
            <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option>Kalopilot</option>
              <option>Manual</option>
              <option>Competitor Mining</option>
              <option>Referral</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button type="button" className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Cancel</Button>
            <Button type="submit">Save Creator</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
