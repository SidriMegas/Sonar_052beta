import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Variables Supabase manquantes.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. On va chercher les bouteilles encore non attribuées
    const { data: allBottles, error: bottlesError } = await supabase
      .from('bottles')
      .select('id, user_id')
      .eq('is_caught', false)
      .is('target_user_id', null);

    if (bottlesError) throw bottlesError;

    if (!allBottles || allBottles.length === 0) {
      return NextResponse.json({ info: "L'océan est calme, pas de bouteilles en attente." });
    }

    // 2. On en choisit une au hasard
    const randomBottle = allBottles[Math.floor(Math.random() * allBottles.length)];

    // 3. On choisit un destinataire (un Digger) au hasard, différent de l'expéditeur
    const { data: diggers, error: diggersError } = await supabase
      .from('digger')
      .select('id')
      .neq('id', randomBottle.user_id);

    if (diggersError) throw diggersError;
    
    if (!diggers || diggers.length === 0) {
      return NextResponse.json({ error: "Aucun destinataire disponible." }, { status: 404 });
    }

    const randomDigger = diggers[Math.floor(Math.random() * diggers.length)];

    // 4. On attribue la bouteille. La contrainte target_user_id IS NULL évite la double attribution.
    const { error: updateError } = await supabase
      .from('bottles')
      .update({ target_user_id: randomDigger.id })
      .eq('id', randomBottle.id)
      .is('target_user_id', null)
      .eq('is_caught', false);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: "Le courant a emporté une bouteille !",
      bottle_id: randomBottle.id,
      vers: randomDigger.id 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}