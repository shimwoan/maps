import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Profile {
  id: string;
  user_id: string;
  business_card_url: string | null;
  nickname: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        throw error;
      }
      setProfile(data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateBusinessCard = async (imageUrl: string) => {
    if (!user) return null;

    try {
      // upsert - 있으면 업데이트, 없으면 생성
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          business_card_url: imageUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Failed to update business card:', err);
      throw err;
    }
  };

  const uploadBusinessCard = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not logged in');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/business_card_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('business-cards')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('business-cards')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const hasBusinessCard = !!profile?.business_card_url;

  return {
    profile,
    isLoading,
    hasBusinessCard,
    updateBusinessCard,
    uploadBusinessCard,
    refetch: fetchProfile,
  };
}
