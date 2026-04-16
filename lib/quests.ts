export type QuestCategoryId = 'journaliere' | 'profil' | 'decouverte' | 'partage' | 'social' | 'feedback' | 'arene' | 'regularite'

export type QuestBadgeReward = {
  family: string
  label: string
  tierLabel: string
  colorMode: 'tiered'
}

export type UserQuestDefinition = {
  id: string
  title: string
  description: string
  category: QuestCategoryId
  seriesLabel?: string
  pearlReward: number
  xpReward: number
  badgeReward?: QuestBadgeReward | null
  target: number
  unitLabel: string
  estimatedMinutes: number
}

export type QuestCategory = {
  id: QuestCategoryId
  label: string
  description: string
}

type LeaderboardGroup = {
  id: string
  label: string
  badgeFamily: string
}

type LeaderboardTier = {
  suffix: string
  rankLabel: string
  topRank: number
  pearlReward: number
  xpReward: number
  badgeTier: string
}

export const QUEST_CATEGORIES: QuestCategory[] = [
  { id: 'journaliere', label: 'Quete journaliere', description: 'Objectifs quotidiens rapides a completer pour faire tourner la plateforme.' },
  { id: 'profil', label: 'Profil', description: 'Progression longue du compte avec paliers de partage, likes et classements.' },
  { id: 'decouverte', label: 'Decouverte', description: 'Explorer la plateforme et lancer les premiers usages.' },
  { id: 'partage', label: 'Partage', description: 'Poster, proposer et faire vivre ses morceaux.' },
  { id: 'social', label: 'Social', description: 'Construire des liens avec les autres diggers.' },
  { id: 'feedback', label: 'Feedback', description: 'Donner des retours utiles et debloquer l entraide.' },
  { id: 'arene', label: 'Arene', description: 'Jouer dans les modules competitifs du site.' },
  { id: 'regularite', label: 'Regularite', description: 'Revenir souvent et installer un rythme.' },
]

const DAILY_QUESTS: UserQuestDefinition[] = [
  {
    id: 'daily-share-one-track',
    title: 'Partager 1 musique',
    description: 'Poster un morceau aujourd hui.',
    category: 'journaliere',
    seriesLabel: 'Partage quotidien',
    pearlReward: 20,
    xpReward: 10,
    target: 1,
    unitLabel: 'partage',
    estimatedMinutes: 4,
  },
  {
    id: 'daily-like-two-tracks',
    title: 'Liker 2 musiques',
    description: 'Envoyer 2 likes sur des morceaux differents.',
    category: 'journaliere',
    seriesLabel: 'Likes quotidiens',
    pearlReward: 20,
    xpReward: 10,
    target: 2,
    unitLabel: 'likes',
    estimatedMinutes: 3,
  },
  {
    id: 'daily-coffre-attempt',
    title: 'Tenter une combinaison du coffre',
    description: 'Faire 1 tentative sur le coffre du jour.',
    category: 'journaliere',
    seriesLabel: 'Coffre quotidien',
    pearlReward: 45,
    xpReward: 10,
    target: 1,
    unitLabel: 'tentative',
    estimatedMinutes: 5,
  },
  {
    id: 'daily-vote-throne',
    title: 'Voter pour Le Trone',
    description: 'Participer 1 fois au vote du Trone des abysses.',
    category: 'journaliere',
    seriesLabel: 'Arene quotidienne',
    pearlReward: 10,
    xpReward: 10,
    target: 1,
    unitLabel: 'vote',
    estimatedMinutes: 2,
  },
  {
    id: 'daily-vote-playlist',
    title: 'Voter pour Playlist democratique',
    description: 'Voter 1 fois dans Playlist democratique.',
    category: 'journaliere',
    seriesLabel: 'Arene quotidienne',
    pearlReward: 10,
    xpReward: 10,
    target: 1,
    unitLabel: 'vote',
    estimatedMinutes: 2,
  },
]

const PROFILE_SHARE_QUESTS: UserQuestDefinition[] = [
  { id: 'profile-share-5', title: 'Partager 5 musiques', description: 'Atteindre 5 morceaux publies sur le profil.', category: 'profil', seriesLabel: 'Partager', pearlReward: 10, xpReward: 20, badgeReward: { family: 'paper-plane', label: 'Badge avion en papier', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 5, unitLabel: 'musiques', estimatedMinutes: 18 },
  { id: 'profile-share-10', title: 'Partager 10 musiques', description: 'Atteindre 10 morceaux publies sur le profil.', category: 'profil', seriesLabel: 'Partager', pearlReward: 30, xpReward: 20, badgeReward: { family: 'paper-plane', label: 'Badge avion en papier', tierLabel: 'Palier 2', colorMode: 'tiered' }, target: 10, unitLabel: 'musiques', estimatedMinutes: 32 },
  { id: 'profile-share-20', title: 'Partager 20 musiques', description: 'Atteindre 20 morceaux publies sur le profil.', category: 'profil', seriesLabel: 'Partager', pearlReward: 50, xpReward: 35, badgeReward: { family: 'paper-plane', label: 'Badge avion en papier', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 20, unitLabel: 'musiques', estimatedMinutes: 55 },
  { id: 'profile-share-50', title: 'Partager 50 musiques', description: 'Atteindre 50 morceaux publies sur le profil.', category: 'profil', seriesLabel: 'Partager', pearlReward: 100, xpReward: 100, badgeReward: { family: 'paper-plane', label: 'Badge avion en papier', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 50, unitLabel: 'musiques', estimatedMinutes: 120 },
  { id: 'profile-share-75', title: 'Partager 75 musiques', description: 'Atteindre 75 morceaux publies sur le profil.', category: 'profil', seriesLabel: 'Partager', pearlReward: 100, xpReward: 100, badgeReward: { family: 'paper-plane', label: 'Badge avion en papier', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 75, unitLabel: 'musiques', estimatedMinutes: 180 },
  { id: 'profile-share-100', title: 'Partager 100 musiques', description: 'Atteindre 100 morceaux publies sur le profil.', category: 'profil', seriesLabel: 'Partager', pearlReward: 200, xpReward: 150, badgeReward: { family: 'paper-plane', label: 'Badge avion en papier', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 100, unitLabel: 'musiques', estimatedMinutes: 240 },
]

const PROFILE_LIKE_QUESTS: UserQuestDefinition[] = [
  { id: 'profile-like-5', title: 'Liker 5 musiques', description: 'Envoyer 5 likes sur des morceaux differents.', category: 'profil', seriesLabel: 'Like', pearlReward: 5, xpReward: 15, badgeReward: { family: 'like-logo', label: 'Badge logo like', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 5, unitLabel: 'likes', estimatedMinutes: 10 },
  { id: 'profile-like-10', title: 'Liker 10 musiques', description: 'Envoyer 10 likes sur des morceaux differents.', category: 'profil', seriesLabel: 'Like', pearlReward: 15, xpReward: 15, badgeReward: { family: 'like-logo', label: 'Badge logo like', tierLabel: 'Palier 2', colorMode: 'tiered' }, target: 10, unitLabel: 'likes', estimatedMinutes: 18 },
  { id: 'profile-like-25', title: 'Liker 25 musiques', description: 'Envoyer 25 likes sur des morceaux differents.', category: 'profil', seriesLabel: 'Like', pearlReward: 25, xpReward: 35, badgeReward: { family: 'like-logo', label: 'Badge logo like', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 25, unitLabel: 'likes', estimatedMinutes: 35 },
  { id: 'profile-like-50', title: 'Liker 50 musiques', description: 'Envoyer 50 likes sur des morceaux differents.', category: 'profil', seriesLabel: 'Like', pearlReward: 50, xpReward: 100, badgeReward: { family: 'like-logo', label: 'Badge logo like', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 50, unitLabel: 'likes', estimatedMinutes: 70 },
  { id: 'profile-like-75', title: 'Liker 75 musiques', description: 'Envoyer 75 likes sur des morceaux differents.', category: 'profil', seriesLabel: 'Like', pearlReward: 75, xpReward: 150, badgeReward: { family: 'like-logo', label: 'Badge logo like', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 75, unitLabel: 'likes', estimatedMinutes: 95 },
  { id: 'profile-like-100', title: 'Liker 100 musiques', description: 'Envoyer 100 likes sur des morceaux differents.', category: 'profil', seriesLabel: 'Like', pearlReward: 100, xpReward: 200, badgeReward: { family: 'like-logo', label: 'Badge logo like', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 100, unitLabel: 'likes', estimatedMinutes: 120 },
]

const PROFILE_LOGIN_QUESTS: UserQuestDefinition[] = [
  { id: 'profile-login-7', title: 'Connecte toi 7 jours consecutifs', description: 'Tenir une serie de 7 jours de connexion consecutive.', category: 'profil', seriesLabel: 'Connexion', pearlReward: 100, xpReward: 50, badgeReward: { family: 'watch-login', label: 'Montre', tierLabel: '7 jours', colorMode: 'tiered' }, target: 7, unitLabel: 'jours', estimatedMinutes: 20 },
  { id: 'profile-login-14', title: 'Connecte toi 14 jours consecutifs', description: 'Tenir une serie de 14 jours de connexion consecutive.', category: 'profil', seriesLabel: 'Connexion', pearlReward: 150, xpReward: 100, badgeReward: { family: 'watch-login', label: 'Montre', tierLabel: '14 jours', colorMode: 'tiered' }, target: 14, unitLabel: 'jours', estimatedMinutes: 40 },
  { id: 'profile-login-21', title: 'Connecte toi 21 jours consecutifs', description: 'Tenir une serie de 21 jours de connexion consecutive.', category: 'profil', seriesLabel: 'Connexion', pearlReward: 200, xpReward: 100, badgeReward: { family: 'watch-login', label: 'Montre', tierLabel: '21 jours', colorMode: 'tiered' }, target: 21, unitLabel: 'jours', estimatedMinutes: 60 },
  { id: 'profile-login-30', title: 'Connecte toi 30 jours consecutifs', description: 'Tenir une serie de 30 jours de connexion consecutive.', category: 'profil', seriesLabel: 'Connexion', pearlReward: 300, xpReward: 100, badgeReward: { family: 'watch-login', label: 'Montre', tierLabel: '30 jours', colorMode: 'tiered' }, target: 30, unitLabel: 'jours', estimatedMinutes: 85 },
]

const FEEDBACK_GIVEN_QUESTS: UserQuestDefinition[] = [
  { id: 'feedback-give-1', title: 'Faire 1 feedback', description: 'Envoyer 1 feedback sur un morceau.', category: 'feedback', seriesLabel: 'Feedback - Donner', pearlReward: 25, xpReward: 10, badgeReward: { family: 'feather-feedback', label: 'Plume', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'feedbacks', estimatedMinutes: 4 },
  { id: 'feedback-give-5', title: 'Faire 5 feedbacks', description: 'Envoyer 5 feedbacks sur des morceaux.', category: 'feedback', seriesLabel: 'Feedback - Donner', pearlReward: 50, xpReward: 25, badgeReward: { family: 'feather-feedback', label: 'Plume', tierLabel: 'Palier 2', colorMode: 'tiered' }, target: 5, unitLabel: 'feedbacks', estimatedMinutes: 15 },
  { id: 'feedback-give-10', title: 'Faire 10 feedbacks', description: 'Envoyer 10 feedbacks sur des morceaux.', category: 'feedback', seriesLabel: 'Feedback - Donner', pearlReward: 100, xpReward: 50, badgeReward: { family: 'feather-feedback', label: 'Plume', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 10, unitLabel: 'feedbacks', estimatedMinutes: 30 },
  { id: 'feedback-give-25', title: 'Faire 25 feedbacks', description: 'Envoyer 25 feedbacks sur des morceaux.', category: 'feedback', seriesLabel: 'Feedback - Donner', pearlReward: 250, xpReward: 100, badgeReward: { family: 'feather-feedback', label: 'Plume', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 25, unitLabel: 'feedbacks', estimatedMinutes: 60 },
  { id: 'feedback-give-50', title: 'Faire 50 feedbacks', description: 'Envoyer 50 feedbacks sur des morceaux.', category: 'feedback', seriesLabel: 'Feedback - Donner', pearlReward: 500, xpReward: 300, badgeReward: { family: 'feather-feedback', label: 'Plume', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 50, unitLabel: 'feedbacks', estimatedMinutes: 110 },
  { id: 'feedback-give-75', title: 'Faire 75 feedbacks', description: 'Envoyer 75 feedbacks sur des morceaux.', category: 'feedback', seriesLabel: 'Feedback - Donner', pearlReward: 700, xpReward: 300, badgeReward: { family: 'feather-feedback', label: 'Plume', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 75, unitLabel: 'feedbacks', estimatedMinutes: 155 },
  { id: 'feedback-give-100', title: 'Faire 100 feedbacks', description: 'Envoyer 100 feedbacks sur des morceaux.', category: 'feedback', seriesLabel: 'Feedback - Donner', pearlReward: 1000, xpReward: 500, badgeReward: { family: 'feather-feedback', label: 'Plume', tierLabel: 'Palier 7', colorMode: 'tiered' }, target: 100, unitLabel: 'feedbacks', estimatedMinutes: 210 },
]

const ARTIST_PROPOSAL_QUESTS: UserQuestDefinition[] = [
  { id: 'artist-proposal-1', title: 'Proposer 1 musique', description: 'Publier 1 musique sur la plateforme.', category: 'profil', seriesLabel: 'Proposer', pearlReward: 25, xpReward: 10, badgeReward: { family: 'micro-artist', label: 'Micro', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'musiques', estimatedMinutes: 4 },
  { id: 'artist-proposal-5', title: 'Proposer 5 musiques', description: 'Publier 5 musiques sur la plateforme.', category: 'profil', seriesLabel: 'Proposer', pearlReward: 50, xpReward: 25, badgeReward: { family: 'micro-artist', label: 'Micro', tierLabel: 'Palier 2', colorMode: 'tiered' }, target: 5, unitLabel: 'musiques', estimatedMinutes: 15 },
  { id: 'artist-proposal-10', title: 'Proposer 10 musiques', description: 'Publier 10 musiques sur la plateforme.', category: 'profil', seriesLabel: 'Proposer', pearlReward: 100, xpReward: 50, badgeReward: { family: 'micro-artist', label: 'Micro', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 10, unitLabel: 'musiques', estimatedMinutes: 28 },
  { id: 'artist-proposal-25', title: 'Proposer 25 musiques', description: 'Publier 25 musiques sur la plateforme.', category: 'profil', seriesLabel: 'Proposer', pearlReward: 250, xpReward: 100, badgeReward: { family: 'micro-artist', label: 'Micro', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 25, unitLabel: 'musiques', estimatedMinutes: 55 },
  { id: 'artist-proposal-50', title: 'Proposer 50 musiques', description: 'Publier 50 musiques sur la plateforme.', category: 'profil', seriesLabel: 'Proposer', pearlReward: 500, xpReward: 300, badgeReward: { family: 'micro-artist', label: 'Micro', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 50, unitLabel: 'musiques', estimatedMinutes: 100 },
  { id: 'artist-proposal-75', title: 'Proposer 75 musiques', description: 'Publier 75 musiques sur la plateforme.', category: 'profil', seriesLabel: 'Proposer', pearlReward: 700, xpReward: 300, badgeReward: { family: 'micro-artist', label: 'Micro', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 75, unitLabel: 'musiques', estimatedMinutes: 150 },
  { id: 'artist-proposal-100', title: 'Proposer 100 musiques', description: 'Publier 100 musiques sur la plateforme.', category: 'profil', seriesLabel: 'Proposer', pearlReward: 1000, xpReward: 500, badgeReward: { family: 'micro-artist', label: 'Micro', tierLabel: 'Palier 7', colorMode: 'tiered' }, target: 100, unitLabel: 'musiques', estimatedMinutes: 210 },
]

const LEADERBOARD_GROUPS: LeaderboardGroup[] = [
  { id: 'digger', label: 'Classement Digger', badgeFamily: 'trophy-digger' },
  { id: 'last', label: 'Classement Last', badgeFamily: 'trophy-last' },
  { id: 'musique', label: 'Classement Musique', badgeFamily: 'trophy-musique' },
  { id: 'prod', label: 'Classement Prod', badgeFamily: 'trophy-prod' },
  { id: 'jeu-vue', label: 'Jeu des Vues', badgeFamily: 'trophy-jeu-vue' },
  { id: 'jeu-paris', label: 'PMU des abysses', badgeFamily: 'trophy-jeu-paris' },
  { id: 'jeu-playlist', label: 'Playlist democratique', badgeFamily: 'trophy-jeu-playlist' },
]

const LEADERBOARD_TIERS: LeaderboardTier[] = [
  { suffix: 'top-100', rankLabel: 'Top 100', topRank: 100, pearlReward: 100, xpReward: 100, badgeTier: 'Top 100' },
  { suffix: 'top-50', rankLabel: 'Top 50', topRank: 50, pearlReward: 200, xpReward: 150, badgeTier: 'Top 50' },
  { suffix: 'top-10', rankLabel: 'Top 10', topRank: 10, pearlReward: 300, xpReward: 200, badgeTier: 'Top 10' },
  { suffix: 'top-1', rankLabel: 'Top 1', topRank: 1, pearlReward: 500, xpReward: 200, badgeTier: 'Top 1' },
]

const PROFILE_LEADERBOARD_QUESTS: UserQuestDefinition[] = LEADERBOARD_GROUPS.flatMap((group) =>
  LEADERBOARD_TIERS.map((tier, index) => ({
    id: `profile-${group.id}-${tier.suffix}`,
    title: `${group.label} - ${tier.rankLabel}`,
    description: `Entrer dans le ${tier.rankLabel.toLowerCase()} du tableau ${group.label}.`,
    category: 'profil' as const,
    seriesLabel: 'Classement',
    pearlReward: tier.pearlReward,
    xpReward: tier.xpReward,
    badgeReward: {
      family: group.badgeFamily,
      label: `Trophee ${group.label}`,
      tierLabel: tier.badgeTier,
      colorMode: 'tiered',
    },
    target: tier.topRank,
    unitLabel: 'rang max',
    estimatedMinutes: 90 + index * 45,
  })),
)

const THRONE_REIGN_QUESTS: UserQuestDefinition[] = [
  { id: 'throne-reign-1', title: '1 jour de regne', description: 'Rester roi du Trone des abysses pendant 1 jour.', category: 'arene', seriesLabel: 'Trone des abysses - Regne', pearlReward: 10, xpReward: 10, badgeReward: { family: 'crown-throne', label: 'Couronne du Trone', tierLabel: 'Pierre', colorMode: 'tiered' }, target: 1, unitLabel: 'jours de regne', estimatedMinutes: 45 },
  { id: 'throne-reign-3', title: '3 jours de regne', description: 'Rester roi du Trone des abysses pendant 3 jours.', category: 'arene', seriesLabel: 'Trone des abysses - Regne', pearlReward: 50, xpReward: 50, badgeReward: { family: 'crown-throne', label: 'Couronne du Trone', tierLabel: 'Bronze', colorMode: 'tiered' }, target: 3, unitLabel: 'jours de regne', estimatedMinutes: 90 },
  { id: 'throne-reign-5', title: '5 jours de regne', description: 'Rester roi du Trone des abysses pendant 5 jours.', category: 'arene', seriesLabel: 'Trone des abysses - Regne', pearlReward: 100, xpReward: 100, badgeReward: { family: 'crown-throne', label: 'Couronne du Trone', tierLabel: 'Argent', colorMode: 'tiered' }, target: 5, unitLabel: 'jours de regne', estimatedMinutes: 120 },
  { id: 'throne-reign-7', title: '7 jours de regne', description: 'Rester roi du Trone des abysses pendant 7 jours.', category: 'arene', seriesLabel: 'Trone des abysses - Regne', pearlReward: 150, xpReward: 150, badgeReward: { family: 'crown-throne', label: 'Couronne du Trone', tierLabel: 'Vert neon', colorMode: 'tiered' }, target: 7, unitLabel: 'jours de regne', estimatedMinutes: 180 },
  { id: 'throne-reign-14', title: '14 jours de regne', description: 'Rester roi du Trone des abysses pendant 14 jours.', category: 'arene', seriesLabel: 'Trone des abysses - Regne', pearlReward: 300, xpReward: 300, badgeReward: { family: 'crown-throne', label: 'Couronne du Trone', tierLabel: 'Platine', colorMode: 'tiered' }, target: 14, unitLabel: 'jours de regne', estimatedMinutes: 240 },
  { id: 'throne-reign-30', title: '30 jours de regne', description: 'Rester roi du Trone des abysses pendant 30 jours.', category: 'arene', seriesLabel: 'Trone des abysses - Regne', pearlReward: 1000, xpReward: 1000, badgeReward: { family: 'crown-throne', label: 'Couronne du Trone', tierLabel: 'Or', colorMode: 'tiered' }, target: 30, unitLabel: 'jours de regne', estimatedMinutes: 360 },
]

const THRONE_AUTOPROMO_REIGN_QUESTS: UserQuestDefinition[] = [
  { id: 'throne-autopromo-reign-1', title: '1 jour de regne autopromo', description: 'Rester roi de la version autopromo pendant 1 jour. Reserve aux artistes.', category: 'arene', seriesLabel: 'Autopromo - Regne', pearlReward: 10, xpReward: 10, badgeReward: { family: 'crown-autopromo', label: 'Couronne autopromo', tierLabel: 'Pierre', colorMode: 'tiered' }, target: 1, unitLabel: 'jours de regne', estimatedMinutes: 45 },
  { id: 'throne-autopromo-reign-3', title: '3 jours de regne autopromo', description: 'Rester roi de la version autopromo pendant 3 jours. Reserve aux artistes.', category: 'arene', seriesLabel: 'Autopromo - Regne', pearlReward: 50, xpReward: 50, badgeReward: { family: 'crown-autopromo', label: 'Couronne autopromo', tierLabel: 'Bronze', colorMode: 'tiered' }, target: 3, unitLabel: 'jours de regne', estimatedMinutes: 90 },
  { id: 'throne-autopromo-reign-5', title: '5 jours de regne autopromo', description: 'Rester roi de la version autopromo pendant 5 jours. Reserve aux artistes.', category: 'arene', seriesLabel: 'Autopromo - Regne', pearlReward: 100, xpReward: 100, badgeReward: { family: 'crown-autopromo', label: 'Couronne autopromo', tierLabel: 'Argent', colorMode: 'tiered' }, target: 5, unitLabel: 'jours de regne', estimatedMinutes: 120 },
  { id: 'throne-autopromo-reign-7', title: '7 jours de regne autopromo', description: 'Rester roi de la version autopromo pendant 7 jours. Reserve aux artistes.', category: 'arene', seriesLabel: 'Autopromo - Regne', pearlReward: 150, xpReward: 150, badgeReward: { family: 'crown-autopromo', label: 'Couronne autopromo', tierLabel: 'Vert neon', colorMode: 'tiered' }, target: 7, unitLabel: 'jours de regne', estimatedMinutes: 180 },
  { id: 'throne-autopromo-reign-14', title: '14 jours de regne autopromo', description: 'Rester roi de la version autopromo pendant 14 jours. Reserve aux artistes.', category: 'arene', seriesLabel: 'Autopromo - Regne', pearlReward: 300, xpReward: 300, badgeReward: { family: 'crown-autopromo', label: 'Couronne autopromo', tierLabel: 'Platine', colorMode: 'tiered' }, target: 14, unitLabel: 'jours de regne', estimatedMinutes: 240 },
  { id: 'throne-autopromo-reign-30', title: '30 jours de regne autopromo', description: 'Rester roi de la version autopromo pendant 30 jours. Reserve aux artistes.', category: 'arene', seriesLabel: 'Autopromo - Regne', pearlReward: 1000, xpReward: 1000, badgeReward: { family: 'crown-autopromo', label: 'Couronne autopromo', tierLabel: 'Or', colorMode: 'tiered' }, target: 30, unitLabel: 'jours de regne', estimatedMinutes: 360 },
]

const THRONE_ADVISOR_QUESTS: UserQuestDefinition[] = [
  { id: 'throne-advisor-1', title: 'Voter 1 fois', description: 'Voter une fois pour le Trone des abysses.', category: 'arene', seriesLabel: 'Conseiller du roi', pearlReward: 1, xpReward: 1, badgeReward: { family: 'advisor-throne', label: 'Chapeau de bouffon', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'votes', estimatedMinutes: 2 },
  { id: 'throne-advisor-5', title: 'Voter 5 fois', description: 'Voter 5 fois pour le Trone des abysses.', category: 'arene', seriesLabel: 'Conseiller du roi', pearlReward: 10, xpReward: 10, badgeReward: { family: 'advisor-throne', label: 'Cagoule du bourreau', tierLabel: 'Palier 2', colorMode: 'tiered' }, target: 5, unitLabel: 'votes', estimatedMinutes: 8 },
  { id: 'throne-advisor-10', title: 'Voter 10 fois', description: 'Voter 10 fois pour le Trone des abysses.', category: 'arene', seriesLabel: 'Conseiller du roi', pearlReward: 25, xpReward: 25, target: 10, unitLabel: 'votes', estimatedMinutes: 15 },
  { id: 'throne-advisor-20', title: 'Voter 20 fois', description: 'Voter 20 fois pour le Trone des abysses.', category: 'arene', seriesLabel: 'Conseiller du roi', pearlReward: 35, xpReward: 35, badgeReward: { family: 'advisor-throne', label: 'Valet', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 20, unitLabel: 'votes', estimatedMinutes: 25 },
  { id: 'throne-advisor-30', title: 'Voter 30 fois', description: 'Voter 30 fois pour le Trone des abysses.', category: 'arene', seriesLabel: 'Conseiller du roi', pearlReward: 50, xpReward: 40, target: 30, unitLabel: 'votes', estimatedMinutes: 35 },
  { id: 'throne-advisor-50', title: 'Voter 50 fois', description: 'Voter 50 fois pour le Trone des abysses.', category: 'arene', seriesLabel: 'Conseiller du roi', pearlReward: 100, xpReward: 100, badgeReward: { family: 'advisor-throne', label: 'La Dame', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 50, unitLabel: 'votes', estimatedMinutes: 55 },
  { id: 'throne-advisor-75', title: 'Voter 75 fois', description: 'Voter 75 fois pour le Trone des abysses.', category: 'arene', seriesLabel: 'Conseiller du roi', pearlReward: 150, xpReward: 100, target: 75, unitLabel: 'votes', estimatedMinutes: 75 },
  { id: 'throne-advisor-100', title: 'Voter 100 fois', description: 'Voter 100 fois pour le Trone des abysses.', category: 'arene', seriesLabel: 'Conseiller du roi', pearlReward: 200, xpReward: 100, badgeReward: { family: 'advisor-throne', label: 'Main du marionnettiste', tierLabel: 'Palier 8', colorMode: 'tiered' }, target: 100, unitLabel: 'votes', estimatedMinutes: 95 },
]

const PARIS_PROPOSAL_QUESTS: UserQuestDefinition[] = [
  { id: 'paris-proposal-5', title: 'Proposer 5 paris', description: 'Envoyer 5 propositions de paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Propositions', pearlReward: 10, xpReward: 10, badgeReward: { family: 'dice-pmu-proposal', label: 'De du PMU', tierLabel: 'Blanc', colorMode: 'tiered' }, target: 5, unitLabel: 'propositions', estimatedMinutes: 20 },
  { id: 'paris-proposal-25', title: 'Proposer 25 paris', description: 'Envoyer 25 propositions de paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Propositions', pearlReward: 25, xpReward: 25, badgeReward: { family: 'dice-pmu-proposal', label: 'De du PMU', tierLabel: 'Neon', colorMode: 'tiered' }, target: 25, unitLabel: 'propositions', estimatedMinutes: 80 },
  { id: 'paris-proposal-50', title: 'Proposer 50 paris', description: 'Envoyer 50 propositions de paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Propositions', pearlReward: 100, xpReward: 100, badgeReward: { family: 'dice-pmu-proposal', label: 'De du PMU', tierLabel: 'Or', colorMode: 'tiered' }, target: 50, unitLabel: 'propositions', estimatedMinutes: 160 },
  { id: 'paris-proposal-100', title: 'Proposer 100 paris', description: 'Envoyer 100 propositions de paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Propositions', pearlReward: 500, xpReward: 500, badgeReward: { family: 'dice-pmu-proposal', label: 'De du PMU', tierLabel: 'Or royal', colorMode: 'tiered' }, target: 100, unitLabel: 'propositions', estimatedMinutes: 320 },
]

const PARIS_ACCEPTED_QUESTS: UserQuestDefinition[] = [
  { id: 'paris-accepted-1', title: '1 pari accepte', description: 'Faire accepter 1 proposition de pari par l admin.', category: 'arene', seriesLabel: 'PMU - Paris acceptes', pearlReward: 10, xpReward: 5, badgeReward: { family: 'tie-pmu-accepted', label: 'Cravate du PMU', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'paris acceptes', estimatedMinutes: 12 },
  { id: 'paris-accepted-5', title: '5 paris acceptes', description: 'Faire accepter 5 propositions de paris par l admin.', category: 'arene', seriesLabel: 'PMU - Paris acceptes', pearlReward: 25, xpReward: 20, badgeReward: { family: 'tie-pmu-accepted', label: 'Cravate du PMU', tierLabel: 'Palier 2', colorMode: 'tiered' }, target: 5, unitLabel: 'paris acceptes', estimatedMinutes: 40 },
  { id: 'paris-accepted-10', title: '10 paris acceptes', description: 'Faire accepter 10 propositions de paris par l admin.', category: 'arene', seriesLabel: 'PMU - Paris acceptes', pearlReward: 50, xpReward: 35, badgeReward: { family: 'tie-pmu-accepted', label: 'Cravate du PMU', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 10, unitLabel: 'paris acceptes', estimatedMinutes: 80 },
  { id: 'paris-accepted-20', title: '20 paris acceptes', description: 'Faire accepter 20 propositions de paris par l admin.', category: 'arene', seriesLabel: 'PMU - Paris acceptes', pearlReward: 100, xpReward: 55, badgeReward: { family: 'tie-pmu-accepted', label: 'Cravate du PMU', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 20, unitLabel: 'paris acceptes', estimatedMinutes: 140 },
  { id: 'paris-accepted-30', title: '30 paris acceptes', description: 'Faire accepter 30 propositions de paris par l admin.', category: 'arene', seriesLabel: 'PMU - Paris acceptes', pearlReward: 100, xpReward: 75, badgeReward: { family: 'tie-pmu-accepted', label: 'Cravate du PMU', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 30, unitLabel: 'paris acceptes', estimatedMinutes: 200 },
  { id: 'paris-accepted-40', title: '40 paris acceptes', description: 'Faire accepter 40 propositions de paris par l admin.', category: 'arene', seriesLabel: 'PMU - Paris acceptes', pearlReward: 100, xpReward: 100, badgeReward: { family: 'tie-pmu-accepted', label: 'Cravate du PMU', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 40, unitLabel: 'paris acceptes', estimatedMinutes: 260 },
  { id: 'paris-accepted-50', title: '50 paris acceptes', description: 'Faire accepter 50 propositions de paris par l admin.', category: 'arene', seriesLabel: 'PMU - Paris acceptes', pearlReward: 100, xpReward: 100, badgeReward: { family: 'tie-pmu-accepted', label: 'Cravate du PMU', tierLabel: 'Palier 7', colorMode: 'tiered' }, target: 50, unitLabel: 'paris acceptes', estimatedMinutes: 320 },
  { id: 'paris-accepted-100', title: '100 paris acceptes', description: 'Faire accepter 100 propositions de paris par l admin.', category: 'arene', seriesLabel: 'PMU - Paris acceptes', pearlReward: 300, xpReward: 200, badgeReward: { family: 'tie-pmu-accepted', label: 'Cravate du PMU', tierLabel: 'Palier 8', colorMode: 'tiered' }, target: 100, unitLabel: 'paris acceptes', estimatedMinutes: 480 },
]

const PARIS_BET_QUESTS: UserQuestDefinition[] = [
  { id: 'paris-bet-1', title: 'Parier 1 fois', description: 'Placer 1 mise au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Parieur', pearlReward: 5, xpReward: 5, badgeReward: { family: 'seahorse-pmu-bet', label: 'Hippocampe du PMU', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'paris', estimatedMinutes: 3 },
  { id: 'paris-bet-5', title: 'Parier 5 fois', description: 'Placer 5 mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Parieur', pearlReward: 20, xpReward: 25, target: 5, unitLabel: 'paris', estimatedMinutes: 10 },
  { id: 'paris-bet-10', title: 'Parier 10 fois', description: 'Placer 10 mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Parieur', pearlReward: 50, xpReward: 35, badgeReward: { family: 'seahorse-pmu-bet', label: 'Hippocampe du PMU', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 10, unitLabel: 'paris', estimatedMinutes: 18 },
  { id: 'paris-bet-25', title: 'Parier 25 fois', description: 'Placer 25 mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Parieur', pearlReward: 100, xpReward: 50, badgeReward: { family: 'seahorse-pmu-bet', label: 'Hippocampe du PMU', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 25, unitLabel: 'paris', estimatedMinutes: 35 },
  { id: 'paris-bet-50', title: 'Parier 50 fois', description: 'Placer 50 mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Parieur', pearlReward: 200, xpReward: 100, badgeReward: { family: 'seahorse-pmu-bet', label: 'Hippocampe du PMU', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 50, unitLabel: 'paris', estimatedMinutes: 65 },
  { id: 'paris-bet-100', title: 'Parier 100 fois', description: 'Placer 100 mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Parieur', pearlReward: 350, xpReward: 200, badgeReward: { family: 'seahorse-pmu-bet', label: 'Hippocampe du PMU', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 100, unitLabel: 'paris', estimatedMinutes: 120 },
]

const PARIS_WIN_QUESTS: UserQuestDefinition[] = [
  { id: 'paris-win-1', title: 'Gagner 1 pari', description: 'Remporter 1 pari au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Gains', pearlReward: 10, xpReward: 10, badgeReward: { family: 'lucky-pmu-win', label: 'Grigri de chance', tierLabel: 'Caca', colorMode: 'tiered' }, target: 1, unitLabel: 'paris gagnes', estimatedMinutes: 8 },
  { id: 'paris-win-25', title: 'Gagner 25 paris', description: 'Remporter 25 paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Gains', pearlReward: 100, xpReward: 100, badgeReward: { family: 'lucky-pmu-win', label: 'Grigri de chance', tierLabel: 'Fer a cheval', colorMode: 'tiered' }, target: 25, unitLabel: 'paris gagnes', estimatedMinutes: 90 },
  { id: 'paris-win-50', title: 'Gagner 50 paris', description: 'Remporter 50 paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Gains', pearlReward: 200, xpReward: 200, badgeReward: { family: 'lucky-pmu-win', label: 'Grigri de chance', tierLabel: 'Scarabee', colorMode: 'tiered' }, target: 50, unitLabel: 'paris gagnes', estimatedMinutes: 160 },
  { id: 'paris-win-75', title: 'Gagner 75 paris', description: 'Remporter 75 paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Gains', pearlReward: 300, xpReward: 200, badgeReward: { family: 'lucky-pmu-win', label: 'Grigri de chance', tierLabel: 'Coccinelle', colorMode: 'tiered' }, target: 75, unitLabel: 'paris gagnes', estimatedMinutes: 220 },
  { id: 'paris-win-100', title: 'Gagner 100 paris', description: 'Remporter 100 paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Gains', pearlReward: 500, xpReward: 300, badgeReward: { family: 'lucky-pmu-win', label: 'Grigri de chance', tierLabel: 'Trefle a 4 feuilles', colorMode: 'tiered' }, target: 100, unitLabel: 'paris gagnes', estimatedMinutes: 300 },
]

const PARIS_LOSS_QUESTS: UserQuestDefinition[] = [
  { id: 'paris-loss-1', title: 'Perdre 1 pari', description: 'Perdre 1 pari au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Pertes', pearlReward: 10, xpReward: 10, badgeReward: { family: 'omen-pmu-loss', label: 'Porte-malheur', tierLabel: 'Echelle', colorMode: 'tiered' }, target: 1, unitLabel: 'paris perdus', estimatedMinutes: 8 },
  { id: 'paris-loss-25', title: 'Perdre 25 paris', description: 'Perdre 25 paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Pertes', pearlReward: 100, xpReward: 100, badgeReward: { family: 'omen-pmu-loss', label: 'Porte-malheur', tierLabel: 'Parapluie', colorMode: 'tiered' }, target: 25, unitLabel: 'paris perdus', estimatedMinutes: 90 },
  { id: 'paris-loss-50', title: 'Perdre 50 paris', description: 'Perdre 50 paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Pertes', pearlReward: 200, xpReward: 200, badgeReward: { family: 'omen-pmu-loss', label: 'Porte-malheur', tierLabel: 'Corbeau', colorMode: 'tiered' }, target: 50, unitLabel: 'paris perdus', estimatedMinutes: 160 },
  { id: 'paris-loss-75', title: 'Perdre 75 paris', description: 'Perdre 75 paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Pertes', pearlReward: 300, xpReward: 200, badgeReward: { family: 'omen-pmu-loss', label: 'Porte-malheur', tierLabel: 'Miroir brise', colorMode: 'tiered' }, target: 75, unitLabel: 'paris perdus', estimatedMinutes: 220 },
  { id: 'paris-loss-100', title: 'Perdre 100 paris', description: 'Perdre 100 paris au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Pertes', pearlReward: 500, xpReward: 300, badgeReward: { family: 'omen-pmu-loss', label: 'Porte-malheur', tierLabel: 'Chat noir', colorMode: 'tiered' }, target: 100, unitLabel: 'paris perdus', estimatedMinutes: 300 },
]

const PARIS_STAKE_QUESTS: UserQuestDefinition[] = [
  { id: 'paris-stake-50', title: 'Miser 50 perles', description: 'Cumuler 50 perles mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Mises', pearlReward: 10, xpReward: 20, badgeReward: { family: 'chip-pmu-stake', label: 'Jeton du casino', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 50, unitLabel: 'perles mises', estimatedMinutes: 6 },
  { id: 'paris-stake-100', title: 'Miser 100 perles', description: 'Cumuler 100 perles mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Mises', pearlReward: 25, xpReward: 25, badgeReward: { family: 'chip-pmu-stake', label: 'Jeton du casino', tierLabel: 'Palier 2', colorMode: 'tiered' }, target: 100, unitLabel: 'perles mises', estimatedMinutes: 10 },
  { id: 'paris-stake-500', title: 'Miser 500 perles', description: 'Cumuler 500 perles mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Mises', pearlReward: 50, xpReward: 50, badgeReward: { family: 'chip-pmu-stake', label: 'Jeton du casino', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 500, unitLabel: 'perles mises', estimatedMinutes: 28 },
  { id: 'paris-stake-1000', title: 'Miser 1 000 perles', description: 'Cumuler 1 000 perles mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Mises', pearlReward: 100, xpReward: 100, badgeReward: { family: 'chip-pmu-stake', label: 'Jeton du casino', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 1000, unitLabel: 'perles mises', estimatedMinutes: 45 },
  { id: 'paris-stake-2500', title: 'Miser 2 500 perles', description: 'Cumuler 2 500 perles mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Mises', pearlReward: 200, xpReward: 200, badgeReward: { family: 'chip-pmu-stake', label: 'Jeton du casino', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 2500, unitLabel: 'perles mises', estimatedMinutes: 80 },
  { id: 'paris-stake-5000', title: 'Miser 5 000 perles', description: 'Cumuler 5 000 perles mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Mises', pearlReward: 400, xpReward: 300, badgeReward: { family: 'chip-pmu-stake', label: 'Jeton du casino', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 5000, unitLabel: 'perles mises', estimatedMinutes: 140 },
  { id: 'paris-stake-10000', title: 'Miser 10 000 perles', description: 'Cumuler 10 000 perles mises au PMU des abysses.', category: 'arene', seriesLabel: 'PMU - Mises', pearlReward: 1000, xpReward: 500, badgeReward: { family: 'chip-pmu-stake', label: 'Jeton du casino', tierLabel: 'Palier 7', colorMode: 'tiered' }, target: 10000, unitLabel: 'perles mises', estimatedMinutes: 240 },
]

const PLAYLIST_STREAK_QUESTS: UserQuestDefinition[] = [
  { id: 'playlist-streak-30', title: 'Participer 30 jours d affilee', description: 'Participer a Playlist democratique 30 jours d affilee.', category: 'arene', seriesLabel: 'Playlist - Regularite', pearlReward: 250, xpReward: 150, badgeReward: { family: 'clock-playlist', label: 'Horloge de playlist', tierLabel: '30 jours', colorMode: 'tiered' }, target: 30, unitLabel: 'jours', estimatedMinutes: 240 },
]

const PLAYLIST_VOTE_QUESTS: UserQuestDefinition[] = [
  { id: 'playlist-vote-1', title: 'Voter 1 fois', description: 'Voter 1 fois dans Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Vote', pearlReward: 5, xpReward: 10, badgeReward: { family: 'ballot-playlist', label: 'Urne de vote', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'votes', estimatedMinutes: 2 },
  { id: 'playlist-vote-5', title: 'Voter 5 fois', description: 'Voter 5 fois dans Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Vote', pearlReward: 10, xpReward: 20, target: 5, unitLabel: 'votes', estimatedMinutes: 8 },
  { id: 'playlist-vote-25', title: 'Voter 25 fois', description: 'Voter 25 fois dans Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Vote', pearlReward: 100, xpReward: 50, target: 25, unitLabel: 'votes', estimatedMinutes: 30 },
  { id: 'playlist-vote-50', title: 'Voter 50 fois', description: 'Voter 50 fois dans Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Vote', pearlReward: 200, xpReward: 100, badgeReward: { family: 'ballot-playlist', label: 'Urne de vote', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 50, unitLabel: 'votes', estimatedMinutes: 55 },
  { id: 'playlist-vote-75', title: 'Voter 75 fois', description: 'Voter 75 fois dans Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Vote', pearlReward: 250, xpReward: 100, target: 75, unitLabel: 'votes', estimatedMinutes: 75 },
  { id: 'playlist-vote-100', title: 'Voter 100 fois', description: 'Voter 100 fois dans Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Vote', pearlReward: 300, xpReward: 100, badgeReward: { family: 'ballot-playlist', label: 'Urne de vote', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 100, unitLabel: 'votes', estimatedMinutes: 100 },
]

const PLAYLIST_PROPOSAL_QUESTS: UserQuestDefinition[] = [
  { id: 'playlist-proposal-1', title: 'Proposer 1 musique', description: 'Proposer 1 musique a Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Propositions', pearlReward: 15, xpReward: 20, badgeReward: { family: 'medal-playlist', label: 'Medaille playlist', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'propositions', estimatedMinutes: 4 },
  { id: 'playlist-proposal-5', title: 'Proposer 5 musiques', description: 'Proposer 5 musiques a Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Propositions', pearlReward: 50, xpReward: 20, target: 5, unitLabel: 'propositions', estimatedMinutes: 20 },
  { id: 'playlist-proposal-10', title: 'Proposer 10 musiques', description: 'Proposer 10 musiques a Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Propositions', pearlReward: 100, xpReward: 50, badgeReward: { family: 'medal-playlist', label: 'Medaille playlist', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 10, unitLabel: 'propositions', estimatedMinutes: 40 },
  { id: 'playlist-proposal-20', title: 'Proposer 20 musiques', description: 'Proposer 20 musiques a Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Propositions', pearlReward: 100, xpReward: 50, target: 20, unitLabel: 'propositions', estimatedMinutes: 75 },
  { id: 'playlist-proposal-30', title: 'Proposer 30 musiques', description: 'Proposer 30 musiques a Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Propositions', pearlReward: 150, xpReward: 100, badgeReward: { family: 'medal-playlist', label: 'Medaille playlist', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 30, unitLabel: 'propositions', estimatedMinutes: 110 },
  { id: 'playlist-proposal-40', title: 'Proposer 40 musiques', description: 'Proposer 40 musiques a Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Propositions', pearlReward: 150, xpReward: 100, target: 40, unitLabel: 'propositions', estimatedMinutes: 145 },
  { id: 'playlist-proposal-50', title: 'Proposer 50 musiques', description: 'Proposer 50 musiques a Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Propositions', pearlReward: 300, xpReward: 200, badgeReward: { family: 'medal-playlist', label: 'Medaille playlist', tierLabel: 'Palier 7', colorMode: 'tiered' }, target: 50, unitLabel: 'propositions', estimatedMinutes: 180 },
]

const PLAYLIST_SURVIVAL_QUESTS: UserQuestDefinition[] = [
  { id: 'playlist-survive-1', title: 'Survivre 1 jour', description: 'Garder un morceau 1 jour dans Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Survie', pearlReward: 100, xpReward: 100, badgeReward: { family: 'flashlight-playlist', label: 'Lampe torche', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'jours de survie', estimatedMinutes: 24 },
  { id: 'playlist-survive-3', title: 'Survivre 3 jours', description: 'Garder un morceau 3 jours dans Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Survie', pearlReward: 300, xpReward: 100, badgeReward: { family: 'flashlight-playlist', label: 'Lampe torche', tierLabel: 'Palier 2', colorMode: 'tiered' }, target: 3, unitLabel: 'jours de survie', estimatedMinutes: 72 },
  { id: 'playlist-survive-5', title: 'Survivre 5 jours', description: 'Garder un morceau 5 jours dans Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Survie', pearlReward: 400, xpReward: 200, badgeReward: { family: 'flashlight-playlist', label: 'Lampe torche', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 5, unitLabel: 'jours de survie', estimatedMinutes: 120 },
  { id: 'playlist-survive-7', title: 'Survivre 7 jours', description: 'Garder un morceau 7 jours dans Playlist democratique.', category: 'arene', seriesLabel: 'Playlist - Survie', pearlReward: 500, xpReward: 300, badgeReward: { family: 'flashlight-playlist', label: 'Lampe torche', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 7, unitLabel: 'jours de survie', estimatedMinutes: 168 },
  { id: 'playlist-final', title: 'Etre dans la playlist finale', description: 'Bloquer un morceau dans la playlist finale apres 7 jours de survie.', category: 'arene', seriesLabel: 'Playlist - Survie', pearlReward: 350, xpReward: 200, badgeReward: { family: 'flashlight-playlist', label: 'Lampe torche', tierLabel: 'Finale', colorMode: 'tiered' }, target: 1, unitLabel: 'playlist finale', estimatedMinutes: 168 },
]

const BOTTLE_SEND_QUESTS: UserQuestDefinition[] = [
  { id: 'bottle-send-1', title: 'Envoyer 1 bouteille a la mer', description: 'Envoyer 1 bouteille a la mer.', category: 'arene', seriesLabel: 'Bouteille - Envoi', pearlReward: 5, xpReward: 5, badgeReward: { family: 'bottle-drift', label: 'Type de bouteille', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'bouteilles', estimatedMinutes: 3 },
  { id: 'bottle-send-5', title: 'Envoyer 5 bouteilles a la mer', description: 'Envoyer 5 bouteilles a la mer.', category: 'arene', seriesLabel: 'Bouteille - Envoi', pearlReward: 15, xpReward: 15, target: 5, unitLabel: 'bouteilles', estimatedMinutes: 12 },
  { id: 'bottle-send-10', title: 'Envoyer 10 bouteilles a la mer', description: 'Envoyer 10 bouteilles a la mer.', category: 'arene', seriesLabel: 'Bouteille - Envoi', pearlReward: 25, xpReward: 25, badgeReward: { family: 'bottle-drift', label: 'Type de bouteille', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 10, unitLabel: 'bouteilles', estimatedMinutes: 22 },
  { id: 'bottle-send-15', title: 'Envoyer 15 bouteilles a la mer', description: 'Envoyer 15 bouteilles a la mer.', category: 'arene', seriesLabel: 'Bouteille - Envoi', pearlReward: 35, xpReward: 35, target: 15, unitLabel: 'bouteilles', estimatedMinutes: 30 },
  { id: 'bottle-send-20', title: 'Envoyer 20 bouteilles a la mer', description: 'Envoyer 20 bouteilles a la mer.', category: 'arene', seriesLabel: 'Bouteille - Envoi', pearlReward: 50, xpReward: 50, badgeReward: { family: 'bottle-drift', label: 'Type de bouteille', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 20, unitLabel: 'bouteilles', estimatedMinutes: 40 },
  { id: 'bottle-send-30', title: 'Envoyer 30 bouteilles a la mer', description: 'Envoyer 30 bouteilles a la mer.', category: 'arene', seriesLabel: 'Bouteille - Envoi', pearlReward: 75, xpReward: 75, target: 30, unitLabel: 'bouteilles', estimatedMinutes: 55 },
  { id: 'bottle-send-50', title: 'Envoyer 50 bouteilles a la mer', description: 'Envoyer 50 bouteilles a la mer.', category: 'arene', seriesLabel: 'Bouteille - Envoi', pearlReward: 100, xpReward: 100, badgeReward: { family: 'bottle-drift', label: 'Type de bouteille', tierLabel: 'Palier 7', colorMode: 'tiered' }, target: 50, unitLabel: 'bouteilles', estimatedMinutes: 90 },
]

const COFFRE_ATTEMPT_QUESTS: UserQuestDefinition[] = [
  { id: 'coffre-attempt-1', title: 'Faire 1 tentative du coffre fort', description: 'Faire 1 tentative sur le coffre fort.', category: 'arene', seriesLabel: 'Coffre fort - Tentatives', pearlReward: 20, xpReward: 10, badgeReward: { family: 'lock-coffre', label: 'Verrou', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'tentatives', estimatedMinutes: 3 },
  { id: 'coffre-attempt-5', title: 'Faire 5 tentatives du coffre fort', description: 'Faire 5 tentatives sur le coffre fort.', category: 'arene', seriesLabel: 'Coffre fort - Tentatives', pearlReward: 30, xpReward: 5, badgeReward: { family: 'lock-coffre', label: 'Verrou', tierLabel: 'Palier 2', colorMode: 'tiered' }, target: 5, unitLabel: 'tentatives', estimatedMinutes: 10 },
  { id: 'coffre-attempt-10', title: 'Faire 10 tentatives du coffre fort', description: 'Faire 10 tentatives sur le coffre fort.', category: 'arene', seriesLabel: 'Coffre fort - Tentatives', pearlReward: 100, xpReward: 5, badgeReward: { family: 'lock-coffre', label: 'Verrou', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 10, unitLabel: 'tentatives', estimatedMinutes: 18 },
  { id: 'coffre-attempt-25', title: 'Faire 25 tentatives du coffre fort', description: 'Faire 25 tentatives sur le coffre fort.', category: 'arene', seriesLabel: 'Coffre fort - Tentatives', pearlReward: 300, xpReward: 5, badgeReward: { family: 'lock-coffre', label: 'Verrou', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 25, unitLabel: 'tentatives', estimatedMinutes: 35 },
  { id: 'coffre-attempt-50', title: 'Faire 50 tentatives du coffre fort', description: 'Faire 50 tentatives sur le coffre fort.', category: 'arene', seriesLabel: 'Coffre fort - Tentatives', pearlReward: 500, xpReward: 5, badgeReward: { family: 'lock-coffre', label: 'Verrou', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 50, unitLabel: 'tentatives', estimatedMinutes: 60 },
  { id: 'coffre-attempt-75', title: 'Faire 75 tentatives du coffre fort', description: 'Faire 75 tentatives sur le coffre fort.', category: 'arene', seriesLabel: 'Coffre fort - Tentatives', pearlReward: 600, xpReward: 5, badgeReward: { family: 'lock-coffre', label: 'Verrou', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 75, unitLabel: 'tentatives', estimatedMinutes: 90 },
  { id: 'coffre-attempt-100', title: 'Faire 100 tentatives du coffre fort', description: 'Faire 100 tentatives sur le coffre fort.', category: 'arene', seriesLabel: 'Coffre fort - Tentatives', pearlReward: 800, xpReward: 5, badgeReward: { family: 'lock-coffre', label: 'Verrou', tierLabel: 'Palier 7', colorMode: 'tiered' }, target: 100, unitLabel: 'tentatives', estimatedMinutes: 120 },
]

const COFFRE_UNLOCK_QUESTS: UserQuestDefinition[] = [
  { id: 'coffre-unlock', title: 'Deverouiller le coffre', description: 'Trouver le bon code et ouvrir un coffre fort.', category: 'arene', seriesLabel: 'Coffre fort - Ouverture', pearlReward: 1000, xpReward: 500, badgeReward: { family: 'pirate-chest-open', label: 'Coffre pirate ouvert', tierLabel: 'Unique', colorMode: 'tiered' }, target: 1, unitLabel: 'ouverture', estimatedMinutes: 45 },
]

const VUE_PLAY_QUESTS: UserQuestDefinition[] = [
  { id: 'vue-play-1', title: 'Jouer 1 partie', description: 'Lancer 1 partie au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Parties', pearlReward: 5, xpReward: 5, badgeReward: { family: 'arcade-vue', label: 'Borne d arcade', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 1, unitLabel: 'parties', estimatedMinutes: 3 },
  { id: 'vue-play-10', title: 'Jouer 10 parties', description: 'Lancer 10 parties au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Parties', pearlReward: 25, xpReward: 10, target: 10, unitLabel: 'parties', estimatedMinutes: 18 },
  { id: 'vue-play-20', title: 'Jouer 20 parties', description: 'Lancer 20 parties au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Parties', pearlReward: 50, xpReward: 25, badgeReward: { family: 'arcade-vue', label: 'Borne d arcade', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 20, unitLabel: 'parties', estimatedMinutes: 35 },
  { id: 'vue-play-40', title: 'Jouer 40 parties', description: 'Lancer 40 parties au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Parties', pearlReward: 100, xpReward: 50, badgeReward: { family: 'arcade-vue', label: 'Borne d arcade', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 40, unitLabel: 'parties', estimatedMinutes: 65 },
  { id: 'vue-play-65', title: 'Jouer 65 parties', description: 'Lancer 65 parties au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Parties', pearlReward: 150, xpReward: 50, badgeReward: { family: 'arcade-vue', label: 'Borne d arcade', tierLabel: 'Palier 5', colorMode: 'tiered' }, target: 65, unitLabel: 'parties', estimatedMinutes: 100 },
  { id: 'vue-play-85', title: 'Jouer 85 parties', description: 'Lancer 85 parties au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Parties', pearlReward: 200, xpReward: 50, badgeReward: { family: 'arcade-vue', label: 'Borne d arcade', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 85, unitLabel: 'parties', estimatedMinutes: 130 },
  { id: 'vue-play-150', title: 'Jouer 150 parties', description: 'Lancer 150 parties au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Parties', pearlReward: 400, xpReward: 100, badgeReward: { family: 'arcade-vue', label: 'Borne d arcade', tierLabel: 'Palier 7', colorMode: 'tiered' }, target: 150, unitLabel: 'parties', estimatedMinutes: 220 },
]

const VUE_SCORE_QUESTS: UserQuestDefinition[] = [
  { id: 'vue-score-5', title: 'Faire un score de 5', description: 'Atteindre un score de 5 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 5, xpReward: 5, badgeReward: { family: 'eye-vue-score', label: 'Types d oeil', tierLabel: 'Palier 1', colorMode: 'tiered' }, target: 5, unitLabel: 'points', estimatedMinutes: 5 },
  { id: 'vue-score-10', title: 'Faire un score de 10', description: 'Atteindre un score de 10 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 20, xpReward: 10, badgeReward: { family: 'eye-vue-score', label: 'Types d oeil', tierLabel: 'Palier 2', colorMode: 'tiered' }, target: 10, unitLabel: 'points', estimatedMinutes: 8 },
  { id: 'vue-score-20', title: 'Faire un score de 20', description: 'Atteindre un score de 20 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 100, xpReward: 100, badgeReward: { family: 'eye-vue-score', label: 'Types d oeil', tierLabel: 'Palier 3', colorMode: 'tiered' }, target: 20, unitLabel: 'points', estimatedMinutes: 18 },
  { id: 'vue-score-30', title: 'Faire un score de 30', description: 'Atteindre un score de 30 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 150, xpReward: 150, badgeReward: { family: 'eye-vue-score', label: 'Types d oeil', tierLabel: 'Palier 4', colorMode: 'tiered' }, target: 30, unitLabel: 'points', estimatedMinutes: 28 },
  { id: 'vue-score-40', title: 'Faire un score de 40', description: 'Atteindre un score de 40 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 250, xpReward: 200, target: 40, unitLabel: 'points', estimatedMinutes: 40 },
  { id: 'vue-score-50', title: 'Faire un score de 50', description: 'Atteindre un score de 50 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 350, xpReward: 200, badgeReward: { family: 'eye-vue-score', label: 'Types d oeil', tierLabel: 'Palier 6', colorMode: 'tiered' }, target: 50, unitLabel: 'points', estimatedMinutes: 55 },
  { id: 'vue-score-60', title: 'Faire un score de 60', description: 'Atteindre un score de 60 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 500, xpReward: 300, target: 60, unitLabel: 'points', estimatedMinutes: 70 },
  { id: 'vue-score-70', title: 'Faire un score de 70', description: 'Atteindre un score de 70 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 600, xpReward: 300, badgeReward: { family: 'eye-vue-score', label: 'Types d oeil', tierLabel: 'Palier 8', colorMode: 'tiered' }, target: 70, unitLabel: 'points', estimatedMinutes: 85 },
  { id: 'vue-score-80', title: 'Faire un score de 80', description: 'Atteindre un score de 80 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 700, xpReward: 300, badgeReward: { family: 'eye-vue-score', label: 'Types d oeil', tierLabel: 'Palier 9', colorMode: 'tiered' }, target: 80, unitLabel: 'points', estimatedMinutes: 100 },
  { id: 'vue-score-90', title: 'Faire un score de 90', description: 'Atteindre un score de 90 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 800, xpReward: 300, badgeReward: { family: 'eye-vue-score', label: 'Types d oeil', tierLabel: 'Palier 10', colorMode: 'tiered' }, target: 90, unitLabel: 'points', estimatedMinutes: 115 },
  { id: 'vue-score-100', title: 'Faire un score de 100', description: 'Atteindre un score de 100 au jeu des vues.', category: 'arene', seriesLabel: 'Jeux des vues - Score', pearlReward: 1000, xpReward: 400, badgeReward: { family: 'eye-vue-score', label: 'Types d oeil', tierLabel: 'Palier 11', colorMode: 'tiered' }, target: 100, unitLabel: 'points', estimatedMinutes: 130 },
]

const VUE_WARMUP_QUESTS: UserQuestDefinition[] = [
  { id: 'vue-warmup-perfect', title: 'Passer l echauffement haut la main', description: 'Trouver exactement le nombre de vues pendant la phase d echauffement.', category: 'arene', seriesLabel: 'Jeux des vues - Echauffement', pearlReward: 350, xpReward: 350, badgeReward: { family: 'brain-vue-warmup', label: 'Gros cerveau', tierLabel: 'Unique', colorMode: 'tiered' }, target: 1, unitLabel: 'echauffement', estimatedMinutes: 4 },
]

const LEGACY_QUESTS: UserQuestDefinition[] = [
  {
    id: 'first-login-streak',
    title: 'Premier courant favorable',
    description: 'Se connecter 2 jours de suite pour lancer sa premiere serie.',
    category: 'regularite',
    pearlReward: 80,
    xpReward: 80,
    target: 2,
    unitLabel: 'jours',
    estimatedMinutes: 2,
  },
  {
    id: 'first-follow',
    title: 'Premier sonar ami',
    description: 'Suivre 1 digger pour ouvrir la couche sociale du profil.',
    category: 'social',
    pearlReward: 90,
    xpReward: 90,
    target: 1,
    unitLabel: 'abonnement',
    estimatedMinutes: 3,
  },
  {
    id: 'first-bet',
    title: 'Petit ticket des abysses',
    description: 'Placer 1 pari dans Le PMU des abysses.',
    category: 'arene',
    pearlReward: 100,
    xpReward: 100,
    target: 1,
    unitLabel: 'pari',
    estimatedMinutes: 4,
  },
  {
    id: 'social-circle',
    title: 'Courant relationnel',
    description: 'Suivre 5 diggers differents.',
    category: 'social',
    pearlReward: 170,
    xpReward: 170,
    target: 5,
    unitLabel: 'abonnements',
    estimatedMinutes: 12,
  },
  {
    id: 'streak-week',
    title: 'Maree stable',
    description: 'Se connecter 7 jours de suite.',
    category: 'regularite',
    pearlReward: 220,
    xpReward: 220,
    target: 7,
    unitLabel: 'jours',
    estimatedMinutes: 18,
  },
  {
    id: 'view-arena',
    title: 'Public des abysses',
    description: 'Visiter 4 jeux de l arene au moins une fois.',
    category: 'decouverte',
    pearlReward: 250,
    xpReward: 250,
    target: 4,
    unitLabel: 'jeux',
    estimatedMinutes: 22,
  },
  {
    id: 'followers-earned',
    title: 'Presence montante',
    description: 'Obtenir 3 followers.',
    category: 'social',
    pearlReward: 260,
    xpReward: 260,
    target: 3,
    unitLabel: 'followers',
    estimatedMinutes: 28,
  },
  {
    id: 'likes-earned',
    title: 'Courant favorable',
    description: 'Recevoir 25 likes sur ses morceaux.',
    category: 'partage',
    pearlReward: 280,
    xpReward: 280,
    target: 25,
    unitLabel: 'likes recus',
    estimatedMinutes: 35,
  },
  {
    id: 'feedback-earned',
    title: 'Salle d ecoute ouverte',
    description: 'Recevoir 3 feedbacks sur ses propres morceaux.',
    category: 'feedback',
    pearlReward: 280,
    xpReward: 280,
    target: 3,
    unitLabel: 'feedbacks recus',
    estimatedMinutes: 40,
  },
  {
    id: 'streak-month',
    title: 'Maree royale',
    description: 'Tenir une serie de 30 jours de connexion.',
    category: 'regularite',
    pearlReward: 500,
    xpReward: 500,
    target: 30,
    unitLabel: 'jours',
    estimatedMinutes: 60,
  },
]

export const USER_QUEST_DEFINITIONS: UserQuestDefinition[] = [
  ...DAILY_QUESTS,
  ...PROFILE_SHARE_QUESTS,
  ...PROFILE_LIKE_QUESTS,
  ...PROFILE_LOGIN_QUESTS,
  ...FEEDBACK_GIVEN_QUESTS,
  ...ARTIST_PROPOSAL_QUESTS,
  ...PROFILE_LEADERBOARD_QUESTS,
  ...THRONE_REIGN_QUESTS,
  ...THRONE_AUTOPROMO_REIGN_QUESTS,
  ...THRONE_ADVISOR_QUESTS,
  ...PARIS_PROPOSAL_QUESTS,
  ...PARIS_ACCEPTED_QUESTS,
  ...PARIS_BET_QUESTS,
  ...PARIS_WIN_QUESTS,
  ...PARIS_LOSS_QUESTS,
  ...PARIS_STAKE_QUESTS,
  ...PLAYLIST_STREAK_QUESTS,
  ...PLAYLIST_VOTE_QUESTS,
  ...PLAYLIST_PROPOSAL_QUESTS,
  ...PLAYLIST_SURVIVAL_QUESTS,
  ...BOTTLE_SEND_QUESTS,
  ...COFFRE_ATTEMPT_QUESTS,
  ...COFFRE_UNLOCK_QUESTS,
  ...VUE_PLAY_QUESTS,
  ...VUE_SCORE_QUESTS,
  ...VUE_WARMUP_QUESTS,
  ...LEGACY_QUESTS,
]

export function getQuestCategory(categoryId: QuestCategoryId) {
  return QUEST_CATEGORIES.find((category) => category.id === categoryId) || QUEST_CATEGORIES[0]
}

export function getQuestSpeedLabel(estimatedMinutes: number) {
  if (estimatedMinutes <= 5) return 'Express'
  if (estimatedMinutes <= 15) return 'Rapide'
  if (estimatedMinutes <= 30) return 'Moyenne'
  return 'Longue'
}

export function sortQuestsByFastest(quests: UserQuestDefinition[]) {
  return [...quests].sort((left, right) => {
    if (left.estimatedMinutes !== right.estimatedMinutes) return left.estimatedMinutes - right.estimatedMinutes
    if (left.xpReward !== right.xpReward) return left.xpReward - right.xpReward
    if (left.pearlReward !== right.pearlReward) return left.pearlReward - right.pearlReward
    return left.title.localeCompare(right.title, 'fr')
  })
}