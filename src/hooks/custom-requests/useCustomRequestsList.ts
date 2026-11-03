import { useQuery } from '@tanstack/react-query';
import { customRequestApi } from '../../services/api/customRequest.api';
import {
  CustomServiceRequest,
  CustomRequestStatus,
  CustomRequestsPagination,
} from '../../types/customRequest.types';

export function useCustomRequestsList(status?: CustomRequestStatus | 'ALL') {
  const query = useQuery({
    queryKey: ['custom-requests', 'list', status],
    queryFn: () => customRequestApi.getMyRequests({ status, page: 1, limit: 50 }),
    staleTime: 1000 * 30, // 30 seconds
  });

  const requests: CustomServiceRequest[] = query.data?.requests || [];
  const pagination: CustomRequestsPagination = query.data?.pagination || {
    total: requests.length,
    page: 1,
    limit: 50,
  };

  return {
    requests,
    pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
