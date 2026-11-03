import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MapPinOff, RefreshCw, Edit3 } from 'lucide-react-native';
import { colors, palette, fontFamily, fontSize, radius } from '../../design';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onManualAddressPress?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[MapErrorBoundary] Caught map rendering error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.fallbackContainer}>
          <View style={styles.iconCircle}>
            <MapPinOff size={32} color={palette.gray500} strokeWidth={2} />
          </View>

          <Text style={styles.title}>Map Preview Unavailable</Text>
          <Text style={styles.description}>
            Google Play Services or location preview could not be loaded on this device. You can still set your address manually.
          </Text>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={this.handleRetry}
              style={styles.retryButton}
              accessibilityRole="button"
              accessibilityLabel="Retry loading map"
            >
              <RefreshCw size={16} color={colors.textPrimary} />
              <Text style={styles.retryText}>Retry Map</Text>
            </Pressable>

            {this.props.onManualAddressPress && (
              <Pressable
                onPress={this.props.onManualAddressPress}
                style={styles.manualButton}
                accessibilityRole="button"
                accessibilityLabel="Enter address manually"
              >
                <Edit3 size={16} color={palette.white} />
                <Text style={styles.manualText}>Enter Manually</Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray300,
  },
  retryText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryDark,
  },
  manualText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: palette.white,
  },
});
