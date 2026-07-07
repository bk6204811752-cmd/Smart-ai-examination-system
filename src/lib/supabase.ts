import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || ''
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''

const isPlaceholder = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('YOUR_SUPABASE_URL') || 
  supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')

if (isPlaceholder) {
  console.warn(
    '⚠️ [Supabase] Supabase URL or Anon Key is missing or set to a placeholder. ' +
    'Please configure them in your .env file.'
  )
}

// Fallback to placeholder URLs if not set to prevent runtime crashes during client instantiation
export const supabase = createClient(
  isPlaceholder ? 'https://placeholder.supabase.co' : supabaseUrl,
  isPlaceholder ? 'placeholder' : supabaseAnonKey
)
