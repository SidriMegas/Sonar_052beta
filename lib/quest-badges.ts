type QuestBadgeAssetConfig = {
  basePath: string
  order: string[]
}

const QUEST_BADGE_ASSET_CONFIG: Partial<Record<string, QuestBadgeAssetConfig>> = {
  'paper-plane': {
    basePath: '/Badge Quetes/PROFIL/Partage (avions papier)',
    order: ['Palier 1', 'Palier 2', 'Palier 3', 'Palier 4', 'Palier 5', 'Palier 6', 'Palier 7'],
  },
  'watch-login': {
    basePath: '/Badge Quetes/PROFIL/Connexion (montre)',
    order: ['7 jours', '14 jours', '21 jours', '30 jours'],
  },
  'like-logo': {
    basePath: '/Badge Quetes/PROFIL/Like (bouton like)',
    order: ['Palier 1', 'Palier 2', 'Palier 3', 'Palier 4', 'Palier 5', 'Palier 6'],
  },
  'feather-feedback': {
    basePath: '/Badge Quetes/Feedback/Faire des feedbacks (plume)',
    order: ['Palier 1', 'Palier 2', 'Palier 3', 'Palier 4', 'Palier 5', 'Palier 6', 'Palier 7', 'Palier 8'],
  },
  'micro-artist': {
    basePath: '/Badge Quetes/Feedback/Proposer des feedbacks (micro)',
    order: ['Palier 1', 'Palier 2', 'Palier 3', 'Palier 4', 'Palier 5', 'Palier 6', 'Palier 7'],
  },
  'trophy-digger': {
    basePath: '/Badge Quetes/PROFIL/Classement (trophée)/Classement digger',
    order: ['Top 100', 'Top 50', 'Top 10', 'Top 1'],
  },
  'trophy-musique': {
    basePath: '/Badge Quetes/PROFIL/Classement (trophée)/Classement musique',
    order: ['Top 100', 'Top 50', 'Top 10', 'Top 1'],
  },
  'trophy-prod': {
    basePath: '/Badge Quetes/PROFIL/Classement (trophée)/Classement prod',
    order: ['Top 100', 'Top 50', 'Top 10', 'Top 1'],
  },
  'crown-throne': {
    basePath: '/Badge Quetes/trone des abysses/Durée du Regne (couronne)/General',
    order: ['Pierre', 'Bronze', 'Argent', 'Vert neon', 'Platine', 'Or'],
  },
  'crown-autopromo': {
    basePath: '/Badge Quetes/trone des abysses/Durée du Regne (couronne)/Autopromo',
    order: ['Pierre', 'Bronze', 'Argent', 'Vert neon', 'Platine', 'Or'],
  },
  'advisor-throne': {
    basePath: '/Badge Quetes/trone des abysses/conseiller du roi (divers)',
    order: ['Palier 1', 'Palier 2', 'Palier 3', 'Palier 4', 'Palier 5'],
  },
  'dice-pmu-proposal': {
    basePath: '/Badge Quetes/PMU des abysses/Proposé un paris (logo pmu)',
    order: ['Blanc', 'Neon', 'Or', 'Or royal'],
  },
  'tie-pmu-accepted': {
    basePath: '/Badge Quetes/PMU des abysses/Paris accepter (cravate)',
    order: ['Palier 1', 'Palier 2', 'Palier 3', 'Palier 4', 'Palier 5', 'Palier 6', 'Palier 7', 'Palier 8'],
  },
  'seahorse-pmu-bet': {
    basePath: '/Badge Quetes/PMU des abysses/Faire des paris (hippocampe)',
    order: ['Palier 1', 'Palier 2', 'Palier 3', 'Palier 4', 'Palier 5', 'Palier 6'],
  },
  'lucky-pmu-win': {
    basePath: '/Badge Quetes/PMU des abysses/Resultat/gain (chance)',
    order: ['Caca', 'Fer a cheval', 'Scarabee', 'Coccinelle', 'Trefle a 4 feuilles', 'Or royal'],
  },
  'omen-pmu-loss': {
    basePath: '/Badge Quetes/PMU des abysses/Resultat/perte (malchance)',
    order: ['Echelle', 'Parapluie', 'Corbeau', 'Miroir brise', 'Chat noir'],
  },
  'chip-pmu-stake': {
    basePath: '/Badge Quetes/PMU des abysses/mise (jeton)',
    order: ['Palier 1', 'Palier 2', 'Palier 3', 'Palier 4', 'Palier 5', 'Palier 6', 'Palier 7'],
  },
  'arcade-vue': {
    basePath: '/Badge Quetes/Jeux de vues/Joue X fois (borne d\'arcade)',
    order: ['1', '2', '3', '4', '5', '6', '7'],
  },
  'lock-coffre': {
    basePath: '/Badge Quetes/Coffre Fort/Tentative (cadenas)',
    order: ['1', '2', '3', '4', '5', '6', '7'],
  },
  'bottle-drift': {
    basePath: '/Badge Quetes/Bouteille à la mer/Envoyer X bouteille (bouteille)',
    order: ['1', '2', '3', '4', '5', '6', '7'],
  },
  'pirate-chest-open': {
    basePath: '/Badge Quetes/Coffre Fort/Ouverture (Coffre ouvert)',
    order: ['1'],
  },
  'flashlight-playlist': {
    basePath: '/Badge Quetes/Playlist Democratique/Survivre X temps (feu)',
    order: ['Palier 1', 'Palier 2', 'Palier 3', 'Palier 4', 'Finale'],
  },
  // Ajoute ici d'autres familles si besoin (ex: eye-vue-score, brain-vue-warmup)
}

export function getQuestBadgeAsset(family: string, tierLabel: string) {
  const config = QUEST_BADGE_ASSET_CONFIG[family]
  if (!config) return null

  const orderIndex = config.order.findIndex((entry) => entry === tierLabel)
  if (orderIndex < 0) return null

  return encodeURI(`${config.basePath}/${orderIndex + 1}.svg`)
}