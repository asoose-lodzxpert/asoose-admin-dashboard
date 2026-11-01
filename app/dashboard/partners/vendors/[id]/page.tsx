import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getVendorDetail, getVendorProducts, getVendorPickupAddress } from '@/app/actions/vendors'
import { getVendorMenu } from '@/app/actions/menu'
import { getActiveCities } from '@/app/actions/cities'
import { getCategoryOptions } from '@/app/actions/configurations'
import { VendorDetailClient } from './vendor-detail-client'

export const metadata: Metadata = { title: 'Vendor Detail' }

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const vendor = await getVendorDetail(id)
  if (!vendor) notFound()

  const [menu, { products, pagination: productPagination }, cities, categories, pickupAddress] = await Promise.all([
    vendor.businessType === 'RESTAURANT' ? getVendorMenu(vendor.id) : Promise.resolve(null),
    getVendorProducts(vendor.id, { page: 1, limit: 20 }),
    getActiveCities(),
    getCategoryOptions(),
    getVendorPickupAddress(vendor.id),
  ])

  return (
    <VendorDetailClient
      vendor={vendor}
      menu={menu}
      initialProducts={products}
      productTotal={productPagination.total}
      cities={cities}
      categories={categories}
      pickupAddress={pickupAddress}
      googleMapsApiKey={process.env.GOOGLE_MAPS_API_KEY?.trim() ?? ''}
    />
  )
}
