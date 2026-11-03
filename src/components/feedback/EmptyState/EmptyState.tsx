import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { RefreshCw } from 'lucide-react-native';
import { colors, palette } from '../../../design/colors';
import { fontFamily } from '../../../design/typography';
import { radius } from '../../../design/radius';

export type EmptyStateType = 'no-workers' | 'no-internet' | 'server-error' | 'no-data';

export interface EmptyStateProps {
  /** Type of error or empty state */
  type?: EmptyStateType | undefined;
  /** Primary headline */
  title?: string | undefined;
  /** Explanatory description */
  description?: string | undefined;
  /** Backward compatibility alias for description */
  subtitle?: string | undefined;
  /** Custom image override (local require, uri object, or ReactNode) */
  image?: ImageSourcePropType | React.ReactNode | any | undefined;
  /** Label for the call to action button */
  actionLabel?: string | undefined;
  /** Callback fired when action button is pressed */
  onAction?: (() => void) | undefined;
  /** Backward compatibility alias for onAction */
  onRetry?: (() => void) | undefined;
  /** Explicitly show or hide the action button */
  showAction?: boolean | undefined;
  /** Loading/retrying indicator inside the action button */
  loading?: boolean | undefined;
  /** Backward compatibility alias for loading */
  isRetrying?: boolean | undefined;
  /** Container style overrides */
  style?: StyleProp<ViewStyle> | undefined;
  /** Whether the action button spans full width */
  fullWidthAction?: boolean | undefined;
  /** Compact sizing for bottom sheets, cards, or embedded panels */
  compact?: boolean | undefined;
  /** Visual variant of the action button */
  actionVariant?: 'primary' | 'secondary' | undefined;
  /** Optional test identifier */
  testID?: string | undefined;
}

const EMPTY_STATE_IMAGES: Record<EmptyStateType, ImageSourcePropType> = {
  'no-workers': require('../../../../assets/errors-icons/not-available.png'),
  'no-internet': require('../../../../assets/errors-icons/no-internet.png'),
  'server-error': require('../../../../assets/errors-icons/internal-server.png'),
  'no-data': require('../../../../assets/errors-icons/Empty-screen.png'),
};

const DEFAULT_STRINGS: Record<EmptyStateType, { title: string; description: string; actionLabel?: string }> = {
  'no-workers': {
    title: 'No Workers Available',
    description: 'There are currently no service providers available in this area or category. Try expanding your search or checking back later.',
    actionLabel: 'Explore Services',
  },
  'no-internet': {
    title: 'No Internet Connection',
    description: 'Please check your connection or Wi-Fi settings and try again.',
    actionLabel: 'Try Again',
  },
  'server-error': {
    title: 'Something Went Wrong',
    description: 'We encountered an unexpected server issue. Please try again in a few moments.',
    actionLabel: 'Try Again',
  },
  'no-data': {
    title: 'No Data Available',
    description: 'There is nothing to display here right now.',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = React.memo(({
  type = 'no-data',
  title,
  description,
  subtitle,
  image,
  actionLabel,
  onAction,
  onRetry,
  showAction,
  loading = false,
  isRetrying = false,
  style,
  fullWidthAction = false,
  compact = false,
  actionVariant,
  testID,
}) => {
  const defaults = DEFAULT_STRINGS[type] || DEFAULT_STRINGS['no-data'];
  const displayTitle = title ?? defaults.title;
  const displayDescription = description ?? subtitle ?? defaults.description;

  const effectiveOnAction = onAction || onRetry;
  const effectiveActionLabel = actionLabel ?? (effectiveOnAction ? (defaults.actionLabel || 'Continue') : undefined);
  const isLoading = loading || isRetrying;

  const shouldRenderAction =
    showAction !== undefined
      ? showAction && Boolean(effectiveOnAction)
      : Boolean(effectiveOnAction && effectiveActionLabel);

  const isErrorType = type === 'server-error' || type === 'no-internet';
  const resolvedVariant = actionVariant ?? (isErrorType ? 'primary' : 'primary');

  const defaultImageSource = EMPTY_STATE_IMAGES[type] || EMPTY_STATE_IMAGES['no-data'];

  const renderIllustration = () => {
    if (React.isValidElement(image)) {
      return <View style={[styles.customIllustration, compact && styles.compactIllustration]}>{image}</View>;
    }

    const imageSource = image || defaultImageSource;

    return (
      <View style={[styles.imageWrapper, compact && styles.imageWrapperCompact]}>
        <Image
          source={imageSource as any}
          style={[styles.image, compact && styles.imageCompact]}
          contentFit="contain"
          transition={200}
          accessibilityRole="image"
          accessibilityLabel={displayTitle}
        />
      </View>
    );
  };

  return (
    <View
      testID={testID}
      style={[styles.container, compact && styles.containerCompact, style]}
      accessible={true}
      accessibilityRole={isErrorType ? 'alert' : 'summary'}
      accessibilityLabel={`${displayTitle}. ${displayDescription}`}
    >
      {renderIllustration()}

      <Text
        style={[styles.title, compact && styles.titleCompact]}
        maxFontSizeMultiplier={1.3}
      >
        {displayTitle}
      </Text>

      {Boolean(displayDescription) && (
        <Text
          style={[styles.description, compact && styles.descriptionCompact]}
          maxFontSizeMultiplier={1.3}
        >
          {displayDescription}
        </Text>
      )}

      {shouldRenderAction && effectiveOnAction && effectiveActionLabel && (
        <View
          style={[
            styles.actionWrapper,
            fullWidthAction ? styles.actionWrapperFull : styles.actionWrapperAuto,
            compact && styles.actionWrapperCompact,
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.buttonBase,
              resolvedVariant === 'primary' ? styles.primaryButton : styles.secondaryButton,
              fullWidthAction && styles.buttonFull,
              pressed && (resolvedVariant === 'primary' ? styles.primaryButtonPressed : styles.secondaryButtonPressed),
              isLoading && styles.buttonDisabled,
            ]}
            onPress={effectiveOnAction}
            disabled={isLoading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={effectiveActionLabel}
          >
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={resolvedVariant === 'primary' ? palette.white : colors.primaryDark}
              />
            ) : (
              <>
                {isErrorType && (
                  <RefreshCw
                    size={15}
                    color={resolvedVariant === 'primary' ? palette.white : colors.primaryDark}
                    strokeWidth={2.4}
                  />
                )}
                <Text
                  style={[
                    styles.buttonText,
                    resolvedVariant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText,
                  ]}
                  numberOfLines={1}
                >
                  {effectiveActionLabel}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
});

EmptyState.displayName = 'EmptyState';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  containerCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  imageWrapper: {
    width: 130,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imageWrapperCompact: {
    width: 90,
    height: 76,
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageCompact: {
    width: '100%',
    height: '100%',
  },
  customIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  compactIllustration: {
    marginBottom: 8,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  titleCompact: {
    fontSize: 14.5,
    lineHeight: 19,
    marginBottom: 4,
  },
  description: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 16,
  },
  descriptionCompact: {
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 220,
    marginBottom: 10,
  },
  actionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionWrapperAuto: {
    alignSelf: 'center',
  },
  actionWrapperFull: {
    width: '100%',
  },
  actionWrapperCompact: {
    marginTop: 2,
  },
  buttonBase: {
    height: 40,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 130,
  },
  buttonFull: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.primary, // #22C55E
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark, // #16A34A
    transform: [{ scale: 0.98 }],
  },
  secondaryButton: {
    backgroundColor: colors.primaryTint, // #F0FDF4
    borderWidth: 1.5,
    borderColor: colors.primaryBorder, // #BBF7D0
  },
  secondaryButtonPressed: {
    backgroundColor: colors.primaryBorderSubtle, // #DCFCE7
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13.5,
    lineHeight: 18,
  },
  primaryButtonText: {
    color: palette.white,
  },
  secondaryButtonText: {
    color: colors.primaryDark,
  },
});
