export const XP_PER_LEVEL = 300
export const MAX_LEVEL = 50

export type LevelTier = {
  minLevel: number
  maxLevel: number
  icon: string
  label: string
}

export type LevelInfo = {
  level: number
  currentFloor: number
  nextLevel: number
  progress: number
  xpIntoLevel: number
  xpNeededForNextLevel: number
  isMaxLevel: boolean
  tier: LevelTier
}

export const LEVEL_TIERS: LevelTier[] = [
  { minLevel: 1, maxLevel: 4, icon: '', label: 'Brassard rose' },
  { minLevel: 5, maxLevel: 9, icon: '🌴', label: 'Palme jaune' },
  { minLevel: 10, maxLevel: 14, icon: '🤿', label: 'Masque et tuba' },
  { minLevel: 15, maxLevel: 19, icon: '🫧', label: 'Bouteille a oxygene' },
  { minLevel: 20, maxLevel: 24, icon: '🔦', label: 'Projecteur sous marin' },
  { minLevel: 25, maxLevel: 29, icon: '🧲', label: 'Detecteur de metaux' },
  { minLevel: 30, maxLevel: 34, icon: '📡', label: 'Radar' },
  { minLevel: 35, maxLevel: 39, icon: '⚓', label: 'Sous marin' },
  { minLevel: 40, maxLevel: 44, icon: '🧢', label: 'Bonnet rouge' },
  { minLevel: 45, maxLevel: 50, icon: '🔱', label: 'Trident dore' },
]

export function getXpForLevel(level: number) {
  const safeLevel = Math.max(1, Math.min(level, MAX_LEVEL))
  return (safeLevel - 1) * XP_PER_LEVEL
}

export function getLevelTier(level: number) {
  const safeLevel = Math.max(1, Math.min(level, MAX_LEVEL))
  return LEVEL_TIERS.find((tier) => safeLevel >= tier.minLevel && safeLevel <= tier.maxLevel) || LEVEL_TIERS[0]
}

export function getLevelInfo(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(totalXp))
  const derivedLevel = Math.floor(safeXp / XP_PER_LEVEL) + 1
  const level = Math.min(MAX_LEVEL, Math.max(1, derivedLevel))
  const currentFloor = getXpForLevel(level)
  const isMaxLevel = level >= MAX_LEVEL
  const nextLevel = isMaxLevel ? currentFloor : getXpForLevel(level + 1)
  const xpIntoLevel = safeXp - currentFloor
  const xpNeededForNextLevel = isMaxLevel ? 0 : Math.max(0, nextLevel - safeXp)
  const progress = isMaxLevel ? 1 : xpIntoLevel / XP_PER_LEVEL

  return {
    level,
    currentFloor,
    nextLevel,
    progress: Math.max(0, Math.min(progress, 1)),
    xpIntoLevel,
    xpNeededForNextLevel,
    isMaxLevel,
    tier: getLevelTier(level),
  }
}