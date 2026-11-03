import { colors, palette } from '../../design';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

interface ProfileHeroGradientProps {
  coverUrl?: string | null;
  height?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const ProfileHeroGradient: React.FC<ProfileHeroGradientProps> = ({
  coverUrl = null,
  height = 280,
  children,
  style,
}) => {
  return (
    <View style={[styles.container, { height }, style]}>
      {coverUrl ? (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={['transparent', 'rgba(15, 23, 42, 0.85)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 0, y: 1.0 }}
          />
        </View>
      ) : (
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      )}
      
      {/* TODO Day 12: Replace gradient with MapView showing worker area */}
      <View style={StyleSheet.absoluteFill}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
});
