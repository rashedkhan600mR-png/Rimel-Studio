import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key && !url.includes('YOUR_PROJECT'))
export const supabase = isConfigured
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'rimelstudio60@gmail.com').toLowerCase()
export const SHOP_NAME = import.meta.env.VITE_SHOP_NAME || 'রিমেল স্টুডিও'
export const BUCKET = 'customer-uploads'
