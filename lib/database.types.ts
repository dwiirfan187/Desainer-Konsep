/**
 * database.types.ts
 *
 * Type definitions untuk skema Supabase.
 * Dibuat manual sesuai PRD Bagian 8.
 *
 * Tip: Setelah project live, file ini bisa di-generate otomatis via:
 *   npx supabase gen types typescript --project-id <project-id> > lib/database.types.ts
 */

export type DesignType = "poster" | "feed" | "logo" | "banner";
export type PlatformTarget = "chatgpt" | "midjourney" | "dalle" | "other";

export interface Database {
  public: {
    Tables: {
      // ------------------------------------------------------------------ //
      users: {
        Row: {
          id: string;           // uuid
          email: string;
          created_at: string;   // timestamptz
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
      };

      // ------------------------------------------------------------------ //
      design_requests: {
        Row: {
          id: string;                     // uuid
          user_id: string | null;         // FK → users.id (nullable: anonim)
          design_type: DesignType;
          topic: string;
          mood_tags: string[];            // array of text
          target_audience: string | null;
          color_preference: string | null;
          extra_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          design_type: DesignType;
          topic: string;
          mood_tags: string[];
          target_audience?: string | null;
          color_preference?: string | null;
          extra_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          design_type?: DesignType;
          topic?: string;
          mood_tags?: string[];
          target_audience?: string | null;
          color_preference?: string | null;
          extra_notes?: string | null;
          created_at?: string;
        };
      };

      // ------------------------------------------------------------------ //
      generated_concepts: {
        Row: {
          id: string;             // uuid
          request_id: string;     // FK → design_requests.id
          title: string;
          description: string;
          color_palette: string[]; // json array of hex strings
          style_reference: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          title: string;
          description: string;
          color_palette: string[];
          style_reference: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          title?: string;
          description?: string;
          color_palette?: string[];
          style_reference?: string;
          created_at?: string;
        };
      };

      // ------------------------------------------------------------------ //
      generated_prompts: {
        Row: {
          id: string;                       // uuid
          concept_id: string;               // FK → generated_concepts.id
          prompt_text: string;
          platform_target: PlatformTarget;
          created_at: string;
        };
        Insert: {
          id?: string;
          concept_id: string;
          prompt_text: string;
          platform_target: PlatformTarget;
          created_at?: string;
        };
        Update: {
          id?: string;
          concept_id?: string;
          prompt_text?: string;
          platform_target?: PlatformTarget;
          created_at?: string;
        };
      };

      // ------------------------------------------------------------------ //
      saved_history: {
        Row: {
          id: string;           // uuid
          user_id: string;      // FK → users.id
          prompt_id: string;    // FK → generated_prompts.id
          is_favorite: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt_id: string;
          is_favorite?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt_id?: string;
          is_favorite?: boolean;
          created_at?: string;
        };
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      design_type: DesignType;
      platform_target: PlatformTarget;
    };
  };
}
