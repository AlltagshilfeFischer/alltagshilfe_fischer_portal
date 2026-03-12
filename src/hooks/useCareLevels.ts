import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CareLevel } from '@/types/domain';

export function useCareLevels() {
  return useQuery({
    queryKey: ['care_levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_levels' as never)
        .select('*')
        .order('pflegegrad');
      if (error) throw error;
      return (data ?? []) as CareLevel[];
    },
    staleTime: 1000 * 60 * 60, // 1 Stunde cachen (ändert sich selten)
  });
}
