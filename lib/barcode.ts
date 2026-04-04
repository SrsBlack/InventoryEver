export async function lookupBarcode(barcode: string): Promise<{
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  image_url?: string;
} | null> {
  try {
    // Try Open Food Facts API (free, no key needed)
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await response.json();
    if (data.status === 1 && data.product) {
      return {
        name: data.product.product_name || undefined,
        brand: data.product.brands || undefined,
        category: data.product.categories?.split(',')[0]?.trim() || undefined,
        description: data.product.generic_name || undefined,
        image_url: data.product.image_url || undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
