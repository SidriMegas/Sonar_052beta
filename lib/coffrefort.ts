import { supabase } from '@/lib/supabase';

type CoffreStatus = 'locked' | 'opened_first' | 'opened_second' | 'dead' | 'destroyed';

interface CoffreActif {
  id: string;
  recompense_titre: string;
  recompense_description: string | null;
  recompense_points: number;
  status: CoffreStatus;
  essais_max: number;
  essais_restants: number;
  pourcentage_vie: number;
  created_at: string;
  expires_at: string | null;
  first_opener_username: string | null;
  first_opened_at: string | null;
  first_opener_message: string | null;
  second_opened_at: string | null;
  total_tentatives: number;
  nb_participants: number;
}

interface CoffreIndice {
  id: string;
  indice_text: string;
  page_location: string | null;
  hint_type: string;
  ordre: number;
}

interface TentativeResponse {
  success: boolean;
  status: string;
  message: string;
  essais_restants: number;
  essais_max: number;
  pourcentage_vie: number;
  recompense_titre?: string;
  recompense_description?: string;
  recompense_url?: string;
  points_gagnes?: number;
  mot_du_premier?: string;
  cooldown?: boolean;
}

function isMissingFunctionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as { code?: string }).code;
  return code === 'PGRST202' || code === '42883';
}

function toPercent(essaisRestants: number, essaisMax: number): number {
  if (essaisMax <= 0) {
    return 0;
  }
  return Math.max(0, Math.round((essaisRestants / essaisMax) * 100));
}

export async function getCoffreActif() {
  const rpc = await supabase.rpc('fn_coffrefort_get_actif');

  if (!rpc.error) {
    const first = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    return { data: (first as CoffreActif | null) ?? null, error: null };
  }

  if (!isMissingFunctionError(rpc.error)) {
    return { data: null, error: rpc.error };
  }

  // Fallback sans RPC pour garder une page fonctionnelle.
  const { data, error } = await supabase
    .from('coffrefort')
    .select('id,recompense_titre,recompense_description,recompense_points,status,essais_max,essais_restants,created_at,expires_at,first_opened_at,first_opener_id,first_opener_message,second_opened_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error };
  }

  const [tentativesRes, firstUserRes] = await Promise.all([
    supabase
      .from('coffrefort_tentatives')
      .select('id,user_id', { count: 'exact' })
      .eq('coffre_id', data.id),
    data.first_opener_id
      ? supabase.from('digger').select('username').eq('id', data.first_opener_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const participants = new Set<string>(
    (tentativesRes.data || []).map((row: { user_id: string }) => row.user_id)
  );

  const coffre: CoffreActif = {
    ...data,
    pourcentage_vie: toPercent(data.essais_restants, data.essais_max),
    first_opener_username: firstUserRes.data?.username ?? null,
    total_tentatives: tentativesRes.count ?? 0,
    nb_participants: participants.size,
  };

  return { data: coffre, error: null };
}

export async function getIndices(coffreId: string) {
  const { data, error } = await supabase
    .from('coffrefort_indices')
    .select('id,indice_text,page_location,hint_type,ordre')
    .eq('coffre_id', coffreId)
    .eq('is_visible', true)
    .order('ordre', { ascending: true })
    .order('created_at', { ascending: true });

  return { data: (data as CoffreIndice[] | null) ?? [], error };
}

export async function tenterCode(coffreId: string, userId: string, codeEssaye: string) {
  if (!/^\d{6}$/.test(codeEssaye)) {
    return {
      data: {
        success: false,
        status: 'invalid_code',
        message: 'Le code doit contenir exactement 6 chiffres.',
      },
      error: null,
    };
  }

  const { data, error } = await supabase.rpc('fn_coffrefort_tenter', {
    p_coffre_id: coffreId,
    p_user_id: userId,
    p_code_essaye: codeEssaye,
  });

  if (error) {
    return {
      data: {
        success: false,
        status: 'error',
        message: error.message,
      },
      error,
    };
  }

  const first = Array.isArray(data) ? data[0] : data;
  return { data: (first as TentativeResponse) ?? null, error: null };
}

export async function laisserMot(coffreId: string, userId: string, message: string) {
  const safeMessage = message.trim().slice(0, 500);
  if (!safeMessage) {
    return {
      data: { success: false, error: 'Message vide.' },
      error: null,
    };
  }

  const { data, error } = await supabase.rpc('fn_coffrefort_laisser_mot', {
    p_coffre_id: coffreId,
    p_user_id: userId,
    p_message: safeMessage,
  });

  if (error) {
    return { data: { success: false, error: error.message }, error };
  }

  const first = Array.isArray(data) ? data[0] : data;
  return { data: first ?? { success: true }, error: null };
}

export async function creerCoffre(
  createdBy: string,
  codeSecret: string,
  recompenseTitre: string,
  recompenseDescription?: string,
  recompenseUrl?: string,
  recompensePoints = 100,
  essaisMax = 100
) {
  if (!/^\d{6}$/.test(codeSecret)) {
    return { data: { success: false, error: 'Le code secret doit faire 6 chiffres.' }, error: null };
  }

  const { data, error } = await supabase.rpc('fn_coffrefort_creer', {
    p_created_by: createdBy,
    p_code_secret: codeSecret,
    p_recompense_titre: recompenseTitre.trim(),
    p_recompense_description: recompenseDescription?.trim() || null,
    p_recompense_url: recompenseUrl?.trim() || null,
    p_recompense_points: Math.max(1, Math.floor(recompensePoints)),
    p_essais_max: Math.max(1, Math.floor(essaisMax)),
  });

  if (error) {
    return { data: { success: false, error: error.message }, error };
  }

  const first = Array.isArray(data) ? data[0] : data;
  return { data: first ?? { success: true }, error: null };
}

export async function ajouterIndice(
  userId: string,
  coffreId: string,
  indiceText: string,
  pageLocation?: string,
  hintType = 'text',
  ordre = 0
) {
  const { data, error } = await supabase.rpc('fn_coffrefort_ajouter_indice', {
    p_user_id: userId,
    p_coffre_id: coffreId,
    p_indice_text: indiceText.trim(),
    p_page_location: pageLocation?.trim() || null,
    p_hint_type: hintType,
    p_ordre: Math.floor(ordre),
  });

  if (error) {
    return { data: { success: false, error: error.message }, error };
  }

  const first = Array.isArray(data) ? data[0] : data;
  return { data: first ?? { success: true }, error: null };
}

export async function getTableauEssais(coffreId: string) {
  const rpc = await supabase.rpc('fn_coffrefort_tableau_essais', {
    p_coffre_id: coffreId,
  });

  if (!rpc.error) {
    return { data: rpc.data || [], error: null };
  }

  if (!isMissingFunctionError(rpc.error)) {
    return { data: [], error: rpc.error };
  }

  const { data, error } = await supabase
    .from('coffrefort_tentatives')
    .select('user_id,is_correct,created_at,digger:user_id(username,avatar_url)')
    .eq('coffre_id', coffreId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return { data: [], error };
  }

  const byUser = new Map<string, {
    coffre_id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    nb_tentatives: number;
    nb_reussites: number;
    nb_echecs: number;
    premiere_tentative: string;
    derniere_tentative: string;
    duree_totale: string;
    a_trouve: boolean;
    rang: number;
  }>();

  for (const row of data as Array<any>) {
    const existing = byUser.get(row.user_id);
    if (!existing) {
      byUser.set(row.user_id, {
        coffre_id: coffreId,
        user_id: row.user_id,
        username: row.digger?.username || 'Anonyme',
        avatar_url: row.digger?.avatar_url || null,
        nb_tentatives: 1,
        nb_reussites: row.is_correct ? 1 : 0,
        nb_echecs: row.is_correct ? 0 : 1,
        premiere_tentative: row.created_at,
        derniere_tentative: row.created_at,
        duree_totale: '0s',
        a_trouve: !!row.is_correct,
        rang: 0,
      });
      continue;
    }

    existing.nb_tentatives += 1;
    existing.nb_reussites += row.is_correct ? 1 : 0;
    existing.nb_echecs += row.is_correct ? 0 : 1;
    existing.derniere_tentative = row.created_at;
    existing.a_trouve = existing.a_trouve || !!row.is_correct;

    const start = new Date(existing.premiere_tentative).getTime();
    const end = new Date(existing.derniere_tentative).getTime();
    const seconds = Math.max(0, Math.round((end - start) / 1000));
    existing.duree_totale = `${seconds}s`;
  }

  const list = Array.from(byUser.values()).sort((a, b) => {
    if (a.a_trouve !== b.a_trouve) {
      return a.a_trouve ? -1 : 1;
    }
    if (a.nb_tentatives !== b.nb_tentatives) {
      return a.nb_tentatives - b.nb_tentatives;
    }
    return new Date(a.premiere_tentative).getTime() - new Date(b.premiere_tentative).getTime();
  });

  list.forEach((row, index) => {
    row.rang = index + 1;
  });

  return { data: list, error: null };
}