"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { extractYoutubeId } from '@/lib/youtube'

const MOTS_INTERDITS = ["CLIP", "OFFICIEL", "PROD", "LYRICS", "PAROLES"]

const GENRES_PRINCIPAUX = [
  "Rap & Hip-Hop",
  "Pop",
  "Rock",
  "Électro",
  "R&B / Soul",
  "Jazz",
  "Reggae",
  "Metal",
  "Afro",
  "Latin",
  "Country / Folk",
  "Funk",
]

const SOUS_GENRES: Record<string, string[]> = {
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
    "Rock alternatif",
    "Indie Rock",
    "Pop-Punk",
    "Grunge",
    "Hard Rock",
    "Punk Rock",
  ],
  "Électro": [
    "House (Deep/Tech)",
    "Techno (Hard/Acid)",
    "Drum & Bass",
    "Dubstep",
    "Trance",
    "EDM",
  ],
  "R&B / Soul": [
    "R&B contemporain",
    "Neo-Soul",
    "Soul",
    "Funk-Soul",
    "Motown",
  ],
  "Jazz": [
    "Bebop",
    "Jazz Fusion",
    "Smooth Jazz",
    "Jazz Manouche",
    "Jazz contemporain",
  ],
  "Reggae": [
    "Roots Reggae",
    "Dancehall",
    "Dub",
    "Ska",
  ],
  "Metal": [
    "Heavy Metal",
    "Metalcore",
    "Death Metal",
    "Black Metal",
    "Nu Metal",
  ],
  "Afro": [
    "Afrobeats",
    "Amapiano",
    "Coupe-Decale",
    "Kuduro",
    "Kizomba",
  ],
  "Latin": [
    "Reggaeton",
    "Salsa",
    "Bachata",
    "Merengue",
    "Latin Trap",
    "Cumbia",
    "Bossa Nova",
  ],
  "Country / Folk": [
    "Country contemporain",
    "Americana",
    "Bluegrass",
    "Indie Folk",
    "Folk-Rock",
  ],
  "Funk": [
    "Funk",
    "Disco-Funk",
    "P-Funk",
    "Funk moderne",
  ],
}

export default function PartagerPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [showBaliseOption, setShowBaliseOption] = useState(false)
  const [doublonInfo, setDoublonInfo] = useState<any>(null)

  // États du formulaire
  const [typePartage, setTypePartage] = useState<'partage' | 'autopromo'>('partage')
  const [typeMusique, setTypeMusique] = useState<'musique' | 'prod'>('musique')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedSousGenre, setSelectedSousGenre] = useState('')

  const panelClass = 'overflow-hidden rounded-[34px] border border-lime-300/45 bg-[linear-gradient(180deg,rgba(3,7,12,0.96),rgba(5,12,18,0.94),rgba(2,7,13,0.98))] shadow-[0_0_40px_rgba(163,230,53,0.14)] backdrop-blur-xl'
  const sectionLabelClass = 'mb-2 block text-[10px] font-black uppercase tracking-[0.32em] text-sky-200/60'
  const fieldClass = 'w-full rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02))] px-4 py-3 text-sm font-semibold text-white outline-none backdrop-blur-md transition-all placeholder:text-white/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:border-sky-200/34 focus:bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(147,197,253,0.05))] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_1px_rgba(125,211,252,0.08)]'
  const selectClass = `${fieldClass} appearance-none text-white [color-scheme:dark]`
  const optionClass = 'bg-[#03070c] text-white'
  const tabButtonClass = (active: boolean) => `flex-1 rounded-[18px] border px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] transition-all ${active ? 'border-sky-100/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(147,197,253,0.1),rgba(196,181,253,0.08))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_0_22px_rgba(96,165,250,0.14)] backdrop-blur-md' : 'border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.42),rgba(255,255,255,0.03))] text-white/74 hover:border-sky-200/24 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] hover:text-sky-50'}`
  const messageClass = message.includes('✅')
    ? 'border-sky-200/26 bg-[linear-gradient(180deg,rgba(147,197,253,0.14),rgba(255,255,255,0.06))] text-sky-50'
    : 'border-red-400/40 bg-red-500/10 text-red-200'

  useEffect(() => {
    let alive = true

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (alive) {
        setUser(session?.user || null)
        setLoading(false)
      }
    }
    
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) {
        setUser(session?.user || null)
        setLoading(false)
      }
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setIsSubmitting(true)
    setMessage('')
    
    const formData = new FormData(form)
    const artisteSaisi = (formData.get('artiste') as string) || ""
    const titreSaisi = (formData.get('titre') as string) || ""
    const urlYoutube = (formData.get('url') as string) || ""

    // Vérifier les mots interdits
    const texteAVerifier = `${artisteSaisi} ${titreSaisi}`.toUpperCase()
    const motTrouve = MOTS_INTERDITS.find(mot => texteAVerifier.includes(mot))

    if (motTrouve) {
      setMessage(`❌ Erreur : Le mot "${motTrouve}" est interdit. Nettoie le titre.`)
      setIsSubmitting(false)
      return
    }

    if (!user) {
      alert("Erreur : Tu dois être connecté !")
      setIsSubmitting(false)
      return
    }

    const youtubeId = extractYoutubeId(urlYoutube)
    if (!youtubeId) {
      setMessage("❌ URL YouTube invalide. Vérifie le lien.")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/robot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlYoutube,
          youtubeId,
          artiste: artisteSaisi,
          titre: titreSaisi,
          beatmaker: typeMusique === 'prod' ? null : (((formData.get('beatmaker') as string) || '').trim() || null),
          genre: selectedGenre || null,
          sous_genre: selectedSousGenre || null,
          pays: formData.get('pays') || "Global",
          type_partage: typeMusique === 'prod' ? 'production' : typePartage,
          type_musique: typeMusique,
          autopromo: typeMusique === 'prod' ? false : typePartage === 'autopromo',
          user_id: user.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.error && result.error.includes("déjà dans le Cycle")) {
          setShowBaliseOption(true)
          setDoublonInfo({ 
            url: urlYoutube, 
            user_id: user.id,
            artiste: artisteSaisi,
            titre: titreSaisi
          })
          setIsSubmitting(false)
          return
        }
        throw new Error(result.error || "Erreur lors du transfert")
      }

      setMessage(`✅ Ta pépite a été publié avec succès ! 🎵`)
      form.reset()
      setTypePartage('partage')
      setTypeMusique('musique')
      setSelectedGenre('')
      setSelectedSousGenre('')
      setIsSubmitting(false)

    } catch (err: any) {
      setMessage(`❌ ${err.message}`)
      setIsSubmitting(false)
    }
  }

  const handleCreateBalise = async () => {
    setIsSubmitting(true)
    setMessage('')

    try {
      const cleanId = extractYoutubeId(doublonInfo.url)

      const response = await fetch('/api/balise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_id: cleanId,
          youtube_url: doublonInfo.url,
          user_id: doublonInfo.user_id,
          nom_artiste: doublonInfo.artiste,
          nom_titre: doublonInfo.titre
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de l'activation")
      }

      setMessage("✅ Balise de détresse activée ! Le son va remonter au prochain scan.")
      setShowBaliseOption(false)
      setIsSubmitting(false)

    } catch (err: any) {
      setMessage(`❌ Erreur : ${err.message}`)
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#001524] via-[#000814] to-black px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8%] top-[6%] h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="absolute right-[-10%] top-[14%] h-80 w-80 rounded-full bg-indigo-300/8 blur-3xl" />
        </div>
        <div className={`relative mx-auto max-w-3xl p-8 text-center ${panelClass}`}>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-100/70">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#001524] via-[#000814] to-black px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8%] top-[6%] h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="absolute right-[-10%] top-[14%] h-80 w-80 rounded-full bg-indigo-300/8 blur-3xl" />
        </div>
        <div className={`relative mx-auto max-w-3xl p-8 sm:p-10 ${panelClass}`}>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.38em] text-sky-200/50">Partage sous pression</p>
            <h1 className="mt-4 text-3xl font-black uppercase italic text-white sm:text-4xl">Acces reserve</h1>
            <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.18em] text-white/68">Tu dois etre connecte pour partager une musique.</p>
            <a href="/auth" className="mt-8 inline-flex rounded-full border border-sky-100/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(147,197,253,0.1),rgba(196,181,253,0.08))] px-6 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_20px_rgba(96,165,250,0.12)] transition-colors hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(147,197,253,0.14),rgba(196,181,253,0.1))]">
              Se connecter
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#001524] via-[#000814] to-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[6%] h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute right-[-10%] top-[14%] h-80 w-80 rounded-full bg-indigo-300/8 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.38),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-80 bg-[linear-gradient(to_top,rgba(0,0,0,0.95),rgba(0,8,20,0.45),transparent)]" />
      </div>

      <div className={`relative mx-auto max-w-3xl p-6 sm:p-8 lg:p-10 ${panelClass}`}>
        {!showBaliseOption ? (
          <>
            <div className="mb-8 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(0,0,0,0.45),rgba(255,255,255,0.04))] px-5 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full border border-sky-200/18 bg-white/6 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-sky-100/78">Partager</span>
                <span className="rounded-full border border-indigo-200/16 bg-white/6 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-indigo-100/75">Aquarium</span>
                <span className="rounded-full border border-white/12 bg-black/35 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-white/70">Reflet</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-200/50">Partager • Sonar • Ocean profond</p>
              <h1 className="text-3xl font-black uppercase italic text-white sm:text-4xl">Ajouter au Cycle</h1>
              <p className="mx-auto max-w-2xl text-[11px] font-bold uppercase tracking-[0.18em] text-white/62">
                Envoie une nouvelle onde dans le cycle. Le lien YouTube reste obligatoire, mais genre et producteur peuvent maintenant etre laisses vides.
              </p>
            </div>

            {/* TABS : Type de Partage */}
            <div className="mb-6 flex gap-3">
              <button
                type="button"
                onClick={() => setTypePartage('partage')}
                className={tabButtonClass(typePartage === 'partage')}
              >
                📢 Partage
              </button>
              <button
                type="button"
                onClick={() => setTypePartage('autopromo')}
                className={tabButtonClass(typePartage === 'autopromo')}
              >
                🎤 Autopromo
              </button>
            </div>

            {/* TABS : Type de Musique */}
            <div className="mb-8 flex gap-3">
              <button
                type="button"
                onClick={() => setTypeMusique('musique')}
                className={tabButtonClass(typeMusique === 'musique')}
              >
                🎵 Musique
              </button>
              <button
                type="button"
                onClick={() => setTypeMusique('prod')}
                className={tabButtonClass(typeMusique === 'prod')}
              >
                🎧 Production
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className={sectionLabelClass}>Artiste *</label>
                  <input name="artiste" placeholder="GAZO" className={fieldClass} required />
                </div>
                <div>
                  <label className={sectionLabelClass}>Titre *</label>
                  <input name="titre" placeholder="DIE" className={fieldClass} required />
                </div>
              </div>

              <div>
                <label className={sectionLabelClass}>Lien YouTube *</label>
                <input name="url" placeholder="https://youtube.com/..." className={fieldClass} required />
              </div>

              {typeMusique !== 'prod' && (
                <div>
                  <label className={sectionLabelClass}>Producteur</label>
                  <input name="beatmaker" placeholder="PROD BY..." className={fieldClass} />
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className={sectionLabelClass}>Genre</label>
                  <select
                    className={selectClass}
                    value={selectedGenre}
                    onChange={(e) => {
                      setSelectedGenre(e.target.value)
                      setSelectedSousGenre('')
                    }}
                  >
                    <option value="" className={optionClass}>Laisser vide</option>
                    {GENRES_PRINCIPAUX.map(g => (
                      <option key={g} value={g} className={optionClass}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={sectionLabelClass}>Pays *</label>
                  <input name="pays" placeholder="FRANCE" className={fieldClass} required />
                </div>
              </div>

              {/* SOUS-GENRE (optionnel) */}
              {SOUS_GENRES[selectedGenre] && (
                <div>
                  <label className={sectionLabelClass}>Sous-genre</label>
                  <select
                    className={selectClass}
                    value={selectedSousGenre}
                    onChange={(e) => setSelectedSousGenre(e.target.value)}
                  >
                    <option value="" className={optionClass}>Laisser vide</option>
                    {SOUS_GENRES[selectedGenre].map(sg => (
                      <option key={sg} value={sg} className={optionClass}>{sg}</option>
                    ))}
                  </select>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full rounded-full border border-sky-100/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(147,197,253,0.11),rgba(196,181,253,0.08))] px-6 py-4 text-[11px] font-black uppercase tracking-[0.26em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_24px_rgba(96,165,250,0.12)] transition-all hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_0_28px_rgba(96,165,250,0.16)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(147,197,253,0.14),rgba(196,181,253,0.1))] disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmitting ? "TRANSFERT EN COURS..." : "✅ PUBLIER LA PÉPITE"}
              </button>
            </form>
          </>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.45),rgba(255,255,255,0.04))] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-8">
            <h2 className="text-2xl font-black uppercase italic text-white">Déjà partagé</h2>
            <p className="mt-5 text-[13px] leading-6 text-white/80">
              Ce morceau a déjà été envoyé par un autre auditeur. 
              Souhaites-tu créer une <strong>Balise de Détresse</strong> ?
            </p>
            <p className="mb-8 mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/48">
              Une balise de détresse sert à faire remonter le son dans les classements. 
              En l'activant, tu gagneras une partie des perles générées par la remontée du morceau.
            </p>
            <button 
              onClick={handleCreateBalise} 
              disabled={isSubmitting} 
              className="mb-3 w-full rounded-full border border-sky-100/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(147,197,253,0.11),rgba(196,181,253,0.08))] px-6 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_24px_rgba(96,165,250,0.12)] transition-all hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_0_28px_rgba(96,165,250,0.16)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(147,197,253,0.14),rgba(196,181,253,0.1))] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "ACTIVATION EN COURS..." : "✅ OUI, LANCER LA BALISE"}
            </button>
            <button 
              onClick={() => setShowBaliseOption(false)} 
              className="w-full rounded-full border border-white/14 bg-[linear-gradient(180deg,rgba(0,0,0,0.42),rgba(255,255,255,0.03))] px-6 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-colors hover:border-sky-200/24 hover:text-sky-50"
            >
              ❌ NON, TANT PIS
            </button>
          </div>
        )}
        
        {message && (
          <div className={`mt-6 rounded-[22px] border px-4 py-4 text-center text-[12px] font-black uppercase tracking-[0.16em] ${messageClass}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
