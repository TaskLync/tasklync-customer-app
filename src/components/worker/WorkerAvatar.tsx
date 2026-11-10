import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';
import { User, Building2 } from 'lucide-react-native';
import { fontFamily } from '../../design/typography';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

const BLURHASH = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

/**
 * Validates and sanitizes a remote avatar URL.
 * Ensures genuine image URLs (including Cloudinary, S3, custom CDN) are preserved
 * while filtering out unwanted demo / mock / random image services.
 */
export function sanitizeAvatarUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  let trimmed = url.trim();
  if (trimmed.length < 8) return null;

  // Fix protocol-relative URLs (e.g. "//res.cloudinary.com/...")
  if (trimmed.startsWith('//')) {
    trimmed = `https:${trimmed}`;
  }

  const lower = trimmed.toLowerCase();
  // Filter out unwanted dummy / demo / placeholder services
  if (
    lower.includes('pravatar.cc') ||
    lower.includes('via.placeholder.com') ||
    lower.includes('placeholder.com') ||
    lower.includes('example.com')
  ) {
    return null;
  }

  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('data:') ||
    lower.startsWith('file://')
  ) {
    return trimmed;
  }

  return null;
}

/**
 * Extracts 1-2 uppercase initials from a person or company name.
 */
export function getAvatarInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export interface WorkerAvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  borderRadius?: number;
  isCompany?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  showOnlineBadge?: boolean;
  isOnline?: boolean;
  badgeSize?: number;
  borderWidth?: number;
  borderColor?: string;
}

export const WorkerAvatar: React.FC<WorkerAvatarProps> = React.memo(({
  uri,
  name,
  size = 48,
  borderRadius,
  isCompany = false,
  style,
  imageStyle,
  contentFit = 'cover',
  showOnlineBadge = false,
  isOnline = false,
  badgeSize = 10,
  borderWidth = 1,
  borderColor: borderColorProp,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const borderColor = borderColorProp ?? palette.gray200;
  const [hasError, setHasError] = useState(false);

  // Sanitize and validate image URI
  const sanitizedUri = useMemo(() => sanitizeAvatarUrl(uri), [uri]);

  // Reset error state whenever sanitizedUri changes
  useEffect(() => {
    setHasError(false);
  }, [sanitizedUri]);

  const initials = useMemo(() => getAvatarInitials(name), [name]);

  const radius = borderRadius !== undefined ? borderRadius : Math.round(size / 2);
  const iconSize = Math.max(14, Math.round(size * 0.46));
  const fontSize = Math.max(10, Math.round(size * 0.36));

  const shouldRenderImage = !!sanitizedUri && !hasError;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
        style,
      ]}
    >
      {shouldRenderImage ? (
        <Image
          source={{ uri: sanitizedUri! }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: radius,
              borderWidth,
              borderColor,
            },
            imageStyle,
          ]}
          contentFit={contentFit}
          placeholder={BLURHASH}
          transition={150}
          cachePolicy="memory-disk"
          onError={() => setHasError(true)}
          accessibilityLabel={name ? `${name} profile photo` : 'Worker profile photo'}
        />
      ) : (
        <View
          style={[
            styles.fallbackContainer,
            {
              width: size,
              height: size,
              borderRadius: radius,
              borderWidth,
              borderColor,
              backgroundColor: isCompany ? palette.blue50 : palette.gray100,
            },
          ]}
        >
          {initials ? (
            <Text
              style={[
                styles.initialsText,
                {
                  fontSize,
                  color: isCompany ? palette.blue700 : palette.gray700,
                },
              ]}
              numberOfLines={1}
            >
              {initials}
            </Text>
          ) : isCompany ? (
            <Building2 size={iconSize} color={palette.blue600} strokeWidth={2} />
          ) : (
            <User size={iconSize} color={palette.gray500} strokeWidth={2} />
          )}
        </View>
      )}

      {/* Optional Online Badge Indicator */}
      {showOnlineBadge && (
        <View
          style={[
            styles.onlineBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: isOnline ? colors.online : colors.textMuted,
              borderWidth: 1.5,
              borderColor: palette.white,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
});

const createStyles = ({ palette }: AppTheme) => StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: palette.gray100,
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: fontFamily.jakarta.bold,
    textAlign: 'center',
    includeFontPadding: false,
  },
  onlineBadge: {
    position: 'absolute',
  },
});
