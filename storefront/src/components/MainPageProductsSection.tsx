
import { getCollectionByHandle } from "@lib/data/collections"
import { getProductsList } from "@lib/data/products"
import ProductPreview from "@modules/products/components/product-preview"
import { Layout, LayoutColumn } from "@/components/Layout"

export default async function MainPageProductsSection({
  countryCode,
  title = "Our Products",
  collectionHandle = "main_page",
  limit = 8,
}: {
  countryCode: string
  title?: string
  collectionHandle?: string
  limit?: number
}) {
  // Fetch the collection by handle
  const collection = await getCollectionByHandle(collectionHandle)
  if (!collection) return null

  // Fetch products in the collection
  const { response } = await getProductsList({
    queryParams: { collection_id: [collection.id], limit },
    countryCode,
  })
  const products = response.products

  if (!products || products.length === 0) return null

  return (
    <Layout className="mb-26 md:mb-36">
      <LayoutColumn className="col-span-full">
        <h3 className="text-md md:text-2xl mb-8 md:mb-15">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {products.map((product) => (
            <ProductPreview key={product.id} product={product} />
          ))}
        </div>
      </LayoutColumn>
    </Layout>
  )
} 