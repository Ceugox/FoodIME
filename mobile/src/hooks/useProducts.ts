import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/product.service';

export function useProducts(storeId: string) {
  return useQuery({
    queryKey: ['products', storeId],
    queryFn: () => productService.getByStore(storeId),
    enabled: !!storeId,
    staleTime: 30_000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string } & Parameters<typeof productService.update>[1]) =>
      productService.update(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stockQty }: { id: string; stockQty: number }) =>
      productService.updateStock(id, stockQty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useRemoveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
