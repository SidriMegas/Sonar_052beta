import Image from 'next/image'
import { getQuestBadgeAsset } from '@/lib/quest-badges'

type QuestBadgePreviewProps = {
  family: string
  label: string
  tierLabel: string
  size?: 'xs' | 'sm' | 'md'
}

const FAMILY_ICONS: Record<string, string> = {
  'paper-plane': '✈',
  'like-logo': '♥',
  'watch-login': '⌚',
  'feather-feedback': '🪶',
  'micro-artist': '🎤',
  'trophy-digger': '🏆',
  'trophy-last': '🥇',
  'trophy-musique': '🎼',
  'trophy-prod': '🎛',
  'trophy-jeu-vue': '👁',
  'trophy-jeu-paris': '🎲',
  'trophy-jeu-playlist': '🎵',
  'crown-throne': '👑',
  'crown-autopromo': '♛',
  'advisor-throne': '🃏',
  'dice-pmu-proposal': '🎲',
  'tie-pmu-accepted': '👔',
  'seahorse-pmu-bet': '⚓',
  'lucky-pmu-win': '🍀',
}

function getTierClasses(tierLabel: string) {
  const normalized = tierLabel.toLowerCase()

  if (normalized.includes('top 1') || normalized.includes('or royal') || normalized.includes('or')) {
    return 'border-yellow-300/40 bg-[linear-gradient(135deg,rgba(250,204,21,0.28),rgba(234,179,8,0.08))] text-yellow-50 shadow-[0_0_28px_rgba(250,204,21,0.18)]'
  }
  if (normalized.includes('top 10') || normalized.includes('platine')) {
    return 'border-slate-200/40 bg-[linear-gradient(135deg,rgba(226,232,240,0.24),rgba(148,163,184,0.08))] text-slate-50 shadow-[0_0_24px_rgba(226,232,240,0.16)]'
  }
  if (normalized.includes('top 50') || normalized.includes('argent')) {
    return 'border-zinc-300/30 bg-[linear-gradient(135deg,rgba(212,212,216,0.24),rgba(113,113,122,0.08))] text-zinc-50 shadow-[0_0_24px_rgba(212,212,216,0.12)]'
  }
  if (normalized.includes('top 100') || normalized.includes('bronze')) {
    return 'border-orange-300/32 bg-[linear-gradient(135deg,rgba(251,146,60,0.24),rgba(194,65,12,0.08))] text-orange-50 shadow-[0_0_22px_rgba(251,146,60,0.14)]'
  }
  if (normalized.includes('vert neon') || normalized.includes('neon')) {
    return 'border-lime-300/40 bg-[linear-gradient(135deg,rgba(163,230,53,0.22),rgba(34,197,94,0.08))] text-lime-50 shadow-[0_0_24px_rgba(163,230,53,0.18)]'
  }
  if (normalized.includes('pierre') || normalized.includes('blanc')) {
    return 'border-cyan-200/28 bg-[linear-gradient(135deg,rgba(125,211,252,0.2),rgba(34,211,238,0.06))] text-cyan-50 shadow-[0_0_20px_rgba(125,211,252,0.12)]'
  }
  if (normalized.includes('fer a cheval')) {
    return 'border-emerald-300/34 bg-[linear-gradient(135deg,rgba(52,211,153,0.24),rgba(16,185,129,0.08))] text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,0.14)]'
  }
  if (normalized.includes('caca')) {
    return 'border-amber-600/34 bg-[linear-gradient(135deg,rgba(180,83,9,0.22),rgba(120,53,15,0.08))] text-amber-50 shadow-[0_0_18px_rgba(180,83,9,0.14)]'
  }

  const match = normalized.match(/palier\s+(\d+)/)
  const palette = [
    'border-cyan-300/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.2),rgba(8,47,73,0.08))] text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.12)]',
    'border-fuchsia-300/30 bg-[linear-gradient(135deg,rgba(232,121,249,0.22),rgba(112,26,117,0.08))] text-fuchsia-50 shadow-[0_0_20px_rgba(232,121,249,0.12)]',
    'border-violet-300/30 bg-[linear-gradient(135deg,rgba(167,139,250,0.22),rgba(76,29,149,0.08))] text-violet-50 shadow-[0_0_20px_rgba(167,139,250,0.12)]',
    'border-amber-300/32 bg-[linear-gradient(135deg,rgba(251,191,36,0.22),rgba(146,64,14,0.08))] text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.12)]',
    'border-emerald-300/32 bg-[linear-gradient(135deg,rgba(52,211,153,0.22),rgba(6,95,70,0.08))] text-emerald-50 shadow-[0_0_20px_rgba(52,211,153,0.12)]',
    'border-rose-300/32 bg-[linear-gradient(135deg,rgba(251,113,133,0.22),rgba(136,19,55,0.08))] text-rose-50 shadow-[0_0_20px_rgba(251,113,133,0.12)]',
    'border-sky-300/32 bg-[linear-gradient(135deg,rgba(125,211,252,0.22),rgba(3,105,161,0.08))] text-sky-50 shadow-[0_0_20px_rgba(125,211,252,0.12)]',
    'border-red-300/32 bg-[linear-gradient(135deg,rgba(252,165,165,0.22),rgba(127,29,29,0.08))] text-red-50 shadow-[0_0_20px_rgba(252,165,165,0.12)]',
  ]

  if (match) {
    const tierIndex = Number(match[1])
    return palette[(tierIndex - 1 + palette.length) % palette.length]
  }

  return 'border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] text-white shadow-[0_0_18px_rgba(255,255,255,0.08)]'
}

export default function QuestBadgePreview({ family, label, tierLabel, size = 'md' }: QuestBadgePreviewProps) {
  const icon = FAMILY_ICONS[family] || '◆'
  const badgeSrc = getQuestBadgeAsset(family, tierLabel)
  const sizeClasses = size === 'xs'
    ? {
        shell: 'h-10 w-10 rounded-[12px]',
        icon: 'text-lg',
        tier: 'text-[8px]',
      }
    : size === 'sm'
    ? {
        shell: 'h-24 w-24 rounded-[22px]',
        icon: 'text-4xl',
        tier: 'text-[9px]',
      }
    : {
        shell: 'h-28 w-28 rounded-[26px]',
        icon: 'text-5xl',
        tier: 'text-[10px]',
      }

  return (
    <div className={`relative flex shrink-0 flex-col items-center justify-center overflow-hidden border ${sizeClasses.shell} ${getTierClasses(tierLabel)}`} title={`${label} - ${tierLabel}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_55%)]" />
      {badgeSrc ? (
        <Image
          src={badgeSrc}
          alt={`${label} ${tierLabel}`}
          fill
          sizes={size === 'xs' ? '40px' : size === 'sm' ? '96px' : '112px'}
          className={`relative object-contain ${size === 'xs' ? 'p-1' : 'p-2'}`}
        />
      ) : (
        <span className={`relative ${sizeClasses.icon}`} aria-hidden="true">{icon}</span>
      )}
    </div>
  )
}