import React from 'react';
import { View, ViewStyle, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/useAppTheme';

export interface StickyFooterProps {
  children: React.ReactNode;
  noBorder?: boolean;
  bg?: string;
  style?: ViewStyle;
}

export const StickyFooter = ({
  children,
  noBorder = false,
  bg: bgProp,
  style
}: StickyFooterProps) => {
  const { colors } = useAppTheme();
  const bg = bgProp ?? colors.bgCard;
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      style={[
        styles.container,
        {
          backgroundColor: bg,
          paddingBottom: insets.bottom + 24,
          marginBottom: -insets.bottom, // Counteracts Screen's SafeAreaView padding
          borderTopWidth: noBorder ? 0 : 1,
          borderTopColor: 'rgba(0,0,0,0.02)',
        },
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Subtle top shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    // Elevation for Android
    elevation: 8,
  }
});
