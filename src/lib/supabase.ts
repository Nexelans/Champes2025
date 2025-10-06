import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      clubs: {
        Row: {
          id: string;
          name: string;
          website: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clubs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['clubs']['Insert']>;
      };
      teams: {
        Row: {
          id: string;
          club_id: string;
          division: 'champe1' | 'champe2';
          season: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
      };
      players: {
        Row: {
          id: string;
          club_id: string;
          first_name: string;
          last_name: string;
          index_value: number;
          license_number: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
      };
      matches: {
        Row: {
          id: string;
          season: string;
          division: 'champe1' | 'champe2';
          round_number: number;
          match_date: string;
          host_club_id: string;
          team1_id: string;
          team2_id: string;
          team1_points: number;
          team2_points: number;
          is_final: boolean;
          status: 'scheduled' | 'in_progress' | 'completed';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['matches']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };
    };
  };
};