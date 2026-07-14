export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          preferred_locale: "de" | "en" | "bg";
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          preferred_locale?: "de" | "en" | "bg";
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          display_name?: string | null;
          preferred_locale?: "de" | "en" | "bg";
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          is_active: boolean;
          role: "user" | "admin";
          updated_at: string;
          user_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
