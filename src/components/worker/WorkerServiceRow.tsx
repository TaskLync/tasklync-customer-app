import React from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Clock } from 'lucide-react-native';
import { ServicePriceTag } from '../service/ServicePriceTag';
import { AddToCartButton } from '../cart/AddToCartButton';
import { Button } from '../ui/Button/Button';
import { colors } from '../../design/colors';
import { typography } from '../../design/typography';
import { springConfig } from '../../design/animations';
import { WorkerServiceOffering } from '../../types/worker.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const router = useRouter();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.985, springConfig.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, springConfig.default);
  };

  const handleRowPress = () => {
    router.push({
      pathname: `/service/${service.id}`,
      params: { workerId },
    } as any);
  };

  const handleQuotePress = () => {
    Alert.alert(
      'Get Quote',
      `Would you like to chat with ${workerName || 'the provider'} to get a custom quote for ${service.serviceName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Message', onPress: () => router.push('/chat' as any) },
      ]
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isQuote = service.priceType === 'quote';

  return (
    <AnimatedPressable
      onPress={handleRowPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle, style]}
    >
      <View style={styles.leftGroup}>
        <Text style={styles.nameText} numberOfLines={2}>
          {service.serviceName}
        </Text>

        <View style={styles.metaRow}>
          <Clock size={13} color={colors.textMuted} style={styles.clockIcon} />
          <Text style={styles.durationText}>
            45–60 min
          </Text>
          {service.notes ? (
            <>
              <Text style={styles.dotSeparator}> · </Text>
              <Text style={styles.notesText} numberOfLines={1}>
                {service.notes}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.rightGroup}>
        <ServicePriceTag
          amount={service.customPrice}
          priceType={service.priceType as any}
          size="sm"
          style={styles.priceTag}
        />

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
            serviceId={service.serviceId || service.id}
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
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.bgCard,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flex: 1,
    paddingRight: 12,
    justifyContent: 'center',
  },
  nameText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 19,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    marginRight: 4,
  },
  durationText: {
    fontFamily: typography.fontFamily.inter.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  dotSeparator: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  notesText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  rightGroup: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    flexShrink: 0,
  },
  priceTag: {
    // Top right aligned
  },
  quoteButton: {
    height: 32,
    paddingHorizontal: 12,
  },
});
