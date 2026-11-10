import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { ServicePriceTag } from '../service/ServicePriceTag';
import { AddToCartButton } from '../cart/AddToCartButton';
import { WorkerServiceOffering } from '../../types/worker.types';
import { WorkerConflictModal } from '../cart/WorkerConflictModal';
import { useRowAddToCart } from '../../hooks/useRowAddToCart';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface CompanyServiceRowProps {
  service: WorkerServiceOffering;
  workerId: string;
  workerName: string;
  workerAvatar?: string | null | undefined;
  workerRating?: number | undefined;
  workerCategory?: string | undefined;
  workerVerified?: boolean | undefined;
  showDivider?: boolean;
}

/** Flat list row: name + price on the left, add-to-cart on the right. Quote-only services are not bookable here. */
export const CompanyServiceRow: React.FC<CompanyServiceRowProps> = React.memo(
  ({
    service,
    workerId,
    workerName,
    workerAvatar,
    workerRating,
    workerCategory,
    workerVerified,
    showDivider,
  }) => {
    const styles = useThemedStyles(createStyles);
    const { colors } = useAppTheme();
    const router = useRouter();
    const isQuote = service.priceType === 'quote';
    const rowCart = useRowAddToCart({
      serviceId: service.id,
      serviceName: service.serviceName,
      price: service.customPrice,
      workerId,
      workerName,
      workerAvatar,
      workerRating,
      workerCategory,
      isVerified: workerVerified,
    });

    return (
      <Pressable
        onPress={() =>
          isQuote
            ? router.push({
                pathname: '/custom-request/new' as any,
                params: { workerId, categoryId: workerCategory || '' },
              })
            : rowCart.addFromRow()
        }
        style={({ pressed }) => [
          styles.row,
          showDivider && styles.divider,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={isQuote ? `${service.serviceName}. Request a quote` : `${service.serviceName}. Add to cart`}
      >
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {service.serviceName}
          </Text>
          <View style={styles.priceWrap}>
            <ServicePriceTag
              amount={service.customPrice}
              priceType={service.priceType as any}
              size="sm"
            />
          </View>
        </View>

        {isQuote ? (
          <ChevronRight size={18} color={colors.textMuted} />
        ) : (
          <AddToCartButton
            serviceId={service.id}
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
  }
);

CompanyServiceRow.displayName = 'CompanyServiceRow';

const createStyles = ({ colors, companyTokens }: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    minHeight: 56,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: companyTokens.colors.borderSubtle,
  },
  pressed: {
    opacity: 0.7,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  priceWrap: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
});
