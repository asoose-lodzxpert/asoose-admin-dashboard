'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  adjustPropertyOwnerCommission,
  resetPropertyOwnerPassword,
  type PropertyOwnerPasswordResetResult,
} from '@/app/actions/property-owners'
import { CommissionSection } from '@/app/components/commission-section'
import { Button } from '@/app/components/ui/button'
import { DetailCard, InfoGrid, InfoRow, formatDate } from '@/app/components/ui/detail'
import { Modal } from '@/app/components/ui/modal'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import type { PropertyOwnerDetail } from '@/app/lib/types'

const STATUS_STYLES: Record<PropertyOwnerDetail['verificationStatus'], string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  VERIFIED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJECTED: 'bg-red-50 text-red-700 ring-red-600/20',
  SUSPENDED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

const DOCUMENTS: { key: keyof PropertyOwnerDetail['documents']; label: string }[] = [
  { key: 'businessLicenseFile', label: 'Business License' },
  { key: 'idDocumentFile', label: 'Identity Document' },
  { key: 'propertyOwnershipDocFile', label: 'Property Ownership Document' },
]

export function PropertyOwnerDetailClient({
  propertyOwner: initialPropertyOwner,
}: {
  propertyOwner: PropertyOwnerDetail
}) {
  const toast = useToast()
  const [propertyOwner, setPropertyOwner] = useState(initialPropertyOwner)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [passwordResetResult, setPasswordResetResult] = useState<PropertyOwnerPasswordResetResult | null>(null)
  const [passwordResetError, setPasswordResetError] = useState('')
  const [passwordResetPending, startPasswordResetTransition] = useTransition()
  const initials = propertyOwner.fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  function closePasswordReset() {
    if (passwordResetPending) return
    setShowPasswordReset(false)
    setPasswordResetResult(null)
    setPasswordResetError('')
  }

  function handlePasswordReset() {
    startPasswordResetTransition(async () => {
      setPasswordResetError('')
      const result = await resetPropertyOwnerPassword(propertyOwner.id)
      if (result.error) {
        setPasswordResetError(result.error)
        toast.error(result.error)
        return
      }
      if (!result.data) {
        const error = 'The password was reset, but no temporary password was returned.'
        setPasswordResetError(error)
        toast.error(error)
        return
      }
      setPasswordResetResult(result.data)
      toast.success('Property owner password reset successfully.')
    })
  }

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4">
        <Link
          href="/dashboard/partners/property-owners"
          className="mb-3 flex w-fit items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700"
        >
          <span aria-hidden="true">←</span>
          Property Owners
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-base font-bold text-indigo-700">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-bold text-slate-900">{propertyOwner.fullName}</h1>
                <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[propertyOwner.verificationStatus])}>
                  {propertyOwner.verificationStatus}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {[propertyOwner.userEmail, propertyOwner.userPhone].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPasswordReset(true)}
          >
            Reset Password
          </Button>
        </div>
      </div>

      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <DetailCard title="Owner & Business Information">
              <InfoGrid>
                <InfoRow label="Owner Name" value={propertyOwner.fullName} />
                <InfoRow label="User ID" value={propertyOwner.userId} />
                <InfoRow label="User Email" value={propertyOwner.userEmail} />
                <InfoRow label="User Phone" value={propertyOwner.userPhone} />
                <InfoRow label="Business Name" value={propertyOwner.businessName} />
                <InfoRow label="Business Email" value={propertyOwner.businessEmail} />
                <InfoRow label="Business Phone" value={propertyOwner.businessPhone} />
              </InfoGrid>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Description</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{propertyOwner.businessDescription || '—'}</p>
              </div>
            </DetailCard>

            <DetailCard title="Address">
              <InfoGrid>
                <InfoRow label="Street" value={propertyOwner.address.street} />
                <InfoRow label="City" value={propertyOwner.address.city} />
                <InfoRow label="State" value={propertyOwner.address.state} />
                <InfoRow label="ZIP Code" value={propertyOwner.address.zipCode} />
                <InfoRow label="Country" value={propertyOwner.address.country} />
                <InfoRow label="Latitude" value={propertyOwner.address.latitude} />
                <InfoRow label="Longitude" value={propertyOwner.address.longitude} />
              </InfoGrid>
            </DetailCard>

            <DetailCard title="Documents">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {DOCUMENTS.map((document) => {
                  const url = propertyOwner.documents[document.key]
                  return (
                    <div key={document.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-700">{document.label}</p>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          View document
                        </a>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">Not uploaded</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </DetailCard>
          </div>

          <div className="space-y-6">
            <CommissionSection
              commissionPercent={propertyOwner.customCommissionPercent}
              onAdjust={async (payload) => {
                const result = await adjustPropertyOwnerCommission(propertyOwner.id, payload)
                if (result.error) return { error: result.error }
                if (result.propertyOwner) setPropertyOwner(result.propertyOwner)
                return {
                  commissionPercent: result.propertyOwner?.customCommissionPercent ?? null,
                }
              }}
            />

            <DetailCard title="Status">
              <InfoGrid className="grid-cols-1">
                <InfoRow label="Verification" value={propertyOwner.verificationStatus} />
                <InfoRow label="Verified" value={propertyOwner.isVerified ? 'Yes' : 'No'} />
                <InfoRow label="Created" value={formatDate(propertyOwner.createdAt)} />
                <InfoRow label="Last Updated" value={formatDate(propertyOwner.updatedAt)} />
              </InfoGrid>
            </DetailCard>
          </div>
        </div>
      </div>

      <Modal
        open={showPasswordReset}
        onClose={closePasswordReset}
        title={passwordResetResult ? 'Password Reset Successful' : 'Reset Property Owner Password'}
        description={passwordResetResult
          ? 'Save or share this credential securely before closing.'
          : `This will replace the current password for ${propertyOwner.fullName}.`}
        size="sm"
        footer={passwordResetResult ? (
          <Button size="sm" onClick={closePasswordReset}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" disabled={passwordResetPending} onClick={closePasswordReset}>
              Cancel
            </Button>
            <Button size="sm" loading={passwordResetPending} onClick={handlePasswordReset}>
              Reset Password
            </Button>
          </>
        )}
      >
        {passwordResetResult ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-1.5 text-xs font-semibold text-amber-800">Temporary Password</p>
              <p className="break-all font-mono text-lg font-bold tracking-wider text-amber-900">
                {passwordResetResult.temporaryPassword}
              </p>
              <p className="mt-2 text-xs text-amber-700">This password will not be shown again after this dialog closes.</p>
            </div>
            <p className={cn('text-sm', passwordResetResult.emailSent ? 'text-emerald-700' : 'text-amber-700')}>
              {passwordResetResult.emailSent
                ? `The temporary password was emailed to ${propertyOwner.userEmail}.`
                : 'The email could not be sent. Share the temporary password securely with the property owner.'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm leading-6 text-slate-600">
              The property owner&apos;s current password will stop working immediately. A new temporary password will be generated.
            </p>
            {passwordResetError && <p className="mt-3 text-sm text-red-600">{passwordResetError}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
