import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type CaptainInfo = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  club_id: string;
  club_name: string;
  division: 'champe1' | 'champe2';
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  captain: CaptainInfo | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [captain, setCaptain] = useState<CaptainInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadCaptainInfo(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadCaptainInfo(session.user.id);
      } else {
        setCaptain(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCaptainInfo = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('captains')
        .select(`
          id,
          team_id,
          first_name,
          last_name,
          phone,
          email,
          teams!inner(
            club_id,
            division,
            clubs!inner(name)
          )
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const team = (data as any).teams;
        setCaptain({
          id: data.id,
          team_id: data.team_id,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          email: data.email,
          club_id: team.club_id,
          club_name: team.clubs.name,
          division: team.division,
        });
      }
    } catch (error) {
      console.error('Error loading captain info:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCaptain(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        captain,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
