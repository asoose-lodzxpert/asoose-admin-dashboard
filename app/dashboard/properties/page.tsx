import type { Metadata } from 'next'
import { getProperties } from '@/app/actions/properties'
import { PropertiesGrid } from './properties-grid'

export const metadata: Metadata = { title: 'Properties' }

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const { search, page } = await searchParams
  const { properties, pagination } = await getProperties({
    search,
    page: page ? Number(page) : 1,
    limit: 20,
  })

  return (
    <PropertiesGrid
      initialProperties={properties}
      initialPagination={pagination}
      initialParams={{ search, page }}
    />
  )
}
