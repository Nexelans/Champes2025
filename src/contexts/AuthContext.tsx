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

type AdminInfo = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  captain: CaptainInfo | null;
  admin: AdminInfo | null;
  isAdmin: boolean;
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
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserInfo(session.user.id);
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
        loadUserInfo(session.user.id);
      } else {
        setCaptain(null);
        setAdmin(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserInfo = async (userId: string) => {
    try {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (adminData) {
        setAdmin({
          id: adminData.id,
          first_name: adminData.first_name,
          last_name: adminData.last_name,
          email: adminData.email,
        });
        setLoading(false);
        return;
      }

      const { data: captainData, error } = await supabase
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

      if (captainData) {
        const team = (captainData as any).teams;
        setCaptain({
          id: captainData.id,
          team_id: captainData.team_id,
          first_name: captainData.first_name,
          last_name: captainData.last_name,
          phone: captainData.phone,
          email: captainData.email,
          club_id: team.club_id,
          club_name: team.clubs.name,
          division: team.division,
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!adminData) {
        const { data: seasonData } = await supabase
          .from('seasons')
          .select('is_configuration_validated')
          .eq('is_active', true)
          .maybeSingle();

        if (!seasonData?.is_configuration_validated) {
          await supabase.auth.signOut();
          return {
            error: {
              message: 'La configuration du championnat n\'est pas encore validée. Veuillez contacter l\'administrateur.',
            },
          };
        }
      }
    }

    return { error: null };
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
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        captain,
        admin,
        isAdmin: !!admin,
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
