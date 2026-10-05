import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreatorForm } from "@/components/creators/creator-form";
import { getProducts } from "@/lib/data";

export default async function NewCreatorPage() {
  const products = await getProducts();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">New creator</p>
          <h1 className="text-3xl font-bold tracking-tight">Add Creator</h1>
        </div>
        <Link href="/creators"><Button type="button" className="bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Back to creators</Button></Link>
      </div>
      <CreatorForm products={products} />
    </div>
  );
}
