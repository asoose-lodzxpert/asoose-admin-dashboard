'use client'

import type { ConfigItem, PropertyType } from '@/app/lib/types'
import { ConfigPanel, toCode, type FieldDef, type ActionResult } from '@/app/components/config-panel'
import { createPropertyType, updatePropertyType, deletePropertyType } from '@/app/actions/property-types'

const createFields: FieldDef[] = [
  { type: 'text', key: 'name', label: 'Name', required: true, placeholder: 'e.g. Apartment' },
  { type: 'text', key: 'code', label: 'Code', required: true, placeholder: 'e.g. APARTMENT' },
  { type: 'number', key: 'sortOrder', label: 'Sort Order', placeholder: '0' },
  { type: 'textarea', key: 'description', label: 'Description', placeholder: 'Optional description…' },
]

const editFields: FieldDef[] = [
  { type: 'text', key: 'name', label: 'Name', required: true },
  { type: 'number', key: 'sortOrder', label: 'Sort Order' },
  { type: 'textarea', key: 'description', label: 'Description' },
]

export function PropertyTypesClient({ initialPropertyTypes }: { initialPropertyTypes: PropertyType[] }) {
  return (
    <main className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Property Types</h1>
        <p className="mt-0.5 text-sm text-slate-500">Manage the property types available when listing a stay (apartment, hotel, villa, etc).</p>
      </div>

      <ConfigPanel
        resourceName="Property Type"
        initialItems={initialPropertyTypes as ConfigItem[]}
        createFields={createFields}
        editFields={editFields}
        deriveOnCreate={{ from: 'name', to: 'code', transform: toCode }}
        onCreate={(p) => createPropertyType(p) as Promise<ActionResult<ConfigItem>>}
        onUpdate={(id, p) => updatePropertyType(id, p) as Promise<ActionResult<ConfigItem>>}
        onDelete={deletePropertyType}
      />
    </main>
  )
}
