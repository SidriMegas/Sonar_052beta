"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { addPoints } from '@/lib/points'
import Link from 'next/link'
import { useAdminAccess } from '@/lib/hooks/useAdminAccess'

export default function AdminParis() {
  const [questions, setQuestions] = useState<any[]>([])
  const [newQuestion, setNewQuestion] = useState({ question: '', description: '', durationDays: '7' })
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const { checkingAccess, isAdmin, user } = useAdminAccess()

  const getDeadlineAt = (durationDaysRaw: string) => {
    const durationDays = Number(durationDaysRaw)
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      return null
    }

    const deadline = new Date()
    deadline.setDate(deadline.getDate() + durationDays)
    return deadline.toISOString()
  }

  const formatDeadline = (deadlineAt?: string | null) => {
    if (!deadlineAt) return 'Aucune date limite'
    return new Date(deadlineAt).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isExpired = (deadlineAt?: string | null) => {
    if (!deadlineAt) return false
    return new Date(deadlineAt).getTime() <= Date.now()
  }

  useEffect(() => {
    if (checkingAccess) return
    if (!isAdmin) {
      setLoading(false)
      return
    }

    fetchParis().finally(() => setLoading(false))
  }, [checkingAccess, isAdmin])

  async function fetchParis() {
    try {
      const { data } = await supabase
        .from('paris_questions')
        .select('*, paris_mises(*)')
        .order('created_at', { ascending: false })

      if (data) setQuestions(data)
    } catch (err) {
      console.error('Erreur fetch paris:', err)
    }
  }

  async function createPari() {
    if (!newQuestion.question.trim()) return alert('Écris une question !')

    try {
      const deadlineAt = getDeadlineAt(newQuestion.durationDays)
      const { error } = await supabase.from('paris_questions').insert([
        {
          question: newQuestion.question,
          description: newQuestion.description,
          status: 'open',
          deadline_at: deadlineAt,
        }
      ])

      if (!error) {
        setNewQuestion({ question: '', description: '', durationDays: '7' })
        await fetchParis()
        alert('✅ Pari créé et publié !')
      } else {
        alert('Erreur: ' + error.message)
      }
    } catch (err) {
      alert('Erreur création pari')
    }
  }

  async function validerProposition(pariId: string) {
    try {
      const deadlineAt = getDeadlineAt(newQuestion.durationDays)
      const { error } = await supabase
        .from('paris_questions')
        .update({ status: 'open', deadline_at: deadlineAt })
        .eq('id', pariId)
      
      if (!error) {
        setQuestions(questions.map(q => q.id === pariId ? {...q, status: 'open', deadline_at: deadlineAt} : q))
        alert('✅ Proposition validée !')
      } else {
        alert('Erreur: ' + error.message)
      }
    } catch (err) {
      alert('Erreur validation')
    }
  }

  async function refuserProposition(pariId: string) {
    if (!confirm('Supprimer cette proposition ?')) return
    
    try {
      const { error } = await supabase.from('paris_questions').delete().eq('id', pariId)
      
      if (!error) {
        setQuestions(questions.filter(q => q.id !== pariId))
        alert('✅ Proposition supprimée !')
      } else {
        alert('Erreur: ' + error.message)
      }
    } catch (err) {
      alert('Erreur suppression')
    }
  }

  async function resolvePari(pariId: string, gagnant: 'OUI' | 'NON') {
    if (isProcessing) return;
    if (!confirm(`${gagnant} gagne ce pari ?`)) return

    try {
      setIsProcessing(true)

      const pari = questions.find(q => q.id === pariId)
      const mises = pari?.paris_mises || []

      if (mises.length === 0) {
        await supabase.from('paris_questions').update({ status: 'resolved', resultat: gagnant }).eq('id', pariId)
        await fetchParis()
        alert('Pari fermé (aucune mise).')
        return
      }

      const totalGlobal = mises.reduce((acc: number, m: any) => acc + m.montant, 0)
      const totalGagnant = mises
        .filter((m: any) => m.choix === gagnant)
        .reduce((acc: number, m: any) => acc + m.montant, 0)

      if (totalGagnant === 0) {
        for (const mise of mises) {
          await supabase.from('notifications').insert([
            {
              user_id: mise.user_id,
              type: 'pari_resolved',
              title: '📊 Résultat des paris',
              message: `Le pari "${pari.question}" est clôturé (${gagnant}), mais aucun gagnant n'a été trouvé.`,
              related_pari_id: pari.id,
              read: false,
            },
          ])
        }
        await supabase.from('paris_questions').update({ status: 'resolved', resultat: gagnant }).eq('id', pariId)
        await fetchParis()
        alert('Personne n\'a voté pour cette réponse ! Le Capitaine garde le pactole.')
        return
      }

      // --- DISTRIBUTION + NOTIFICATIONS ---
      for (const mise of mises) {
        if (mise.choix === gagnant) {
          const prorata = mise.montant / totalGagnant
          const gain = Math.floor(totalGlobal * prorata)
          
          // 1. Ajouter les points
          await addPoints(
            mise.user_id,
            gain,
            'bet',
            `Pari gagné: "${pari.question}"`
          )

          // 2. Envoyer la notification de gain 🔔
          await supabase.from('notifications').insert([{
            user_id: mise.user_id,
            type: 'pari_won',
            title: '🎰 Pari Gagné !',
            message: `Félicitations ! Tu as gagné ${gain} 🪩 sur le pari : "${pari.question}"`,
            related_pari_id: pari.id,
            read: false
          }])
        } else {
          await supabase.from('notifications').insert([
            {
              user_id: mise.user_id,
              type: 'pari_lost',
              title: '❌ Pari perdu',
              message: `Résultat du pari "${pari.question}": ${gagnant}. Ta mise de ${mise.montant} 🪩 est perdue.`,
              related_pari_id: pari.id,
              read: false,
            },
          ])
        }
      }

      const { error } = await supabase
        .from('paris_questions')
        .update({ status: 'resolved', resultat: gagnant })
        .eq('id', pariId)

      if (!error) {
        await fetchParis()
        alert(`✅ Pari résolu !\n${totalGlobal} 🪩 distribués aux gagnants.`)
      } else {
        alert('Erreur: ' + error.message)
      }
    } catch (err) {
      console.error('Erreur résolution:', err)
      alert('Erreur lors de la résolution')
    } finally {
      setIsProcessing(false)
    }
  }

  if (checkingAccess || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#001524] via-[#000814] to-black text-white pt-[200px] px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 mx-auto mb-4"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#001524] via-[#000814] to-black text-white pt-[200px] px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4">🔒 Accès Refusé</h1>
          <Link href="/admin" className="text-purple-400 hover:text-purple-300 font-bold">← Retour dashboard admin</Link>
        </div>
      </div>
    )
  }

  const pendingPropositions = questions.filter(q => q.status === 'pending')
  const activeQuestions = questions.filter(q => q.status !== 'pending')

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001524] via-[#000814] to-black text-white pt-[200px] px-4 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-300/60">Console admin</p>
            <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter mb-2">
              🎰 Console Admin <span className="text-purple-500">Paris</span>
            </h1>
            <p className="text-gray-400">Gère les paris et distributions</p>
          </div>
          <Link href="/admin" className="rounded-full border border-white/12 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/6">
            Dashboard admin
          </Link>
        </div>

        {/* PROPOSITIONS EN ATTENTE */}
        <div className="mb-12">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
            ⚓ Propositions 
            {pendingPropositions.length > 0 && (
              <span className="bg-blue-600 text-[12px] px-3 py-1 rounded-full animate-pulse">
                {pendingPropositions.length} à traiter
              </span>
            )}
          </h2>
          {pendingPropositions.length === 0 ? (
            <div className="p-8 bg-white/5 border border-white/10 rounded-[30px] text-center text-gray-500 italic">
              Aucune proposition
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPropositions.map(q => (
                <div key={q.id} className="p-6 bg-blue-900/10 border border-blue-500/30 rounded-[25px] flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex-1">
                    <p className="text-lg font-bold text-blue-100">{q.question}</p>
                    {q.description && <p className="text-sm text-blue-300/70">{q.description}</p>}
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200/60">
                        Validation avec la duree actuelle: {newQuestion.durationDays || '0'} jour(s)
                      </p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => validerProposition(q.id)}
                      className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl text-xs font-black uppercase"
                    >
                      ✅ Valider
                    </button>
                    <button 
                      onClick={() => refuserProposition(q.id)}
                      className="bg-red-600/20 hover:bg-red-600 border border-red-600/50 px-6 py-3 rounded-xl text-xs font-black uppercase"
                    >
                      ❌ Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CRÉER UN PARI */}
        <div className="bg-white/5 border border-white/10 rounded-[30px] p-8 mb-12">
          <h2 className="text-2xl font-black mb-6">🚀 Créer un Pari</h2>

          <input
            type="text"
            placeholder="Question"
            value={newQuestion.question}
            onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
            className="w-full bg-black/50 border-2 border-white/10 rounded-xl p-4 text-white placeholder-gray-600 mb-4 font-black text-lg focus:border-purple-500 outline-none"
          />

          <textarea
            placeholder="Description (optionnel)"
            value={newQuestion.description}
            onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
            className="w-full bg-black/50 border-2 border-white/10 rounded-xl p-4 text-white placeholder-gray-600 mb-4 font-medium focus:border-purple-500 outline-none"
            rows={3}
          />

            <div className="mb-4 grid gap-3 md:grid-cols-[180px_1fr] md:items-end">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Duree en jours</label>
                <input
                  type="number"
                  min="1"
                  value={newQuestion.durationDays}
                  onChange={(e) => setNewQuestion({ ...newQuestion, durationDays: e.target.value })}
                  className="w-full bg-black/50 border-2 border-white/10 rounded-xl p-4 text-white font-black text-lg focus:border-purple-500 outline-none"
                />
              </div>
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/8 px-4 py-3 text-sm text-purple-100/80">
                Date limite calculee: <span className="font-black text-white">{formatDeadline(getDeadlineAt(newQuestion.durationDays))}</span>
              </div>
            </div>

          <button
            onClick={createPari}
            disabled={!newQuestion.question.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black uppercase py-4 rounded-xl"
          >
            ✅ Créer
          </button>
        </div>

        {/* PARIS EN COURS */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black">📊 Paris en cours</h2>
          {activeQuestions.length === 0 ? (
            <div className="text-center py-20 text-gray-500 italic bg-white/5 border border-white/10 rounded-[30px] p-8">
              Aucun pari
            </div>
          ) : (
            activeQuestions.map((q) => {
              const totalMises = q.paris_mises.reduce((acc: number, m: any) => acc + m.montant, 0)
              const misesOui = q.paris_mises.filter((m: any) => m.choix === 'OUI').reduce((acc: number, m: any) => acc + m.montant, 0)
              const misesNon = q.paris_mises.filter((m: any) => m.choix === 'NON').reduce((acc: number, m: any) => acc + m.montant, 0)
              const isResolved = q.status !== 'open'
              const expired = isExpired(q.deadline_at)

              return (
                <div key={q.id} className={`border rounded-[30px] p-8 transition-all ${isResolved ? 'bg-black/30 border-white/5' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <h3 className="text-2xl md:text-3xl font-black">{q.question}</h3>
                      {q.description && <p className="text-gray-400 text-sm">{q.description}</p>}
                      <p className={`mt-2 text-[11px] font-bold uppercase tracking-[0.16em] ${expired ? 'text-amber-300' : 'text-gray-500'}`}>
                        Date limite: {formatDeadline(q.deadline_at)}
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap ${isResolved ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' : expired ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                      {isResolved ? `✅ ${q.resultat}` : expired ? '⏳ EXPIRE' : '🟢 OUVERT'}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 mb-8 bg-black/30 p-6 rounded-xl border border-white/5">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Total</p>
                      <p className="text-2xl font-black text-purple-400">{totalMises.toLocaleString()}</p>
                      <p className="text-[9px] text-gray-500">🪩</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">OUI</p>
                      <p className="text-2xl font-black text-green-400">{misesOui.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">NON</p>
                      <p className="text-2xl font-black text-red-400">{misesNon.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Mises</p>
                      <p className="text-2xl font-black text-blue-400">{q.paris_mises.length}</p>
                    </div>
                  </div>

                  {!isResolved ? (
                    <div className="flex gap-4">
                      <button onClick={() => resolvePari(q.id, 'OUI')} disabled={isProcessing} className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black uppercase py-4 rounded-xl">
                        ✅ OUI Gagne
                      </button>
                      <button onClick={() => resolvePari(q.id, 'NON')} disabled={isProcessing} className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black uppercase py-4 rounded-xl">
                        ❌ NON Gagne
                      </button>
                    </div>
                  ) : (
                    <div className="bg-black/30 border border-white/10 p-6 rounded-xl text-center">
                      <p className="text-sm font-bold text-gray-400">Pari terminé • Résultat: <span className="text-purple-400 font-black">{q.resultat}</span></p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex justify-between">
          <div className="flex gap-4">
          <Link href="/admin" className="text-white/70 hover:text-white font-bold text-sm">
            ← Dashboard admin
          </Link>
          <Link href="/jeux/paris" className="text-purple-400 hover:text-purple-300 font-bold text-sm">
            ← Voir la page des paris
          </Link>
          </div>
        </div>
      </div>
    </div>
  )
}