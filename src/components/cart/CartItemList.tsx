import { FC, useCallback } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { CartItem as CartItemType } from '../../store/cart.store';
import { CartItem } from './CartItem';
import { SwipeToDeleteRow } from './SwipeToDeleteRow';
import { CartSkeletonItem } from './CartSkeletonItem';
import { SkeletonGroup } from '../ui/Skeleton/Skeleton';

interface CartItemListProps {
  items: CartItemType[];
  isLoading?: boolean;
  onRemoveItem: (serviceId: string) => void;
}

/** The selected services, one row each. Swipe left or tap Remove to take one out. */
export const CartItemList: FC<CartItemListProps> = ({ items, isLoading = false, onRemoveItem }) => {
  const renderItem = useCallback(
    ({ item }: { item: CartItemType }) => (
      <SwipeToDeleteRow onDelete={() => onRemoveItem(item.serviceId)}>
        <CartItem item={item} onRemove={onRemoveItem} />
      </SwipeToDeleteRow>
    ),
    [onRemoveItem]
  );

  if (isLoading) {
    return (
      <SkeletonGroup style={styles.listContainer} accessibilityLabel="Loading cart">
        <CartSkeletonItem />
        <CartSkeletonItem />
      </SkeletonGroup>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.serviceId}
      renderItem={renderItem}
      scrollEnabled={false} // Container view handles outer scrolling
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 4,
  },
});
