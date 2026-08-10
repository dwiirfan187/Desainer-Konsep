import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseServiceKey) {
  throw new Error(
    "Missing environment variable: SUPABASE_SERVICE_ROLE_KEY"
  );
}

/**
 * Supabase admin client dengan service_role key.
 * ⚠️  HANYA boleh dipakai di server-side (API Routes / Server Actions).
 *     JANGAN pernah import file ini dari komponen client-side.
 *     Service key membypass Row Level Security.
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Untyped admin client — dipakai di API routes yang butuh insert/update
 * kolom JSONB (color_palette) di mana Supabase JS strict typing
 * tidak bisa resolve dengan benar dari Database generic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdminUntyped = createClient<any>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
