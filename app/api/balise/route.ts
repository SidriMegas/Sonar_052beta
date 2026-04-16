import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const YT_KEY = process.env.YOUTUBE_API_KEY

// 💎 CALCULER LES POINTS (FORMULE UNIFORME)
const calculerPointsUnitaire = (vues: number): number => {
  if (!vues || vues <= 0) return 100
  if (vues <= 1000) return 100
  if (vues <= 3000) return 90
  if (vues <= 10000) return 60
  if (vues <= 20000) return 40
  if (vues <= 50000) return 30
  if (vues <= 100000) return 10
  return 1
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { urlYoutube, artiste, titre, beatmaker, genre, pays, user_id } = body

        if (!urlYoutube) {
            return NextResponse.json(
                { error: "Lien YouTube manquant" },
                { status: 400 }
            )
        }

        if (!user_id) {
            return NextResponse.json(
                { error: "Utilisateur non identifié" },
                { status: 401 }
            )
        }

        // 🔍 EXTRACTION ID YOUTUBE
        const videoId = urlYoutube.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]

        if (!videoId) {
            return NextResponse.json(
                { error: "URL YouTube invalide" },
                { status: 400 }
            )
        }

        // 🔐 ANTI-DOUBLON
        const { data: existant } = await supabase
            .from('titre')
            .select('id, nom_titre')
            .eq('youtube_id', videoId)
            .maybeSingle()

        if (existant) {
            return NextResponse.json(
                { error: `Cette pépite existe déjà ! "${existant.nom_titre}"` },
                { status: 409 }
            )
        }

        // 🎬 APPEL YOUTUBE API
        if (!YT_KEY) {
            throw new Error("YouTube API Key manquante")
        }

        const ytRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YT_KEY}`,
            { next: { revalidate: 0 } }
        )

        if (!ytRes.ok) {
            throw new Error(`YouTube API erreur: ${ytRes.status}`)
        }

        const ytData = await ytRes.json()

        if (!ytData.items || ytData.items.length === 0) {
            return NextResponse.json(
                { error: "Vidéo introuvable sur YouTube" },
                { status: 404 }
            )
        }

        const item = ytData.items[0]
        const titreSavedYT = item.snippet?.title || titre || "Sans titre"
        const dateSortie = item.snippet?.publishedAt
        const vues = parseInt(item.statistics?.viewCount || "0") || 0

        // 💎 CALCULER SCORE AVEC FORMULE UNIFORME (CORRIGÉ!)
        const scoreInitial = calculerPointsUnitaire(vues)

        // 📝 ENREGISTREMENT
        const { data, error: insertError } = await supabase
            .from('titre')
            .insert([{
                nom_artiste: artiste?.trim() || "Artiste inconnu",
                nom_titre: titre?.trim() || titreSavedYT,
                youtube_url: urlYoutube,
                youtube_id: videoId,
                vues_au_partage: vues,
                vues_actuelles: vues,
                points: scoreInitial,  // ✅ UTILISE LA FONCTION COMMUNE
                date_sortie: dateSortie,
                beatmaker: beatmaker?.trim() || "Producteur inconnu",
                genre: genre?.trim() || "Non défini",
                pays: pays?.trim() || "Global",
                user_id: user_id,
                likes: 0,
                balise_active: 0,
                balise_totale: 0,
                last_scan: new Date().toISOString()
            }])
            .select('id, nom_titre, points, vues_actuelles')
            .single()

        if (insertError) {
            console.error("Erreur insertion:", insertError)
            return NextResponse.json(
                { error: `Erreur base de données: ${insertError.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json(
            {
                success: true,
                message: "🎵 Pépite immergée avec succès !",
                data: {
                    id: data?.id,
                    titre: data?.nom_titre,
                    points: data?.points,
                    vues: data?.vues_actuelles
                }
            },
            { status: 201 }
        )

    } catch (err: any) {
        console.error("Erreur serveur:", err)
        return NextResponse.json(
            { error: `Erreur: ${err.message}` },
            { status: 500 }
        )
    }
}

export async function GET() {
    return NextResponse.json({
        message: "✅ Robot de partage opérationnel",
        aide: "POST /api/partager"
    })
}