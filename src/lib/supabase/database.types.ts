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
      user_locations: {
        Row: {
          address_city: string | null;
          address_county: string | null;
          address_district: string | null;
          address_formatted: string | null;
          address_house_number: string | null;
          address_latitude: number | null;
          address_locality: string | null;
          address_longitude: number | null;
          address_name: string | null;
          address_osm_id: number | null;
          address_osm_type: "N" | "P" | "R" | "W" | null;
          address_postcode: string | null;
          address_state: string | null;
          address_street: string | null;
          address_type: string | null;
          continent_code: "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";
          country_code: string;
          country_latitude: number;
          country_longitude: number;
          country_name: string;
          country_osm_id: number;
          country_osm_type: "N" | "P" | "R" | "W";
          created_at: string;
          kind: "home" | "viewing";
          provider: "photon";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address_city?: string | null;
          address_county?: string | null;
          address_district?: string | null;
          address_formatted?: string | null;
          address_house_number?: string | null;
          address_latitude?: number | null;
          address_locality?: string | null;
          address_longitude?: number | null;
          address_name?: string | null;
          address_osm_id?: number | null;
          address_osm_type?: "N" | "P" | "R" | "W" | null;
          address_postcode?: string | null;
          address_state?: string | null;
          address_street?: string | null;
          address_type?: string | null;
          continent_code: "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";
          country_code: string;
          country_latitude: number;
          country_longitude: number;
          country_name: string;
          country_osm_id: number;
          country_osm_type: "N" | "P" | "R" | "W";
          created_at?: string;
          kind: "home" | "viewing";
          provider?: "photon";
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address_city?: string | null;
          address_county?: string | null;
          address_district?: string | null;
          address_formatted?: string | null;
          address_house_number?: string | null;
          address_latitude?: number | null;
          address_locality?: string | null;
          address_longitude?: number | null;
          address_name?: string | null;
          address_osm_id?: number | null;
          address_osm_type?: "N" | "P" | "R" | "W" | null;
          address_postcode?: string | null;
          address_state?: string | null;
          address_street?: string | null;
          address_type?: string | null;
          continent_code?: "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";
          country_code?: string;
          country_latitude?: number;
          country_longitude?: number;
          country_name?: string;
          country_osm_id?: number;
          country_osm_type?: "N" | "P" | "R" | "W";
          kind?: "home" | "viewing";
          provider?: "photon";
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_locations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
