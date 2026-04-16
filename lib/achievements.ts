import { supabase } from './supabase'

const LEGACY_BADGE_DEFINITIONS: Record<string, { name: string; description: string; image_url: string | null }> = {
  devin_exact: {
    name: 'Devin exact',
    description: 'A trouve exactement le bon nombre de vues pendant le jeu des vues.',
    image_url: null,
  },
  score_2: {
    name: 'Serie de 2',
    description: 'A enchaine 2 bonnes reponses dans le jeu des vues.',
    image_url: null,
  },
}

export async function checkAndUnlockBadge(userId: string, badgeId: string) {
  try {
    const badgeDefinition = LEGACY_BADGE_DEFINITIONS[badgeId]

    // 1. Vérifier si l'utilisateur a déjà le badge
    const { data: alreadyHas } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .maybeSingle()

    if (alreadyHas) return null // Il l'a déjà, on s'arrête

    // 2. Si non, on lui débloque !
    const { error: insertError } = await supabase
      .from('user_badges')
      .insert([{ user_id: userId, badge_id: badgeId }])

    if (insertError) throw insertError // On lance l'erreur vers le catch

    if (badgeDefinition) {
      return { id: badgeId, ...badgeDefinition }
    }

    // 3. On récupère les infos du badge pour l'affichage
    const { data: badgeInfo, error: fetchError } = await supabase
      .from('badges')
      .select('id, name, description, image_url')
      .eq('id', badgeId)
      .maybeSingle()

    if (fetchError) {
      console.error('Erreur lecture definition badge:', fetchError)
    }

    return badgeInfo || {
      id: badgeId,
      name: badgeId,
      description: null,
      image_url: null,
    }

  } catch (err: any) {
    // ICI ON FORCE L'AFFICHAGE DU VRAI PROBLÈME
    console.error('❌ ERREUR DÉTAILLÉE DU SYSTÈME DE BADGES :')
    console.error('Badge ID :', badgeId)
    console.error('Message :', err.message)
    console.error('Code erreur Supabase :', err.code)
    console.error('Détails :', err.details)
    console.error('Indice (Hint) :', err.hint)
    return null
  }
}