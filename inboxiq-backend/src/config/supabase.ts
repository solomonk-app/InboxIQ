import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment");
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Service-role client — used server-side, bypasses Row Level Security
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// Anon client factory — for user-scoped queries with RLS
export const createUserClient = (accessToken: string): SupabaseClient =>
  createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
