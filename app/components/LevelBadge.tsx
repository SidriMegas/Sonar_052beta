import Image from 'next/image'
import { LEVEL_TIERS, getLevelInfo } from '@/lib/levels'

type LevelBadgeProps = {
  points: number
  size?: number
  className?: string
}

const TIER_BADGE_ASSETS_BY_ORDER: Partial<Record<number, string>> = {
  1: '/BadgeNiveau/BadgeBrassardN1.svg',
  2: '/BadgeNiveau/Abdge du site (palme) (2).svg',
  4: '/BadgeNiveau/Abdge du site (O2) (4).svg',
  5: '/BadgeNiveau/Abdge du site (Radar) (5).svg',
  6: '/BadgeNiveau/Abdge du site (metaux) (6).svg',
  7: '/BadgeNiveau/Abdge du site (sous marin) (7).svg',
  8: '/BadgeNiveau/Abdge du site (bonnet) (8).svg',
}

export default function LevelBadge({ points, size = 64, className = '' }: LevelBadgeProps) {
  const levelInfo = getLevelInfo(points)
  const tierOrder = LEVEL_TIERS.findIndex((tier) => tier.label === levelInfo.tier.label && tier.minLevel === levelInfo.tier.minLevel && tier.maxLevel === levelInfo.tier.maxLevel) + 1
  const badgeSrc = tierOrder > 0 ? TIER_BADGE_ASSETS_BY_ORDER[tierOrder] : undefined

  if (badgeSrc) {
    return (
      <div className={`relative shrink-0 overflow-hidden ${className}`.trim()} style={{ width: size, height: size }}>
        <Image
          src={badgeSrc}
          alt={`Badge niveau ${levelInfo.level}`}
          fill
          sizes={`${size}px`}
          className="object-contain"
          priority={false}
        />
      </div>
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-amber-200/20 bg-amber-300/10 text-2xl ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-label={`Niveau ${levelInfo.level}`}
      title={`Niveau ${levelInfo.level} - ${levelInfo.tier.label}`}
    >
      <span aria-hidden="true">{levelInfo.tier.icon}</span>
    </div>
  )
}