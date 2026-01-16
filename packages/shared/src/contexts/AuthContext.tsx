import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 프로필 upsert (닉네임 저장)
  const upsertProfile = async (user: User) => {
    const nickname = user.user_metadata?.name ||
                     user.user_metadata?.full_name ||
                     user.user_metadata?.preferred_username ||
                     user.email?.split('@')[0] || '';

    try {
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          nickname: nickname,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        });
    } catch (err) {
      console.error('Failed to upsert profile:', err);
    }
  };

  useEffect(() => {
    // 현재 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        upsertProfile(session.user);
      }
      setLoading(false);
    });

    // 인증 상태 변화 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // 로그인 시 프로필 저장
      if (event === 'SIGNED_IN' && session?.user) {
        upsertProfile(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithKakao = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'login',
        },
      },
    });

    if (error) {
      console.error('Kakao login error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    // 세션이 없으면 로컬 상태만 초기화
    if (!session) {
      setUser(null);
      setSession(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      // 세션 관련 에러는 무시하고 로컬 상태 초기화
      if (error.message?.includes('session')) {
        setUser(null);
        setSession(null);
        return;
      }
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithKakao, signOut }}>
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
