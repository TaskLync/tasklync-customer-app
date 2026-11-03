import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { colors, palette, fontFamily, spacing } from '../../design';

export interface AppVersionRowProps {
  version?: string;
  buildNumber?: string;
  icon?: React.ReactNode;
}

export const AppVersionRow: React.FC<AppVersionRowProps> = ({
  version = 'v1.0.0',
  buildNumber = 'Build 37',
  icon,
}) => {
  const [tapCount, setTapCount] = useState<number>(0);

  const handleTap = () => {
    const nextCount = tapCount + 1;
    setTapCount(nextCount);

    if (nextCount >= 5) {
      setTapCount(0);
      Alert.alert(
        'Developer Diagnostics',
        `Tasklync Customer App\nVersion: ${version}\nBuild: ${buildNumber}\nPlatform: ${Platform.OS} (${Platform.Version})\nAPI Target: production (https://api.tasklync.pk/api/v1)\nEnvironment: Production Release`,
        [{ text: 'Dismiss', style: 'default' }]
      );
    }
  };

  const displayText = `${version} (${buildNumber})`;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleTap}
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel={`App version ${displayText}`}
    >
      <View style={styles.leftCol}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={styles.label} maxFontSizeMultiplier={1.3}>
          App Version
        </Text>
      </View>

      <Text style={styles.versionText} maxFontSizeMultiplier={1.3}>
        {displayText}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 20,
  },
  label: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  versionText: {
    fontFamily: fontFamily.inter.regular,
    fontSize: 13,
    color: palette.gray500,
    letterSpacing: 0.2,
  },
});
