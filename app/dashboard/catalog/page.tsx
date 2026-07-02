import type { Metadata } from 'next'
import { getCatalogProducts } from '@/app/actions/catalog'
import type { CatalogItem } from '@/app/lib/types'
import { CatalogProductsTable } from './products-table'

export const metadata: Metadata = { title: 'Products' }

export default async function CatalogProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; isFeatured?: string; page?: string }>
}) {
  const sp = await searchParams
  const { items, pagination } = await getCatalogProducts({
    page: Number(sp.page) || 1,
    limit: 20,
    search: sp.search || undefined,
    type: (sp.type as CatalogItem['type']) || undefined,
    isFeatured: (sp.isFeatured as 'true' | 'false') || undefined,
  })
  return (
    <CatalogProductsTable
      initialItems={items}
      initialPagination={pagination}
      initialParams={sp}
    />
  )
}
