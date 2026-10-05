import Link from "next/link";
import { ProductsManager } from "@/components/settings/products-manager";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/lib/data";

export default async function ProductsSettingsPage() {
  const products = await getProducts();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet-600">Products</p>
          <h1 className="text-3xl font-bold tracking-tight">Product Manager</h1>
        </div>
        <Link href="/settings"><Button className="bg-slate-600 hover:bg-slate-500">Back to Settings</Button></Link>
      </div>
      <ProductsManager products={products} />
    </div>
  );
}
