import Image from 'next/image'
import { getInitialsFromBadgeName, type ResolvedBadgeDisplay } from '@/lib/badge-display'

type BadgeIconProps = {
  badge: ResolvedBadgeDisplay
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const SIZE_CLASSES = {
  xs: 'h-6 w-6', // plus petit
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
} as const

const TEXT_CLASSES = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
} as const

export default function BadgeIcon({ badge, size = 'sm', className = '' }: BadgeIconProps) {
  // Tooltip : titre de quête si dispo, sinon nom du badge
  const tooltip = badge.questTitle || badge.name
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${SIZE_CLASSES[size]} ${className}`}
      title={tooltip}
    >
      {badge.imageUrl ? (
        <Image
          src={badge.imageUrl}
          alt={badge.name}
          fill
          sizes={size === 'xs' ? '24px' : size === 'sm' ? '32px' : '48px'}
          className="object-contain"
        />
      ) : (
        <span className={`font-black uppercase tracking-[0.12em] text-white ${TEXT_CLASSES[size]}`}>
          {getInitialsFromBadgeName(badge.name)}
        </span>
      )}
    </div>
  )
}