/**
 * Système de couleurs pour Guerre Des Ondes
 *
 * Chaque genre a une PLAGE de teinte + luminosité fixe.
 * Tous les sous-genres restent dans cette plage → un rap est TOUJOURS vert foncé,
 * un métal est TOUJOURS violet, etc. Seule la nuance varie entre sous-genres.
 *
 * lightnessMin → lightnessMax : gradient du 1er au dernier sous-genre
 */

type GenrePalette = {
  name: string
  hue: number
  saturation: number
  lightnessMin: number
  lightnessMax: number
}

const GENRE_PALETTES: Record<string, GenrePalette> = {
  // Vert foncé : de foncé à légèrement moins foncé, toujours dark green
  "Rap & Hip-Hop": { name: "Vert foncé",  hue: 140, saturation: 60, lightnessMin: 16, lightnessMax: 38 },
  // Rose : de rose moyen à rose clair
  "Pop":           { name: "Rose",         hue: 340, saturation: 72, lightnessMin: 48, lightnessMax: 72 },
  // Bleu : de bleu moyen à bleu clair
  "Rock":          { name: "Bleu",         hue: 220, saturation: 65, lightnessMin: 30, lightnessMax: 56 },
  // Blanc / gris très clair avec légère teinte froide
  "Électro":       { name: "Blanc",        hue: 200, saturation: 18, lightnessMin: 72, lightnessMax: 93 },
  // Jaune foncé / ocre
  "R&B / Soul":    { name: "Jaune foncé",  hue:  45, saturation: 68, lightnessMin: 24, lightnessMax: 44 },
  // Jaune clair / doré clair
  "Jazz":          { name: "Jaune clair",  hue:  55, saturation: 80, lightnessMin: 58, lightnessMax: 80 },
  // Rouge clair / rose-rouge
  "Reggae":        { name: "Rouge clair",  hue:   4, saturation: 72, lightnessMin: 52, lightnessMax: 72 },
  // Violet : de violet moyen à violet clair
  "Metal":         { name: "Violet",       hue: 270, saturation: 58, lightnessMin: 26, lightnessMax: 52 },
  // Vert clair : de vert clair moyen à très clair
  "Afro":          { name: "Vert clair",   hue: 120, saturation: 55, lightnessMin: 50, lightnessMax: 72 },
  // Rouge foncé : de très foncé à foncé moyen
  "Latin":         { name: "Rouge foncé",  hue: 355, saturation: 70, lightnessMin: 16, lightnessMax: 38 },
  // Cyan-teal (non mentionné, couleur neutre distinctive)
  "Country / Folk":{ name: "Cyan",         hue: 175, saturation: 52, lightnessMin: 34, lightnessMax: 58 },
  // Orange (non mentionné, couleur neutre distinctive)
  "Funk":          { name: "Orange",       hue:  25, saturation: 72, lightnessMin: 38, lightnessMax: 60 },
}

const SOUS_GENRES_ORDER: Record<string, string[]> = {
  "Rap & Hip-Hop": [
    "Trap",
    "Drill",
    "Cloud Rap",
    "PluggnB",
    "Rage",
    "Boom Bap",
    "Grime",
    "Horrorcore",
    "Jersey",
    "New Jazz",
  ],
  "Pop": [
    "Electropop",
    "Synthpop",
    "K-Pop",
    "J-Pop",
    "Pop urbaine",
    "Bedroom Pop",
  ],
  "Rock": [
    "Rock Alternatif",
    "Rock Indie",
    "Rock Progressif",
    "Psychédélique",
    "Punk",
    "Post-Punk",
    "Grunge",
    "Hard Rock",
  ],
  "Électro": [
    "House",
    "Techno",
    "Trance",
    "Dubstep",
    "IDM",
    "Downtempo",
    "Synthwave",
    "Ambient",
    "Breakcore",
  ],
  "R&B / Soul": [
    "R&B Classique",
    "Contemporary R&B",
    "Neo-Soul",
    "Soul Funk",
    "Garage",
    "Grime/Dubstep",
    "UK Bass",
  ],
  "Jazz": [
    "Jazz Cool",
    "Jazz Fusion",
    "Jazz Bebop",
    "Smooth Jazz",
    "Jazz Swing",
    "Free Jazz",
    "Jazz Funk",
    "Latin Jazz",
  ],
  "Reggae": [
    "Roots Reggae",
    "Dancehall",
    "Skyline",
    "Dub",
    "Rocksteady",
    "Lovers Rock",
  ],
  "Metal": [
    "Heavy Metal",
    "Thrash Metal",
    "Death Metal",
    "Black Metal",
    "Power Metal",
    "Metalcore",
    "Doom Metal",
    "Nu-Metal",
  ],
  "Afro": [
    "Afrobeats",
    "Amapiano",
    "Kuduro",
    "Highlife",
    "Gqom",
  ],
  "Latin": [
    "Reggaeton",
    "Trap Latino",
    "Bachata",
    "Salsa",
    "Mambo",
    "Cumbia",
  ],
  "Country / Folk": [
    "Country Classique",
    "Outlaw Country",
    "Americana",
    "Bluegrass",
    "Celtic",
    "Indie Folk",
  ],
  "Funk": [
    "Funk Classique",
    "Funk Moderne",
    "Electrofunk",
    "Acid Funk",
    "Vaporwave",
  ],
}

/**
 * Génère une couleur HSL basée sur le genre et sous-genre.
 * Toutes les nuances d'un même genre restent dans la même zone colorée.
 * index 0 = lightnessMin, index (n-1) = lightnessMax
 */
export const getGenreColor = (
  genre: string | null | undefined,
  sousGenre: string | null | undefined
): string => {
  const palette = genre ? GENRE_PALETTES[genre] : undefined

  if (!palette) {
    return "hsl(0, 0%, 42%)" // gris neutre pour genre inconnu
  }

  const { hue, saturation, lightnessMin, lightnessMax } = palette

  // Pas de sous-genre : couleur centrale de la plage
  if (!sousGenre || !SOUS_GENRES_ORDER[genre!]) {
    const mid = (lightnessMin + lightnessMax) / 2
    return `hsl(${hue}, ${saturation}%, ${mid.toFixed(1)}%)`
  }

  const sousGenresArray = SOUS_GENRES_ORDER[genre!]
  const index = sousGenresArray.indexOf(sousGenre)

  if (index === -1) {
    // Sous-genre inconnu → couleur centrale
    const mid = (lightnessMin + lightnessMax) / 2
    return `hsl(${hue}, ${saturation}%, ${mid.toFixed(1)}%)`
  }

  const totalCount = sousGenresArray.length
  // Répartition linéaire dans la plage [lightnessMin, lightnessMax]
  const t = totalCount > 1 ? index / (totalCount - 1) : 0.5
  const lightness = lightnessMin + t * (lightnessMax - lightnessMin)

  return `hsl(${hue}, ${saturation}%, ${lightness.toFixed(1)}%)`
}

/**
 * Retourne le nom de la couleur pour affichage
 */
export const getGenreColorName = (genre: string | null | undefined): string => {
  if (!genre || !GENRE_PALETTES[genre]) return "Neutre"
  return GENRE_PALETTES[genre].name
}

/**
 * Retourne tous les sous-genres d'un genre donné
 */
export const getSousGenresList = (genre: string): string[] => {
  return SOUS_GENRES_ORDER[genre] || []
}

/**
 * Retourne la liste des genres principaux
 */
export const getGenresList = (): string[] => {
  return Object.keys(GENRE_PALETTES)
}
