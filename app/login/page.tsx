import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 pt-10">
      <Card className="p-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-violet-600">Secure Access</p>
          <h1 className="mt-2 text-3xl font-bold">Login</h1>
        </div>

        <form className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              placeholder="team@vesure.com"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-violet-500 focus:bg-white"
            />
          </div>
          <Button type="submit" className="w-full">
            Send Magic Link
          </Button>
        </form>
      </Card>
    </div>
  );
}
