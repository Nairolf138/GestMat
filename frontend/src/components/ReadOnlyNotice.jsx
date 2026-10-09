import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
export default function ReadOnlyNotice() {
  const { data } = useQuery({
    queryKey: ['runtime-mode'],
    queryFn: () => api('/auth/runtime', {}, false),
    retry: false,
    staleTime: 30000,
  });
  return data?.readOnly ? (
    <div className="alert alert-warning" role="status">
      GestMat est temporairement en consultation seule. Les modifications sont
      suspendues.
    </div>
  ) : null;
}
