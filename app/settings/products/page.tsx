import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { getProducts } from "@/lib/data";

export default async function ProductsSettingsPage() {
  const products = await getProducts();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-violet-600">Products</p>
          <h1 className="text-3xl font-bold tracking-tight">Product Manager</h1>
        </div>
        <Button>Add Product</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Links</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </thead>
            <tbody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.commission_rate}</TableCell>
                  <TableCell>{product.links.length}</TableCell>
                  <TableCell>{product.is_active ? "Active" : "Inactive"}</TableCell>
                  <TableCell className="space-x-3">
                    <button className="text-violet-700">Edit</button>
                    <button className="text-red-600">Delete</button>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
