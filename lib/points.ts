import { supabase } from './supabase'

/**
 * AJOUTER OU RETIRER DES POINTS
 * Insère dans l'historique, et un TRIGGER SQL met à jour automatiquement digger.points
 */
export async function addPoints(
  userId: string, 
  amount: number, 
  type: 'game' | 'bet' | 'like' | 'daily_bonus' | 'purchase' | 'refund', 
  reason: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('points_history')
      .insert([{ 
        user_id: userId, 
        amount: amount, 
        type: type, 
        reason: reason 
      }])

    if (error) {
      console.error('❌ Erreur addPoints:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('❌ Erreur critique addPoints:', err)
    return false
  }
}

/**
 * VÉRIFIER ET DÉBITER LES POINTS (Transaction atomique)
 * Retourne le solde ACTUEL si OK, ou null si pas assez
 */
export async function debitAndCheckBalance(
  userId: string, 
  montantDemande: number
): Promise<number | null> {
  try {
    // 1️⃣ Récupérer le solde ACTUEL
    const { data: digger, error: fetchErr } = await supabase
      .from('digger')
      .select('points')
      .eq('id', userId)
      .single()

    if (fetchErr || !digger) {
      console.error('Erreur fetch digger:', fetchErr)
      return null
    }

    const soldeActuel = digger.points || 0

    // 2️⃣ Vérifier qu'on a assez
    if (montantDemande > soldeActuel) {
      console.warn(`Solde insuffisant: ${soldeActuel} < ${montantDemande}`)
      return null
    }

    // 3️⃣ DÉBITER les points (le trigger SQL met à jour digger.points automatiquement)
    const { error: debitErr } = await supabase
      .from('points_history')
      .insert([{
        user_id: userId,
        amount: -montantDemande,
        type: 'bet',
        reason: 'Pari enregistré'
      }])

    if (debitErr) {
      console.error('Erreur débit:', debitErr)
      return null
    }

    // ✅ Retourner le nouveau solde
    return soldeActuel - montantDemande
  } catch (err) {
    console.error('Erreur debitAndCheckBalance:', err)
    return null
  }
}

/**
 * RÉCUPÉRER LE SOLDE EN DIRECT
 */
export async function getUserBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('digger')
      .select('points')
      .eq('id', userId)
      .single()

    if (error || !data) return 0
    return data.points || 0
  } catch (err) {
    console.error('Erreur getUserBalance:', err)
    return 0
  }
}

/**
 * RÉCUPÉRER LE TOP SEMAINE
 */
export async function getWeeklyLeaderboard() {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  try {
    const { data, error } = await supabase
      .from('points_history')
      .select(`
        amount,
        user_id,
        digger:user_id ( username, avatar_url )
      `)
      .gt('amount', 0) 
      .gte('created_at', sevenDaysAgo.toISOString())

    if (error || !data) return []

    const totals = data.reduce((acc: any, curr: any) => {
      const uid = curr.user_id
      if (!acc[uid]) {
        acc[uid] = { 
          username: curr.digger?.username || 'Anonyme', 
          avatar_url: curr.digger?.avatar_url,
          total: 0 
        }
      }
      acc[uid].total += curr.amount
      return acc
    }, {})

    return Object.values(totals).sort((a: any, b: any) => b.total - a.total).slice(0, 5)
  } catch (err) {
    console.error('Erreur getWeeklyLeaderboard:', err)
    return []
  }
}