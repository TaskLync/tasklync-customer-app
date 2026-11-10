import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { customRequestApi } from '../../services/api/customRequest.api';
import { CreateCustomRequestDto, CustomServiceRequest } from '../../types/customRequest.types';
import { showAlert } from '../../components/feedback/AppAlert';

export function useCreateCustomRequest() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<CustomServiceRequest, Error, CreateCustomRequestDto>({
    mutationFn: async (dto: CreateCustomRequestDto) => {
      // Client-side guard rails before hitting network
      if (!dto.title || dto.title.trim().length < 5) {
        throw new Error('Please enter a descriptive title (at least 5 characters).');
      }
      if (dto.title.trim().length > 150) {
        throw new Error('Title cannot exceed 150 characters.');
      }
      if (!dto.description || dto.description.trim().length < 10) {
        throw new Error('Please describe the problem in detail (at least 10 characters).');
      }
      if (dto.description.trim().length > 3000) {
        throw new Error('Description cannot exceed 3,000 characters.');
      }
      if (!dto.address_id || !dto.address_text) {
        throw new Error('Please select a valid service address.');
      }
      if (dto.latitude === undefined || dto.longitude === undefined) {
        throw new Error('Invalid address coordinates.');
      }

      return await customRequestApi.createRequest(dto);
    },
    onSuccess: (request) => {
      queryClient.invalidateQueries({ queryKey: ['custom-requests'] });
      // Navigate to the newly created request tracking screen
      router.replace(`/custom-request/${request.id}` as any);
    },
    onError: (error) => {
      showAlert('Request Failed', error.message || 'Unable to submit request. Please try again.');
    },
  });
}
