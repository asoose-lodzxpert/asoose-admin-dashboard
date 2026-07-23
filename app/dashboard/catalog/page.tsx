import type { Metadata } from 'next'
import { getCatalogProducts } from '@/app/actions/catalog'
import { getCategories } from '@/app/actions/configurations'
import type { CatalogItem } from '@/app/lib/types'
import { CatalogProductsTable } from './products-table'

export const metadata: Metadata = { title: 'Products' }

export default async function CatalogProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; isFeatured?: string; page?: string }>
}) {
  const sp = await searchParams
  const [{ items, pagination }, categories] = await Promise.all([
    getCatalogProducts({
      page: Number(sp.page) || 1,
      limit: 50,
      search: sp.search || undefined,
      type: (sp.type as CatalogItem['type']) || undefined,
      isFeatured: (sp.isFeatured as 'true' | 'false') || undefined,
    }),
    getCategories(),
  ])
  return (
    <CatalogProductsTable
      initialItems={items}
      initialPagination={pagination}
      initialParams={sp}
      categories={categories.filter((category) => category.isActive)}
    />
  )
}
