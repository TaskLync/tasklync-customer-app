import React from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ServicePriceTag } from '../service/ServicePriceTag';
import { AddToCartButton } from '../cart/AddToCartButton';
import { Button } from '../ui/Button/Button';
import { useCartStore } from '../../store/cart.store';
import { typography } from '../../design/typography';
import { WorkerServiceOffering } from '../../types/worker.types';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import { showAlert } from '../feedback/AppAlert';
import { WorkerConflictModal } from '../cart/WorkerConflictModal';
import { useRowAddToCart } from '../../hooks/useRowAddToCart';

/** Horizontal inset of the row surface; the parent cancels it so text aligns with section titles. */
export const SERVICE_ROW_INSET = 12;

interface WorkerServiceRowProps {
  service: WorkerServiceOffering;
  workerId: string;
  workerName?: string | undefined;
  workerAvatar?: string | null | undefined;
  workerRating?: number | undefined;
  workerCategory?: string | undefined;
  workerVerified?: boolean | undefined;
  style?: ViewStyle | undefined;
}

const formatDuration = (mins?: number | null): string | null => {
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} ${h === 1 ? 'hr' : 'hrs'}`;
};

export const WorkerServiceRow: React.FC<WorkerServiceRowProps> = ({
  service,
  workerId,
  workerName,
  workerAvatar,
  workerRating,
  workerCategory,
  workerVerified,
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const cartServiceId = service.serviceId || service.id;
  // Same key AddToCartButton uses, so the row tint always matches the stepper state.
  const isAdded = useCartStore((s) => s.items.some((i) => i.serviceId === cartServiceId));

  const rowCart = useRowAddToCart({
    serviceId: cartServiceId,
    serviceName: service.serviceName,
    price: service.customPrice,
    workerId,
    workerName,
    workerAvatar,
    workerRating,
    workerCategory,
    isVerified: workerVerified,
  });

  const handleQuotePress = () => {
    showAlert(
      'Get Quote',
      `Would you like to chat with ${workerName || 'the provider'} to get a custom quote for ${service.serviceName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Message', onPress: () => router.push('/chat' as any) },
      ]
    );
  };

  const isQuote = service.priceType === 'quote';
  const meta = [formatDuration(service.durationMins), service.notes?.trim() || null]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Pressable
      onPress={isQuote ? handleQuotePress : rowCart.addFromRow}
      style={({ pressed }) => [
        styles.container,
        isAdded && styles.containerAdded,
        pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${service.serviceName}${isAdded ? ', added' : ''}`}
      accessibilityHint={isQuote ? 'Ask for a custom quote' : isAdded ? undefined : 'Adds this service to your cart'}
    >
      <View style={styles.leftGroup}>
        <Text style={styles.nameText} numberOfLines={2}>
          {service.serviceName}
        </Text>

        {meta ? (
          <Text style={styles.metaText} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}

        {isQuote ? (
          <Text style={styles.quoteText}>Price on quote</Text>
        ) : (
          <ServicePriceTag
            amount={service.customPrice}
            priceType={service.priceType}
            size="md"
            style={styles.priceTag}
          />
        )}
      </View>

      {isQuote ? (
        <Button
          variant="secondary"
          size="sm"
          label="Quote"
          onPress={handleQuotePress}
          style={styles.quoteButton}
        />
      ) : (
        <AddToCartButton
          serviceId={cartServiceId}
          serviceName={service.serviceName}
          price={service.customPrice}
          workerId={workerId}
          workerName={workerName}
          workerAvatar={workerAvatar}
          workerRating={workerRating}
          workerCategory={workerCategory}
          isVerified={workerVerified}
          size="sm"
        />
      )}

      <WorkerConflictModal
        visible={rowCart.conflict.visible}
        onCancel={rowCart.conflict.onCancel}
        onReplace={rowCart.conflict.onReplace}
        incomingWorkerName={workerName}
      />
    </Pressable>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SERVICE_ROW_INSET,
    borderRadius: 14,
  },
  containerAdded: {
    backgroundColor: colors.primaryTint,
  },
  pressed: {
    backgroundColor: colors.bgHover,
  },
  leftGroup: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  nameText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  metaText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceTag: {
    marginTop: 6,
  },
  quoteText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },
  quoteButton: {
    height: 32,
    paddingHorizontal: 14,
  },
});
