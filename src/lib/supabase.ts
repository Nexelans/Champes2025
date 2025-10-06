import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Club = {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export type Season = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

export type Team = {
  id: string;
  club_id: string;
  season_id: string;
  division: 'champe1' | 'champe2';
  created_at: string;
  club?: Club;
};

export type Captain = {
  id: string;
  user_id: string | null;
  team_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  created_at: string;
};

export type Player = {
  id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  license_number: string | null;
  handicap_index: number;
  gender: 'M' | 'F';
  is_junior: boolean;
  created_at: string;
  updated_at: string;
};

export type Match = {
  id: string;
  season_id: string;
  division: 'champe1' | 'champe2';
  round_number: number;
  match_date: string;
  host_club_id: string;
  team1_id: string;
  team2_id: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  team1_points: number;
  team2_points: number;
  created_at: string;
  updated_at: string;
};

export type IndividualMatch = {
  id: string;
  match_id: string;
  match_order: number;
  team1_player_id: string;
  team2_player_id: string;
  team1_player2_id: string | null;
  team2_player2_id: string | null;
  result: 'team1_win' | 'team2_win' | 'draw' | null;
  team1_points: number;
  team2_points: number;
  created_at: string;
  updated_at: string;
};

export type SeasonClub = {
  id: string;
  season_id: string;
  club_id: string;
  division: 'champe1' | 'champe2';
  is_participating: boolean;
  created_at: string;
};

export type SeasonDate = {
  id: string;
  season_id: string;
  division: 'champe1' | 'champe2';
  round_number: number;
  planned_date: string;
  host_club_id: string | null;
  created_at: string;
};