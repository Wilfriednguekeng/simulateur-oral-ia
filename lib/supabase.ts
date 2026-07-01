import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fbbnknjeqygidtmtmruz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiYm5rbmplcXlnaWR0bXRtcnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4OTYzMjUsImV4cCI6MjA5ODQ3MjMyNX0.1aYe1OQo7lLPTI2rvBS_2lL2S3_PLH6nhvAx1GoVQik'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
