import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Request {
  id: string;
  user_id: string;
  visit_type: string;
  as_type: string;
  title: string;
  address: string;
  address_detail: string | null;
  latitude: number | null;
  longitude: number | null;
  expected_fee: number;
  duration: string;
  schedule_date: string;
  schedule_time: string;
  required_personnel: number;
  description: string | null;
  status: string;
  created_at: string;
}

export function useRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'pending')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return { requests, isLoading, error, refetch: fetchRequests };
}
