import { createClient } from '@supabase/supabase-js'

// ICI : Tu colles tes codes directement entre les ' '
const supabaseUrl = 'sb_publishable_3ypsA6GiytvbukuT_M4hTg_gymFMYbW' 
const supabaseAnonKey = 'sb_secret_AgNT0LaXzOyLQUSrL7vqGw_QsiJ_rvZJ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)