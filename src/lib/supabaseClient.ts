import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const deriveSupabaseStorageKey = (url: string | undefined): string | null => {
  if (!url) {
    return null
  }

  try {
    const parsed = new URL(url)
    const projectRef = parsed.hostname.split('.')[0]

    if (!projectRef) {
      return null
    }

    return `sb-${projectRef}-auth-token`
  } catch (error) {
    console.error('Unable to derive Supabase storage key', error)
    return null
  }
}

export const supabaseStorageKey = deriveSupabaseStorageKey(supabaseUrl)

let client: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export const supabase = client
