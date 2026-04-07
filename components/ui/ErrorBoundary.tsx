import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ErrorBoundary is a class component and cannot use hooks.
// These colours are brand-constant across both light and dark themes.
const C = {
  bg: '#0F1117',
  error: '#EF4444',
  errorLight: '#450A0A',
  primary: '#3B82F6',
  white: '#F8FAFC',
  textPrimary: '#F8FAFC',
  textTertiary: '#4B5270',
};

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="warning" size={36} color={C.error} />
        </View>

        <Text style={styles.title}>SOMETHING WENT WRONG</Text>
        <Text style={styles.subtitle}>
          An unexpected error occurred. You can try again or restart the app.
        </Text>

        {this.state.error?.message ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorMessage} numberOfLines={4}>
              {this.state.error.message}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.retryBtn}
          onPress={this.handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Ionicons name="refresh" size={16} color={C.white} style={{ marginRight: 8 }} />
          <Text style={styles.retryText}>TRY AGAIN</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: C.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: C.errorLight,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: C.error,
    padding: 12,
    width: '100%',
    marginBottom: 28,
  },
  errorMessage: {
    fontSize: 12,
    color: C.error,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  retryText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
