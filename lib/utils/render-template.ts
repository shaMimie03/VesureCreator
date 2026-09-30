import type { AppSettings, Creator, Product, Template } from "@/types/db";

export function renderTemplate(
  template: string | Template,
  creator: Partial<Creator>,
  product?: Partial<Product>,
  settings?: Partial<AppSettings>,
) {
  const source = typeof template === "string" ? template : template.body;
  const productLinks = product?.links?.map((link) => `${link.label}: ${link.url}`).join("\n") ?? "";
  const commissionRate = product?.commission_rate ?? settings?.commission?.default_rate ?? "7%";
  const productName = product?.name ?? "Featured Product";

  const variables: Record<string, string> = {
    creator_name: creator.creator_name ?? "Creator",
    creator_handle: creator.tiktok_handle ?? "@creator",
    product_links: productLinks,
    commission_rate: commissionRate,
    product_name: productName,
    brand_name: settings?.brand?.enterprise_name ?? "Vesure Enterprise",
    mcn_name: settings?.brand?.mcn_name ?? "VesureMedia",
    category: creator.category ?? "Health",
    whatsapp_number: creator.whatsapp_number ?? "",
    email: creator.email ?? "",
    follower_count: String(creator.follower_count ?? 0),
    engagement_rate: String(creator.engagement_rate ?? 0),
  };

  return source.replace(/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g, (_, key) => {
    return variables[key] ?? `{{${key}}}`;
  });
}
