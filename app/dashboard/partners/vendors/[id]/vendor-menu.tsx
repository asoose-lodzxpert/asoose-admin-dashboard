'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { cn } from '@/app/lib/utils'
import { getVendorMenu, createDish, updateDish, deleteDish, toggleDishAvailability, addDishOption } from '@/app/actions/menu'
import type { MenuItem, VendorMenu } from '@/app/lib/types'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { ImageUploader } from '@/app/components/ui/image-uploader'

/* ─── Helpers ─────────────────────────────────────────────── */

const CATEGORIES = ['APPETIZER', 'MAIN_COURSE', 'DESSERT', 'BEVERAGE', 'SIDE_DISH', 'COMBO'] as const

function formatCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatPrice(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

/* ─── Dish Form ───────────────────────────────────────────── */

interface ChoiceDraft {
  uid: string
  name: string
  price: string
  isDefault: boolean
}

interface OptionGroupDraft {
  uid: string
  name: string
  required: boolean
  minChoices: string
  maxChoices: string
  choices: ChoiceDraft[]
}

function newUid() { return Math.random().toString(36).slice(2) }

const EMPTY_FORM = {
  name: '',
  price: '',
  category: 'MAIN_COURSE',
  description: '',
  image: '',
  prepTime: '',
  calories: '',
  spicyLevel: '0',
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  isAvailable: true,
  optionGroups: [] as OptionGroupDraft[],
}
type DishFormState = typeof EMPTY_FORM

function itemToForm(item: MenuItem): DishFormState {
  return {
    name: item.name,
    price: String(item.price),
    category: item.category,
    description: item.description ?? '',
    image: item.image ?? '',
    prepTime: item.prepTime != null ? String(item.prepTime) : '',
    calories: item.calories != null ? String(item.calories) : '',
    spicyLevel: String(item.spicyLevel),
    isVegetarian: item.isVegetarian,
    isVegan: item.isVegan,
    isGlutenFree: item.isGlutenFree,
    isAvailable: item.isAvailable,
    optionGroups: [] as OptionGroupDraft[],
  }
}

const INPUT = 'w-full h-9 rounded-xl border-0 bg-slate-50 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none'
const SELECT = 'w-full h-9 appearance-none rounded-xl border-0 bg-slate-50 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer'
const LABEL = 'block text-xs font-medium text-slate-600 mb-1'

function DishFormModal({
  open,
  onClose,
  onSaved,
  restaurantId,
  editing,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  restaurantId: string
  editing: MenuItem | null
}) {
  const [form, setForm] = useState<DishFormState>(() => editing ? itemToForm(editing) : EMPTY_FORM)
  const [error, setError] = useState('')
  const [isPending, start] = useTransition()

  const set = (k: keyof DishFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const setCheck = (k: keyof DishFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.checked }))

  function addOptionGroup() {
    setForm(f => ({
      ...f,
      optionGroups: [...f.optionGroups, {
        uid: newUid(), name: '', required: false, minChoices: '0', maxChoices: '1',
        choices: [{ uid: newUid(), name: '', price: '0', isDefault: false }],
      }],
    }))
  }

  function removeOptionGroup(gi: number) {
    setForm(f => ({ ...f, optionGroups: f.optionGroups.filter((_, i) => i !== gi) }))
  }

  function updateGroup(gi: number, key: string, val: unknown) {
    setForm(f => {
      const gs = [...f.optionGroups]
      gs[gi] = { ...gs[gi]!, [key]: val }
      return { ...f, optionGroups: gs }
    })
  }

  function addChoice(gi: number) {
    setForm(f => {
      const gs = [...f.optionGroups]
      gs[gi] = { ...gs[gi]!, choices: [...gs[gi]!.choices, { uid: newUid(), name: '', price: '0', isDefault: false }] }
      return { ...f, optionGroups: gs }
    })
  }

  function removeChoice(gi: number, ci: number) {
    setForm(f => {
      const gs = [...f.optionGroups]
      gs[gi] = { ...gs[gi]!, choices: gs[gi]!.choices.filter((_, i) => i !== ci) }
      return { ...f, optionGroups: gs }
    })
  }

  function updateChoice(gi: number, ci: number, key: string, val: unknown) {
    setForm(f => {
      const gs = [...f.optionGroups]
      const cs = [...gs[gi]!.choices]
      cs[ci] = { ...cs[ci]!, [key]: val }
      gs[gi] = { ...gs[gi]!, choices: cs }
      return { ...f, optionGroups: gs }
    })
  }

  function buildOptionPayload(g: OptionGroupDraft) {
    return {
      name: g.name.trim(),
      required: g.required,
      minChoices: Math.max(0, parseInt(g.minChoices) || 0),
      maxChoices: Math.max(1, parseInt(g.maxChoices) || 1),
      choices: g.choices.map(c => ({
        name: c.name.trim(),
        price: parseFloat(c.price) || 0,
        ...(c.isDefault ? { isDefault: true } : {}),
      })),
    }
  }

  function handleSubmit() {
    setError('')
    if (!form.name.trim()) { setError('Name is required'); return }
    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) { setError('Price must be a valid number'); return }
    if (!form.category) { setError('Category is required'); return }

    for (const g of form.optionGroups) {
      if (!g.name.trim()) { setError('Each option group needs a name'); return }
      if (g.choices.length === 0) { setError(`"${g.name || 'Option group'}" needs at least one choice`); return }
      for (const c of g.choices) {
        if (!c.name.trim()) { setError('Each choice needs a name'); return }
      }
      const min = parseInt(g.minChoices) || 0
      const max = parseInt(g.maxChoices) || 1
      if (max < 1) { setError('Max choices must be at least 1'); return }
      if (min > max) { setError('Min choices cannot exceed max choices'); return }
    }

    const data: Record<string, unknown> = {
      name: form.name.trim(),
      price,
      category: form.category,
      spicyLevel: parseInt(form.spicyLevel, 10),
      isVegetarian: form.isVegetarian,
      isVegan: form.isVegan,
      isGlutenFree: form.isGlutenFree,
    }
    if (form.description.trim()) data.description = form.description.trim()
    if (form.image.trim()) data.image = form.image.trim()
    if (form.prepTime) data.prepTime = parseInt(form.prepTime, 10)
    if (form.calories) data.calories = parseInt(form.calories, 10)
    if (editing) data.isAvailable = form.isAvailable
    if (!editing && form.optionGroups.length > 0) {
      data.options = form.optionGroups.map(buildOptionPayload)
    }

    start(async () => {
      const result = editing
        ? await updateDish(editing.id, data)
        : await createDish(restaurantId, data)
      if (result.error) { setError(result.error); return }

      if (editing && form.optionGroups.length > 0) {
        for (const g of form.optionGroups) {
          const r = await addDishOption(editing.id, buildOptionPayload(g))
          if (r.error) { setError(r.error); return }
        }
      }

      onSaved()
      onClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Dish' : 'New Dish'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button size="sm" loading={isPending} onClick={handleSubmit}>
            {editing ? 'Save Changes' : 'Create Dish'}
          </Button>
        </>
      }
    >
      <div className="max-h-[68vh] overflow-y-auto -mx-6 px-6 space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600/20">{error}</p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={LABEL}>Name *</label>
            <input type="text" value={form.name} onChange={set('name')} placeholder="Dish name" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Price (₦) *</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Category *</label>
            <div className="relative">
              <select value={form.category} onChange={set('category')} className={SELECT}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{formatCategory(c)}</option>
                ))}
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div>
            <label className={LABEL}>Prep Time (min)</label>
            <input type="number" min="0" value={form.prepTime} onChange={set('prepTime')} placeholder="Optional" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Calories (kcal)</label>
            <input type="number" min="0" value={form.calories} onChange={set('calories')} placeholder="Optional" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Spicy Level (0–5)</label>
            <div className="relative">
              <select value={form.spicyLevel} onChange={set('spicyLevel')} className={SELECT}>
                {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n === 0 ? 'Not spicy' : `Level ${n}`}</option>)}
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div>
            <label className={LABEL}>Image</label>
            <ImageUploader
              value={form.image ? [form.image] : []}
              onChange={urls => setForm(f => ({ ...f, image: urls[0] ?? '' }))}
              maxImages={1}
              category="product"
            />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Optional"
              rows={3}
              className="w-full rounded-xl border-0 bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>
          <div className="col-span-2 flex items-center gap-6 flex-wrap">
            {(['isVegetarian', 'isVegan', 'isGlutenFree'] as const).map(k => (
              <label key={k} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={form[k] as boolean} onChange={setCheck(k)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                {k === 'isVegetarian' ? 'Vegetarian' : k === 'isVegan' ? 'Vegan' : 'Gluten-free'}
              </label>
            ))}
            {editing && (
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={form.isAvailable} onChange={setCheck('isAvailable')} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Available
              </label>
            )}
          </div>

          {/* ─── Option Groups ─── */}
          <div className="col-span-2 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Customization Options</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {editing ? 'Add new option groups (existing options shown on the card)' : 'e.g. Size, Extras, Add-ons'}
                </p>
              </div>
              <button
                type="button"
                onClick={addOptionGroup}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                Add Group
              </button>
            </div>

            <div className="space-y-3">
              {form.optionGroups.map((group, gi) => (
                <div key={group.uid} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  {/* Group name + controls */}
                  <div className="flex items-start gap-2 mb-3">
                    <input
                      type="text"
                      value={group.name}
                      onChange={e => updateGroup(gi, 'name', e.target.value)}
                      placeholder="Group name (e.g. Size, Extras)"
                      className={cn(INPUT, 'flex-1')}
                    />
                    <button
                      type="button"
                      onClick={() => removeOptionGroup(gi)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className={LABEL}>Selection</label>
                      <div className="relative">
                        <select
                          value={group.required ? 'true' : 'false'}
                          onChange={e => updateGroup(gi, 'required', e.target.value === 'true')}
                          className={SELECT}
                        >
                          <option value="false">Optional</option>
                          <option value="true">Required</option>
                        </select>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>Min choices</label>
                      <input type="number" min="0" max="10" value={group.minChoices} onChange={e => updateGroup(gi, 'minChoices', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Max choices</label>
                      <input type="number" min="1" max="10" value={group.maxChoices} onChange={e => updateGroup(gi, 'maxChoices', e.target.value)} className={INPUT} />
                    </div>
                  </div>

                  {/* Choices */}
                  <div className="space-y-2 mb-2">
                    {group.choices.map((choice, ci) => (
                      <div key={choice.uid} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={choice.name}
                          onChange={e => updateChoice(gi, ci, 'name', e.target.value)}
                          placeholder="Choice name"
                          className={cn(INPUT, 'flex-1')}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={choice.price}
                          onChange={e => updateChoice(gi, ci, 'price', e.target.value)}
                          placeholder="₦0"
                          className={cn(INPUT, 'w-24')}
                        />
                        <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={choice.isDefault}
                            onChange={e => updateChoice(gi, ci, 'isDefault', e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                          />
                          Default
                        </label>
                        {group.choices.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeChoice(gi, ci)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addChoice(gi)}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    + Add choice
                  </button>
                </div>
              ))}

              {form.optionGroups.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-2">No option groups yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Sub-components ──────────────────────────────────────── */

function SpicyDots({ level }: { level: number }) {
  if (level === 0) return null
  return (
    <span className="flex items-center gap-0.5" title={`Spice level ${level}/5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i <= level ? 'bg-red-500' : 'bg-slate-200')} />
      ))}
    </span>
  )
}

function DietBadge({ label, active }: { label: string; active: boolean }) {
  if (!active) return null
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">{label}</span>
  )
}

function OptionsPanel({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false)
  if (item.options.length === 0) return null
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')}>
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
        {item.options.length} option group{item.options.length > 1 ? 's' : ''}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {item.options.map(opt => (
            <div key={opt.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">{opt.name}</span>
                <span className={cn('text-[10px] font-medium rounded-full px-2 py-0.5', opt.required ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20' : 'bg-slate-100 text-slate-500')}>
                  {opt.required ? 'Required' : 'Optional'} · {opt.minChoices}–{opt.maxChoices}
                </span>
              </div>
              <ul className="space-y-1">
                {opt.choices.map(choice => (
                  <li key={choice.id} className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full', choice.isDefault ? 'bg-indigo-500' : 'bg-slate-200')} />
                      {choice.name}
                      {!choice.isAvailable && <span className="text-[10px] text-slate-400">(unavailable)</span>}
                    </span>
                    <span className="font-medium text-slate-700">
                      {choice.price > 0 ? `+${formatPrice(choice.price)}` : 'Free'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MenuItemCard({
  item,
  onEdit,
  onDelete,
  onToggle,
  isToggling,
}: {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
  onToggle: (item: MenuItem) => void
  isToggling: boolean
}) {
  return (
    <div className={cn('flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors', !item.isAvailable && 'opacity-60')}>
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8 text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-slate-900">{item.name}</h4>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                item.isAvailable ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-500 ring-slate-200')}>
                <span className={cn('h-1 w-1 rounded-full', item.isAvailable ? 'bg-emerald-500' : 'bg-slate-400')} />
                {item.isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
            {item.description && (
              <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm font-bold text-slate-900">{formatPrice(item.price)}</span>
            <button
              onClick={() => onToggle(item)}
              disabled={isToggling}
              title={item.isAvailable ? 'Mark unavailable' : 'Mark available'}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => onEdit(item)}
              title="Edit"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(item)}
              title="Delete"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2.5 flex-wrap">
          <SpicyDots level={item.spicyLevel} />
          {item.prepTime != null && <span className="text-[11px] text-slate-400">⏱ {item.prepTime} min</span>}
          {item.calories != null && <span className="text-[11px] text-slate-400">{item.calories} kcal</span>}
          <DietBadge label="V" active={item.isVegetarian} />
          <DietBadge label="VG" active={item.isVegan} />
          <DietBadge label="GF" active={item.isGlutenFree} />
        </div>

        <OptionsPanel item={item} />
      </div>
    </div>
  )
}

/* ─── Section ─────────────────────────────────────────────── */

export function VendorMenuSection({
  menu: initialMenu,
  onTotalItemsChange,
}: {
  menu: VendorMenu
  onTotalItemsChange?: (total: number) => void
}) {
  const [menu, setMenu] = useState<VendorMenu>(initialMenu)
  const [isRefreshing, startRefresh] = useTransition()
  const [isToggling, startToggle] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null)
  const [deleteError, setDeleteError] = useState('')

  function refresh() {
    startRefresh(async () => {
      const fresh = await getVendorMenu(menu.vendorId)
      if (fresh) {
        setMenu(fresh)
        onTotalItemsChange?.(fresh.totalItems)
      }
    })
  }

  function openCreate() {
    setEditingItem(null)
    setShowForm(true)
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item)
    setShowForm(true)
  }

  function openDelete(item: MenuItem) {
    setDeleteError('')
    setDeletingItem(item)
  }

  function handleToggle(item: MenuItem) {
    startToggle(async () => {
      await toggleDishAvailability(item.id, !item.isAvailable)
      refresh()
    })
  }

  function confirmDelete() {
    if (!deletingItem) return
    setDeleteError('')
    startDelete(async () => {
      const result = await deleteDish(deletingItem.id)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        setDeletingItem(null)
        refresh()
      }
    })
  }

  const categories = Object.entries(menu.menu)
  const isPending = isRefreshing || isToggling

  if (categories.length === 0 && !isRefreshing) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Menu</h2>
          <Button size="sm" onClick={openCreate}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add Dish
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <p className="text-sm text-slate-400">No menu items found</p>
          <Button size="sm" variant="secondary" onClick={openCreate}>Add first dish</Button>
        </div>

        {showForm && (
          <DishFormModal
            open={showForm}
            onClose={() => setShowForm(false)}
            onSaved={refresh}
            restaurantId={menu.vendorId}
            editing={editingItem}
          />
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Menu</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{menu.totalItems} items</span>
          {isPending && (
            <svg className="h-3.5 w-3.5 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
        <Button size="sm" onClick={openCreate}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add Dish
        </Button>
      </div>

      {/* Categories */}
      <div className="divide-y divide-slate-100">
        {categories.map(([cat, items]) => (
          <div key={cat} className="px-6 py-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">{formatCategory(cat)}</h3>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {items.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onToggle={handleToggle}
                  isToggling={isToggling}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <DishFormModal
          open={showForm}
          onClose={() => setShowForm(false)}
          onSaved={refresh}
          restaurantId={menu.vendorId}
          editing={editingItem}
        />
      )}

      {/* Delete confirm modal */}
      {deletingItem && (
        <Modal
          open={!!deletingItem}
          onClose={() => setDeletingItem(null)}
          title="Delete dish"
          description={`Delete "${deletingItem.name}"? This action cannot be undone.`}
          size="sm"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setDeletingItem(null)} disabled={isDeleting}>Cancel</Button>
              <Button variant="danger" size="sm" loading={isDeleting} onClick={confirmDelete}>Delete</Button>
            </>
          }
        >
          {deleteError ? (
            <p className="text-xs font-medium text-red-600">{deleteError}</p>
          ) : (
            <div />
          )}
        </Modal>
      )}
    </div>
  )
}
