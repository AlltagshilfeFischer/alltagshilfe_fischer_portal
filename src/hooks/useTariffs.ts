import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tariff } from '@/types/domain';

export function useTariffs() {
  return useQuery({
    queryKey: ['tariffs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tariffs' as never)
        .select('*')
        .eq('active', true)
        .order('service_type');
      if (error) {
        console.warn('tariffs nicht verfügbar:', error.message);
        return [] as Tariff[];
      }
      return (data ?? []) as Tariff[];
    },
    staleTime: 1000 * 60 * 10, // 10 Minuten cachen
  });
}
