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
    Functions: {
      admin_set_user_active: {
        Args: { p_is_active: boolean; p_target_user_id: string };
        Returns: undefined;
      };
      admin_set_user_role: {
        Args: { p_role: "user" | "admin"; p_target_user_id: string };
        Returns: undefined;
      };
      set_own_avatar_path: {
        Args: { p_avatar_path: string | null };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
