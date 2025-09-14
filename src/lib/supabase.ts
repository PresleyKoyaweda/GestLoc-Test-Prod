import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Configuration Supabase manquante');
  throw new Error('Variables d\'environnement Supabase requises');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Types pour TypeScript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          role: 'owner' | 'tenant'
          avatar_url: string | null
          address: any
          preferences: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role?: 'owner' | 'tenant'
          avatar_url?: string | null
          address?: any
          preferences?: any
        }
        Update: {
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          address?: any
          preferences?: any
          updated_at?: string
        }
      }
    }
  }
}