import { isAdminRole } from '@/lib/admin'

type AdminVerificationBadgeProps = {
  role?: string | null
  compact?: boolean
}

export default function AdminVerificationBadge({ role, compact = false }: AdminVerificationBadgeProps) {
  if (!isAdminRole(role)) return null

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-lime-300/38 bg-lime-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100">
        <span aria-hidden="true">✔</span>
        Verifie
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/38 bg-lime-300/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-lime-100 shadow-[0_0_18px_rgba(163,230,53,0.14)]">
      <span aria-hidden="true">✔</span>
      Badge D'Authentification
    </span>
  )
}