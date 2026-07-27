'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import type { City } from '@/app/lib/types'
import { createCity, deleteCity, setCityActive, updateCityBoundary } from '@/app/actions/cities'

const INPUT_CLS =
  'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'

interface FormState {
  name: string
  state: string
  boundary: string
}

const EMPTY_FORM: FormState = { name: '', state: '', boundary: '' }

export function CitiesClient({ initialCities }: { initialCities: City[] }) {
  const toast = useToast()
  const [cities, setCities] = useState<City[]>(initialCities)
  const [isPending, startTransition] = useTransition()

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [createError, setCreateError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<City | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const [boundaryTarget, setBoundaryTarget] = useState<City | null>(null)
  const [boundaryText, setBoundaryText] = useState('')
  const [boundaryError, setBoundaryError] = useState('')

  function set(key: keyof FormState, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreateError('')
    setShowCreate(true)
  }

  function handleCreate() {
    let boundary: unknown
    try {
      boundary = JSON.parse(form.boundary)
    } catch {
      setCreateError('Coordinates must be valid JSON (array of [lng, lat] pairs).')
      return
    }
    if (!Array.isArray(boundary) || boundary.length < 3) {
      setCreateError('Boundary must be an array of at least 3 coordinate pairs.')
      return
    }

    if (!form.name.trim() || !form.state.trim()) {
      setCreateError('Name and state are required.')
      return
    }

    startTransition(async () => {
      const res = await createCity({
        name: form.name.trim(),
        state: form.state.trim(),
        boundary,
      })
      if (res.error) { setCreateError(res.error); toast.error(res.error); return }
      setCities((prev) => [...prev, res.data as City])
      setShowCreate(false)
      toast.success('City added.')
    })
  }

  function toggleActive(city: City) {
    startTransition(async () => {
      const res = await setCityActive(city.id, !city.isActive)
      if (res.error) { toast.error(res.error); return }
      setCities((prev) => prev.map((c) => c.id === city.id ? res.data as City : c))
      toast.success(city.isActive ? 'City deactivated.' : 'City activated.')
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const res = await deleteCity(deleteTarget.id)
      if (res.error) { setDeleteError(res.error); toast.error(res.error); return }
      setCities((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('City deleted.')
    })
  }

  function openBoundary(city: City) {
    setBoundaryText('')
    setBoundaryError('')
    setBoundaryTarget(city)
  }

  function handleBoundarySave() {
    if (!boundaryTarget) return
    let coordinates: unknown
    try {
      coordinates = JSON.parse(boundaryText)
    } catch {
      setBoundaryError('Coordinates must be valid JSON (array of [lng, lat] pairs).')
      return
    }
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      setBoundaryError('Boundary must be an array of at least 3 coordinate pairs.')
      return
    }
    startTransition(async () => {
      const res = await updateCityBoundary(boundaryTarget.id, coordinates as number[][])
      if (res.error) { setBoundaryError(res.error); toast.error(res.error); return }
      setCities((prev) => prev.map((c) => c.id === boundaryTarget.id ? res.data as City : c))
      setBoundaryTarget(null)
      toast.success('City boundary updated.')
    })
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cities</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage service cities and their geographic boundaries.</p>
        </div>
        <Button onClick={openCreate}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add City
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {cities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-slate-400">
                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">No cities yet</p>
            <p className="mt-0.5 text-xs text-slate-400">Add a city to define a service area.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">State</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Country</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cities.map((city) => (
                  <tr key={city.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{city.name}</td>
                    <td className="px-5 py-3.5 text-slate-500">{city.state}</td>
                    <td className="px-5 py-3.5 text-slate-500">{city.country}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActive(city)}
                        disabled={isPending}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-opacity disabled:opacity-60',
                          city.isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 ring-slate-500/20 hover:bg-slate-200'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', city.isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
                        {city.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openBoundary(city)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Edit boundary"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setDeleteError(''); setDeleteTarget(city) }}
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
        title="Add City"
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
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => { set('name', e.target.value); setCreateError('') }}
              placeholder="e.g. Lagos"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">State <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => { set('state', e.target.value); setCreateError('') }}
              placeholder="e.g. Lagos"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Boundary <span className="text-red-500">*</span>
            </label>
            <p className="mb-2 text-xs text-slate-400">Paste the array of <code className="rounded bg-slate-100 px-1 py-0.5">[lng, lat]</code> coordinate pairs that form the city boundary ring.</p>
            <textarea
              value={form.boundary}
              onChange={(e) => { set('boundary', e.target.value); setCreateError('') }}
              rows={8}
              placeholder={'[\n  [13.0495109, 11.9131618],\n  [13.1770469, 11.9254485],\n  ...\n]'}
              className={cn(INPUT_CLS, 'resize-y font-mono text-xs')}
              spellCheck={false}
            />
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Delete City"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        {deleteError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{deleteError}</div>
        )}
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>? This will remove the city and its service boundary.
        </p>
      </Modal>

      {/* Edit boundary modal */}
      <Modal
        open={boundaryTarget != null}
        onClose={() => setBoundaryTarget(null)}
        title={`Edit Boundary — ${boundaryTarget?.name ?? ''}`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setBoundaryTarget(null)}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={handleBoundarySave}>Save</Button>
          </>
        }
      >
        {boundaryError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{boundaryError}</div>
        )}
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
          Boundary <span className="text-red-500">*</span>
        </label>
        <p className="mb-2 text-xs text-slate-400">Paste the array of <code className="rounded bg-slate-100 px-1 py-0.5">[lng, lat]</code> coordinate pairs that form the new city boundary line.</p>
        <textarea
          value={boundaryText}
          onChange={(e) => { setBoundaryText(e.target.value); setBoundaryError('') }}
          rows={8}
          placeholder={'[\n  [13.10, 11.80],\n  [13.20, 11.80],\n  [13.20, 11.90],\n  [13.10, 11.90]\n]'}
          className={cn(INPUT_CLS, 'resize-y font-mono text-xs')}
          spellCheck={false}
        />
      </Modal>
    </main>
  )
}
