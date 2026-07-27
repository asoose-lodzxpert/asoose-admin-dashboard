'use client'

import { useState } from 'react'
import { cn } from '@/app/lib/utils'
import type { ConfigItem, VehicleType, VehicleBrand, StoreType, Cuisine, Category } from '@/app/lib/types'
import { ConfigPanel, toCode, type FieldDef, type ActionResult } from '@/app/components/config-panel'
import {
  createVehicleType, updateVehicleType, deleteVehicleType,
  createVehicleBrand, updateVehicleBrand, deleteVehicleBrand,
  createStoreType, updateStoreType, deleteStoreType,
  createCuisine, updateCuisine, deleteCuisine,
  createCategory, updateCategory, deleteCategory,
} from '@/app/actions/configurations'

/* ─── Tab definitions ────────────────────────────────────── */

const TABS = ['Vehicle Types', 'Vehicle Brands', 'Store Types', 'Cuisines', 'Categories'] as const
type Tab = typeof TABS[number]

/* ─── Main client component ──────────────────────────────── */

interface Props {
  initialVehicleTypes: VehicleType[]
  initialVehicleBrands: VehicleBrand[]
  initialStoreTypes: StoreType[]
  initialCuisines: Cuisine[]
  initialCategories: Category[]
}

export function ConfigurationsClient({
  initialVehicleTypes,
  initialVehicleBrands,
  initialStoreTypes,
  initialCuisines,
  initialCategories,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Vehicle Types')

  const APPLIES_TO_OPTIONS = [
    { value: 'DRIVER', label: 'Driver' },
    { value: 'RIDER', label: 'Rider' },
  ]

  const vehicleTypeCreateFields: FieldDef[] = [
    { type: 'text', key: 'name', label: 'Name', required: true, placeholder: 'e.g. Motorcycle' },
    { type: 'text', key: 'code', label: 'Code', required: true, placeholder: 'e.g. MOTO' },
    { type: 'select', key: 'appliesTo', label: 'Applies To', required: true, options: APPLIES_TO_OPTIONS },
    { type: 'number', key: 'sortOrder', label: 'Sort Order', placeholder: '0' },
    { type: 'textarea', key: 'description', label: 'Description', placeholder: 'Optional description…' },
  ]

  const vehicleTypeEditFields: FieldDef[] = [
    { type: 'text', key: 'name', label: 'Name', required: true },
    { type: 'select', key: 'appliesTo', label: 'Applies To', required: true, options: APPLIES_TO_OPTIONS },
    { type: 'number', key: 'sortOrder', label: 'Sort Order' },
    { type: 'textarea', key: 'description', label: 'Description' },
  ]

  const brandCreateFields: FieldDef[] = [
    { type: 'text', key: 'name', label: 'Name', required: true, placeholder: 'e.g. Toyota' },
    { type: 'text', key: 'code', label: 'Code', required: true, placeholder: 'e.g. TOYOTA' },
    { type: 'number', key: 'sortOrder', label: 'Sort Order', placeholder: '0' },
    { type: 'textarea', key: 'description', label: 'Description', placeholder: 'Optional description…' },
  ]

  const brandEditFields: FieldDef[] = [
    { type: 'text', key: 'name', label: 'Name', required: true },
    { type: 'number', key: 'sortOrder', label: 'Sort Order' },
    { type: 'textarea', key: 'description', label: 'Description' },
  ]

  const storeTypeCreateFields: FieldDef[] = [
    { type: 'text', key: 'name', label: 'Name', required: true, placeholder: 'e.g. Restaurant' },
    { type: 'text', key: 'code', label: 'Code', required: true, placeholder: 'e.g. RESTAURANT' },
    { type: 'number', key: 'sortOrder', label: 'Sort Order', placeholder: '0' },
    { type: 'textarea', key: 'description', label: 'Description', placeholder: 'Optional description…' },
    { type: 'checkbox', key: 'isRestaurant', label: 'This is a restaurant type', hint: 'Restaurant store types can have cuisines assigned to them.' },
  ]

  const storeTypeEditFields: FieldDef[] = [
    { type: 'text', key: 'name', label: 'Name', required: true },
    { type: 'number', key: 'sortOrder', label: 'Sort Order' },
    { type: 'textarea', key: 'description', label: 'Description' },
    { type: 'checkbox', key: 'isRestaurant', label: 'This is a restaurant type', hint: 'Restaurant store types can have cuisines assigned to them.' },
  ]

  const cuisineCreateFields: FieldDef[] = [
    { type: 'text', key: 'name', label: 'Name', required: true, placeholder: 'e.g. Nigerian' },
    { type: 'text', key: 'code', label: 'Code', required: true, placeholder: 'e.g. NIGERIAN' },
    { type: 'number', key: 'sortOrder', label: 'Sort Order', placeholder: '0' },
    { type: 'textarea', key: 'description', label: 'Description', placeholder: 'Optional description…' },
  ]

  const cuisineEditFields: FieldDef[] = [
    { type: 'text', key: 'name', label: 'Name', required: true },
    { type: 'number', key: 'sortOrder', label: 'Sort Order' },
    { type: 'textarea', key: 'description', label: 'Description' },
  ]

  const categoryCreateFields: FieldDef[] = [
    { type: 'text', key: 'name', label: 'Name', required: true, placeholder: 'e.g. Groceries' },
    { type: 'text', key: 'slug', label: 'Slug', required: true, placeholder: 'e.g. groceries' },
    { type: 'number', key: 'sortOrder', label: 'Sort Order', placeholder: '0' },
    { type: 'textarea', key: 'description', label: 'Description', placeholder: 'Fresh food and pantry items…' },
    { type: 'checkbox', key: 'isActive', label: 'Active', hint: 'Active categories are available for product creation.', default: true },
  ]

  const categoryEditFields: FieldDef[] = [
    { type: 'text', key: 'name', label: 'Name', required: true },
    { type: 'text', key: 'slug', label: 'Slug' },
    { type: 'number', key: 'sortOrder', label: 'Sort Order' },
    { type: 'textarea', key: 'description', label: 'Description' },
  ]

  const appliesToBadge = (item: ConfigItem) => (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      item.appliesTo === 'DRIVER'
        ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
        : 'bg-sky-50 text-sky-700 ring-sky-600/20'
    )}>
      {String(item.appliesTo ?? '—')}
    </span>
  )

  const restaurantBadge = (item: ConfigItem) =>
    item.isRestaurant
      ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">Yes</span>
      : <span className="text-xs text-slate-400">No</span>

  return (
    <main className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Configurations</h1>
        <p className="mt-0.5 text-sm text-slate-500">Manage platform-wide configuration data used across all verticals.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'Vehicle Types' && (
        <ConfigPanel
          resourceName="Vehicle Type"
          initialItems={initialVehicleTypes as ConfigItem[]}
          createFields={vehicleTypeCreateFields}
          editFields={vehicleTypeEditFields}
          extraColumns={[{ label: 'Applies To', render: appliesToBadge }]}
          deriveOnCreate={{ from: 'name', to: 'code', transform: toCode }}
          onCreate={(p) => createVehicleType(p) as Promise<ActionResult<ConfigItem>>}
          onUpdate={(id, p) => updateVehicleType(id, p) as Promise<ActionResult<ConfigItem>>}
          onDelete={deleteVehicleType}
        />
      )}
      {activeTab === 'Vehicle Brands' && (
        <ConfigPanel
          resourceName="Vehicle Brand"
          initialItems={initialVehicleBrands as ConfigItem[]}
          createFields={brandCreateFields}
          editFields={brandEditFields}
          deriveOnCreate={{ from: 'name', to: 'code', transform: toCode }}
          onCreate={(p) => createVehicleBrand(p) as Promise<ActionResult<ConfigItem>>}
          onUpdate={(id, p) => updateVehicleBrand(id, p) as Promise<ActionResult<ConfigItem>>}
          onDelete={deleteVehicleBrand}
        />
      )}
      {activeTab === 'Store Types' && (
        <ConfigPanel
          resourceName="Store Type"
          initialItems={initialStoreTypes as ConfigItem[]}
          createFields={storeTypeCreateFields}
          editFields={storeTypeEditFields}
          extraColumns={[{ label: 'Restaurant', render: restaurantBadge }]}
          deriveOnCreate={{ from: 'name', to: 'code', transform: toCode }}
          onCreate={(p) => createStoreType(p) as Promise<ActionResult<ConfigItem>>}
          onUpdate={(id, p) => updateStoreType(id, p) as Promise<ActionResult<ConfigItem>>}
          onDelete={deleteStoreType}
        />
      )}
      {activeTab === 'Cuisines' && (
        <ConfigPanel
          resourceName="Cuisine"
          initialItems={initialCuisines as ConfigItem[]}
          createFields={cuisineCreateFields}
          editFields={cuisineEditFields}
          deriveOnCreate={{ from: 'name', to: 'code', transform: toCode }}
          onCreate={(p) => createCuisine(p) as Promise<ActionResult<ConfigItem>>}
          onUpdate={(id, p) => updateCuisine(id, p) as Promise<ActionResult<ConfigItem>>}
          onDelete={deleteCuisine}
        />
      )}
      {activeTab === 'Categories' && (
        <ConfigPanel
          resourceName="Category"
          initialItems={initialCategories as unknown as ConfigItem[]}
          createFields={categoryCreateFields}
          editFields={categoryEditFields}
          secondaryColumn={{ label: 'Slug', key: 'slug' }}
          deriveOnCreate={{
            from: 'name',
            to: 'slug',
            transform: (v) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          }}
          onCreate={(p) => createCategory(p) as Promise<ActionResult<ConfigItem>>}
          onUpdate={(id, p) => updateCategory(id, p) as Promise<ActionResult<ConfigItem>>}
          onDelete={deleteCategory}
        />
      )}
    </main>
  )
}
