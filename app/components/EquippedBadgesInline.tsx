import BadgeIcon from './BadgeIcon'
import { resolveBadgeDisplay, type BadgeDefinitionRecord } from '@/lib/badge-display'

type EquippedBadgesInlineProps = {
  badgeIds?: Array<string | null | undefined>
  badgeDefinitions?: Record<string, BadgeDefinitionRecord>
  size?: 'xs' | 'sm'
  className?: string
}

export default function EquippedBadgesInline({ badgeIds = [], badgeDefinitions, size = 'xs', className = '' }: EquippedBadgesInlineProps) {
  const badges = badgeIds
    .filter((badgeId): badgeId is string => Boolean(badgeId))
    .map((badgeId) => resolveBadgeDisplay(badgeId, badgeDefinitions?.[badgeId] || null))
    .filter((badge): badge is NonNullable<typeof badge> => Boolean(badge))
    .slice(0, 2)

  if (badges.length === 0) return null

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <BadgeIcon key={badge.badgeId} badge={badge} size="xs" />
      ))}
    </div>
  )
}