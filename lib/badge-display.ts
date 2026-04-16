import { USER_QUEST_DEFINITIONS } from './quests'
import { getQuestBadgeAsset } from './quest-badges'

export type BadgeDefinitionRecord = {
  id: string
  name: string
  description?: string | null
  image_url?: string | null
}

export type ResolvedBadgeDisplay = {
  badgeId: string
  name: string
  description: string | null
  imageUrl: string | null
  reason: string
  family?: string | null
  label?: string | null
  tierLabel?: string | null
  questId?: string | null
  questTitle?: string | null
  isQuestBadge: boolean
}

const STATIC_BADGES: Record<string, { name: string; description: string | null; imageUrl: string | null; reason: string }> = {
  admin_badge: {
    name: 'Admin verifie',
    description: 'Compte administrateur verifie de Sonar 0.52.',
    imageUrl: null,
    reason: 'Attribue automatiquement aux comptes administrateur verifies.',
  },
  devin_exact: {
    name: 'Devin exact',
    description: 'A trouve exactement le bon nombre de vues pendant le jeu des vues.',
    imageUrl: null,
    reason: 'Attribue apres une prediction exacte dans le jeu des vues.',
  },
  score_2: {
    name: 'Serie de 2',
    description: 'A enchaine 2 bonnes reponses dans le jeu des vues.',
    imageUrl: null,
    reason: 'Attribue apres une serie de bonnes reponses dans le jeu des vues.',
  },
}

export function getQuestBadgeDisplayByBadgeId(badgeId?: string | null): ResolvedBadgeDisplay | null {
  if (!badgeId || !badgeId.startsWith('quest-')) return null

  const questId = badgeId.slice('quest-'.length)
  const quest = USER_QUEST_DEFINITIONS.find((entry) => entry.id === questId)
  if (!quest?.badgeReward) return null

  return {
    badgeId,
    name: `${quest.badgeReward.label} ${quest.badgeReward.tierLabel}`,
    description: `Badge obtenu en validant la quete \"${quest.title}\".`,
    imageUrl: getQuestBadgeAsset(quest.badgeReward.family, quest.badgeReward.tierLabel),
    reason: `Obtenu en validant la quete \"${quest.title}\".`,
    family: quest.badgeReward.family,
    label: quest.badgeReward.label,
    tierLabel: quest.badgeReward.tierLabel,
    questId: quest.id,
    questTitle: quest.title,
    isQuestBadge: true,
  }
}

export function resolveBadgeDisplay(badgeId?: string | null, badgeDefinition?: BadgeDefinitionRecord | null): ResolvedBadgeDisplay | null {
  if (!badgeId) return null

  const questBadge = getQuestBadgeDisplayByBadgeId(badgeId)
  if (questBadge) return questBadge

  const staticBadge = STATIC_BADGES[badgeId]
  if (staticBadge) {
    return {
      badgeId,
      name: staticBadge.name,
      description: staticBadge.description,
      imageUrl: staticBadge.imageUrl,
      reason: staticBadge.reason,
      isQuestBadge: false,
    }
  }

  return {
    badgeId,
    name: badgeDefinition?.name || badgeId,
    description: badgeDefinition?.description || null,
    imageUrl: badgeDefinition?.image_url || null,
    reason: badgeDefinition?.description || 'Badge obtenu sur la plateforme.',
    isQuestBadge: false,
  }
}

export function getInitialsFromBadgeName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'BD'
}