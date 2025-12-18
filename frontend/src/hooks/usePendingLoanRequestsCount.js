import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function usePendingLoanRequestsCount({ enabled = true, userId } = {}) {
  const queryKey = ['pendingLoanRequestsCount', userId ?? 'anonymous'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await api('/loans/pending/count');
      const count = typeof result?.count === 'number' ? result.count : 0;
      return Math.max(0, count);
    },
    enabled,
    refetchInterval: enabled ? 60000 : false,
  });

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export default usePendingLoanRequestsCount;
