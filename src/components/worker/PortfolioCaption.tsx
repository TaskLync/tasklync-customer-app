import { colors, palette } from '../../design';
import React from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily as fonts } from '@design/typography';

interface PortfolioCaptionProps {
  caption: string | null;
  imageIndex: number;
  style?: ViewStyle;
}

export const PortfolioCaption = ({
  caption,
  imageIndex,
  style,
}: PortfolioCaptionProps) => {
  const insets = useSafeAreaInsets();
  if (!caption) return null;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={[
          styles.gradient,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
      >
        <Text style={styles.captionText} numberOfLines={2}>
          {caption}
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  gradient: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40, // Enough padding for bottom safe area + counter space
  },
  captionText: {
    fontFamily: fonts.jakarta.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
});
