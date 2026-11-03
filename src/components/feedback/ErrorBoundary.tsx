import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { ErrorState } from './ErrorState';
import { fontFamily } from '../../design/typography';
import { palette } from '../../design/colors';
import { radius } from '../../design/radius';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: any[];
  title?: string;
  subtitle?: string;
  retryText?: string;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showStack: boolean;
}

/**
 * Universal Production-Grade React Error Boundary
 *
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a graceful fallback UI instead of crashing the app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
    error: null,
    showStack: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
    }
    this.props.onError?.(error, errorInfo);
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (!this.state.hasError) return;

    // Auto-recover if resetKeys change (e.g. route, query params, id)
    if (this.props.resetKeys && prevProps.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasChanged) {
        this.reset();
      }
    }
  }

  public reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, showStack: false });
  };

  private toggleStack = () => {
    this.setState((prev) => ({ showStack: !prev.showStack }));
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      const { fallback, title, subtitle, retryText, showDetails } = this.props;

      // Custom render function or ReactNode fallback
      if (typeof fallback === 'function') {
        return fallback({ error: this.state.error, reset: this.reset });
      }
      if (fallback) {
        return fallback;
      }

      const shouldShowDebug = showDetails ?? __DEV__;

      return (
        <View style={styles.container}>
          <ErrorState
            type="error"
            title={title || 'Something went wrong'}
            subtitle={
              subtitle ||
              (shouldShowDebug
                ? this.state.error.message || 'An unexpected error occurred.'
                : 'An unexpected error occurred. Please try again.')
            }
            onRetry={this.reset}
            retryButtonText={retryText || 'Try Again'}
          />

          {shouldShowDebug && (
            <View style={styles.debugContainer}>
              <Pressable
                onPress={this.toggleStack}
                style={styles.debugToggle}
                accessibilityRole="button"
              >
                <Text style={styles.debugToggleText}>
                  {this.state.showStack ? 'Hide Error Details ▲' : 'Show Error Details ▼'}
                </Text>
              </Pressable>

              {this.state.showStack && (
                <ScrollView style={styles.debugScroll} nestedScrollEnabled>
                  <Text style={styles.debugErrorName}>
                    {this.state.error.name}: {this.state.error.message}
                  </Text>
                  {this.state.error.stack && (
                    <Text style={styles.debugStackTrace}>{this.state.error.stack}</Text>
                  )}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.zenWhite,
  },
  debugContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  debugToggle: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: palette.gray100,
    marginBottom: 8,
  },
  debugToggleText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    color: palette.gray700,
  },
  debugScroll: {
    maxHeight: 180,
    backgroundColor: palette.gray900,
    borderRadius: radius.md,
    padding: 12,
  },
  debugErrorName: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 12,
    color: '#F87171',
    marginBottom: 6,
  },
  debugStackTrace: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: palette.gray300,
    lineHeight: 14,
  },
});
