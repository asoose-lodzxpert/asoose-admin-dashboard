'use client'

import { useState, useTransition, useCallback } from 'react'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/lib/utils'
import type { ConfigItem, VehicleType, VehicleBrand, StoreType, Cuisine, Category } from '@/app/lib/types'
import {
  createVehicleType, updateVehicleType, deleteVehicleType,
  createVehicleBrand, updateVehicleBrand, deleteVehicleBrand,
  createStoreType, updateStoreType, deleteStoreType,
  createCuisine, updateCuisine, deleteCuisine,
  createCategory, updateCategory, deleteCategory,
} from '@/app/actions/configurations'

/* ─── Field system ───────────────────────────────────────── */

type FieldDef =
  | { type: 'text'; key: string; label: string; required?: boolean; placeholder?: string }
  | { type: 'number'; key: string; label: string; placeholder?: string }
  | { type: 'textarea'; key: string; label: string; placeholder?: string }
  | { type: 'select'; key: string; label: string; required?: boolean; options: { value: string; label: string }[] }
  | { type: 'checkbox'; key: string; label: string; hint?: string; default?: boolean }

type FormState = Record<string, string>
type ActionResult<T> = { data: T; error?: never } | { error: string; data?: never }

function defaultValues(fields: FieldDef[], item?: ConfigItem): FormState {
  const out: FormState = {}
  for (const f of fields) {
    const raw = item ? (item as Record<string, unknown>)[f.key] : undefined
    out[f.key] = f.type === 'checkbox'
      ? String(raw ?? (item ? false : f.default ?? false))
      : raw != null ? String(raw) : ''
  }
  return out
}

function formToPayload(fields: FieldDef[], state: FormState): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (f.type === 'number') out[f.key] = Number(state[f.key]) || 0
    else if (f.type === 'checkbox') out[f.key] = state[f.key] === 'true'
    else if (state[f.key] !== '') out[f.key] = state[f.key]
  }
  return out
}

/* ─── Shared form field renderer ─────────────────────────── */

const INPUT_CLS = 'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'

function FormFields({
  fields,
  values,
  onChange,
}: {
  fields: FieldDef[]
  values: FormState
  onChange: (key: string, val: string) => void
}) {
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          {f.type === 'checkbox' ? (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={values[f.key] === 'true'}
                onChange={(e) => onChange(f.key, String(e.target.checked))}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">{f.label}</span>
                {f.hint && <p className="mt-0.5 text-xs text-slate-500">{f.hint}</p>}
              </div>
            </label>
          ) : (
            <>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                {f.label}
                {'required' in f && f.required && <span className="ml-0.5 text-red-500">*</span>}
              </label>
              {f.type === 'select' ? (
                <select
                  value={values[f.key]}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  className={INPUT_CLS}
                >
                  <option value="">Select…</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  value={values[f.key]}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  rows={3}
                  placeholder={'placeholder' in f ? f.placeholder : undefined}
                  className={cn(INPUT_CLS, 'resize-none')}
                />
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={values[f.key]}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  placeholder={'placeholder' in f ? f.placeholder : undefined}
                  className={INPUT_CLS}
                />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Generic ConfigPanel ────────────────────────────────── */

interface ExtraColumn {
  label: string
  render: (item: ConfigItem) => React.ReactNode
}

interface ConfigPanelProps {
  resourceName: string
  initialItems: ConfigItem[]
  createFields: FieldDef[]
  editFields: FieldDef[]
  extraColumns?: ExtraColumn[]
  secondaryColumn?: { label: string; key: string }
  deriveOnCreate?: { from: string; to: string; transform: (v: string) => string }
  onCreate: (payload: Record<string, unknown>) => Promise<ActionResult<ConfigItem>>
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<ActionResult<ConfigItem>>
  onDelete: (id: string) => Promise<{ error?: string }>
}

function ConfigPanel({
  resourceName,
  initialItems,
  createFields,
  editFields,
  extraColumns = [],
  secondaryColumn = { label: 'Code', key: 'code' },
  deriveOnCreate,
  onCreate,
  onUpdate,
  onDelete,
}: ConfigPanelProps) {
  const [items, setItems] = useState<ConfigItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createValues, setCreateValues] = useState<FormState>(() => defaultValues(createFields))
  const [createError, setCreateError] = useState('')

  // Edit modal
  const [editItem, setEditItem] = useState<ConfigItem | null>(null)
  const [editValues, setEditValues] = useState<FormState>({})
  const [editError, setEditError] = useState('')

  // Delete confirm
  const [deleteItem, setDeleteItem] = useState<ConfigItem | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const openCreate = useCallback(() => {
    setCreateValues(defaultValues(createFields))
    setCreateError('')
    setShowCreate(true)
  }, [createFields])

  const openEdit = useCallback((item: ConfigItem) => {
    setEditValues(defaultValues(editFields, item))
    setEditError('')
    setEditItem(item)
  }, [editFields])

  function handleCreate() {
    const payload = formToPayload(createFields, createValues)
    startTransition(async () => {
      const res = await onCreate(payload)
      if (res.error) { setCreateError(res.error); return }
      setItems((prev) => [...prev, res.data!])
      setShowCreate(false)
    })
  }

  function handleEdit() {
    if (!editItem) return
    const payload = formToPayload(editFields, editValues)
    startTransition(async () => {
      const res = await onUpdate(editItem.id, payload)
      if (res.error) { setEditError(res.error); return }
      setItems((prev) => prev.map((i) => i.id === editItem.id ? res.data! : i))
      setEditItem(null)
    })
  }

  function handleDelete() {
    if (!deleteItem) return
    startTransition(async () => {
      const res = await onDelete(deleteItem.id)
      if (res.error) { setDeleteError(res.error); return }
      setItems((prev) => prev.filter((i) => i.id !== deleteItem.id))
      setDeleteItem(null)
    })
  }

  function toggleActive(item: ConfigItem) {
    const payload = { isActive: !item.isActive }
    startTransition(async () => {
      const res = await onUpdate(item.id, payload)
      if (!res.error) setItems((prev) => prev.map((i) => i.id === item.id ? res.data! : i))
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} {items.length === 1 ? resourceName.toLowerCase() : `${resourceName.toLowerCase()}s`}</p>
        <Button size="sm" onClick={openCreate}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          New {resourceName}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-slate-400">
                <path d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v8.5A2.25 2.25 0 0 1 15.75 15h-3.105a3.501 3.501 0 0 0 1.1 1.677A.75.75 0 0 1 13.26 18H6.74a.75.75 0 0 1-.484-1.323A3.501 3.501 0 0 0 7.355 15H4.25A2.25 2.25 0 0 1 2 12.75v-8.5Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">No {resourceName.toLowerCase()}s yet</p>
            <p className="mt-0.5 text-xs text-slate-400">Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{secondaryColumn.label}</th>
                  {extraColumns.map((c) => (
                    <th key={c.label} className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{c.label}</th>
                  ))}
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Sort</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        {item.description && (
                          <p className="mt-0.5 truncate max-w-xs text-xs text-slate-400">{String(item.description)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{String(item[secondaryColumn.key] ?? '—')}</td>
                    {extraColumns.map((c) => (
                      <td key={c.label} className="px-5 py-3.5">{c.render(item)}</td>
                    ))}
                    <td className="px-5 py-3.5 text-slate-500">{item.sortOrder}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActive(item)}
                        disabled={isPending}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-opacity disabled:opacity-60',
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 ring-slate-500/20 hover:bg-slate-200'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', item.isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
                        {item.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setDeleteError(''); setDeleteItem(item) }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={`New ${resourceName}`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={handleCreate}>Create</Button>
          </>
        }
      >
        {createError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{createError}</div>
        )}
        <FormFields
          fields={createFields}
          values={createValues}
          onChange={(k, v) => {
            setCreateValues((prev) => {
              const next = { ...prev, [k]: v }
              if (deriveOnCreate && k === deriveOnCreate.from) {
                next[deriveOnCreate.to] = deriveOnCreate.transform(v)
              }
              return next
            })
          }}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editItem != null}
        onClose={() => setEditItem(null)}
        title={`Edit ${resourceName}`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={handleEdit}>Save changes</Button>
          </>
        }
      >
        {editError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{editError}</div>
        )}
        <FormFields
          fields={editFields}
          values={editValues}
          onChange={(k, v) => setEditValues((prev) => ({ ...prev, [k]: v }))}
        />
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleteItem != null}
        onClose={() => setDeleteItem(null)}
        title={`Delete ${resourceName}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        {deleteError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{deleteError}</div>
        )}
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteItem?.name}</span>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

const toCode = (v: string) =>
  v.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')

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
