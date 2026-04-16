import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const YT_KEY = process.env.YOUTUBE_API_KEY;

// 🛠️ FONCTION : CONVERTIR DURÉE YOUTUBE (ISO 8601) EN SECONDES
const parseYouTubeDuration = (duration: string): number => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')
    return hours * 3600 + minutes * 60 + seconds
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { 
            urlYoutube, 
            artiste, 
            titre, 
            beatmaker, 
            genre, 
            sous_genre,
            pays, 
            user_id,
            type_partage,
            autopromo,
            type_musique
        } = body;

        const isProdShare = type_musique === 'prod';
        const targetTable = isProdShare ? 'prod' : 'titre';

        if (!urlYoutube) {
            return NextResponse.json({ error: "Lien manquant" }, { status: 400 });
        }

        // A. Extraction de l'ID YouTube
        const videoId = urlYoutube.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];

        if (!videoId) {
            return NextResponse.json({ error: "Lien YouTube invalide" }, { status: 400 });
        }

        // B. Anti-doublon
        const [{ data: existingTrack }, { data: existingProd }] = await Promise.all([
            supabase.from('titre').select('id').eq('youtube_id', videoId).maybeSingle(),
            supabase.from('prod').select('id').eq('youtube_id', videoId).maybeSingle(),
        ]);
        const existant = existingTrack || existingProd;
        if (existant) return NextResponse.json({ error: "Cette pépite est déjà dans le Cycle !" }, { status: 400 });

        // C. 🔥 APPEL YOUTUBE AVEC contentDetails POUR LA DURÉE
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${YT_KEY}`);
        const ytData = await ytRes.json();

        if (!ytData.items || ytData.items.length === 0) {
            return NextResponse.json({ error: "Vidéo introuvable sur YouTube" }, { status: 404 });
        }

        const item = ytData.items[0];
        const titreVideo = item.snippet.title;
        const dateDeSortie = item.snippet.publishedAt; 
        const vues = parseInt(item.statistics.viewCount) || 0;
        const youtubeChannelId = item.snippet.channelId;

        // 🔥 ÉTAPE CLÉS : VÉRIFIER LA DURÉE (MAX 10 MINUTES)
        const durationISO = item.contentDetails?.duration;
        let durationSeconds = 0;

        if (durationISO) {
            durationSeconds = parseYouTubeDuration(durationISO);
            
            // 🚫 SI PLUS DE 10 MINUTES (600 secondes), REFUSER
            if (durationSeconds > 600) {
                const minutes = Math.floor(durationSeconds / 60);
                const seconds = durationSeconds % 60;
                return NextResponse.json({ 
                    error: `Format invalide : La vidéo dépasse 10 minutes (${minutes}m ${seconds}s détectées). Les mixes et albums sont interdits.` 
                }, { status: 403 });
            }
        }

        // D. Score Sonar : démarre à 0, évolue uniquement via les likes
        const scoreInitial = 0;

        // E. Enregistrement final AVEC duree_secondes 🔥
        const { data, error } = await supabase
            .from(targetTable)
            .insert([{ 
                nom_artiste: artiste || "Inconnu",
                nom_titre: titre || titreVideo,
                youtube_url: urlYoutube,
                youtube_id: videoId,
                youtube_channel_id: youtubeChannelId,
                vues_au_partage: vues,
                vues_actuelles: vues,
                points: scoreInitial,
                date_sortie: dateDeSortie, 
                beatmaker: beatmaker || "Inconnu",
                genre: genre || "Non défini",
                sous_genre: sous_genre || null,
                pays: pays || "Global",
                duree_secondes: durationSeconds,  // 🔥 NOUVELLE COLONNE
                user_id: user_id,
                likes: 0,
                ...(isProdShare
                    ? {}
                    : {
                        type_partage: type_partage || "partage",
                        autopromo: autopromo || false,
                    })
            }])
            .select();

        if (error) {
            return NextResponse.json({ error: "Erreur Supabase : " + error.message }, { status: 500 });
        }

        return NextResponse.json({ 
            message: "Immersion réussie !", 
            titre: titre || titreVideo,
            vues_detectees: vues,
            duree: `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
        });

    } catch (err: any) {
        return NextResponse.json({ error: "Erreur serveur : " + err.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: "Robot Scanner opérationnel (limite 10 min)" });
}