import { Text, View, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState } from 'react'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { AccountFeatureConnect } from '@/features/account/account-feature-connect'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { colors, spacing, typography } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

export default function WalletConnectScreen() {
  const { account, disconnect } = useMobileWallet()
  const { signInWithWallet, isAuthenticated } = useAuth()
  const router = useRouter()
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/home')
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (account) {
      setError(null)
    }
  }, [account])

  const handleAuthenticate = async () => {
    try {
      setAuthenticating(true)
      setError(null)
      await signInWithWallet()
    } catch (err: any) {
      if (err.message?.includes('declined')) {
        setError('You declined the sign-in request. Please try again.')
      } else {
        setError('Authentication failed. Please try again.')
      }
      console.error(err)
    } finally {
      setAuthenticating(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setError(null)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={80} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Welcome to Stride</Text>
          <Text style={styles.subtitle}>
            Competitive on-chain fitness leagues where real-world activity builds reputation and unlocks rewards
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="flash" size={24} color={colors.secondary[500]} />
            <Text style={styles.featureText}>Track workouts & earn points</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="people" size={24} color={colors.accent[500]} />
            <Text style={styles.featureText}>Join competitive leagues</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="trophy" size={24} color={colors.gold[500]} />
            <Text style={styles.featureText}>Dominate leaderboards</Text>
          </View>
        </View>

        {/* Connection Section */}
        {!account ? (
          <View style={styles.connectSection}>
            <AccountFeatureConnect onError={setError} />
            {error && (
              <Card variant="outlined" style={styles.errorCard}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </Card>
            )}
          </View>
        ) : (
          <View style={styles.authSection}>
            <Card variant="glow" style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                <Text style={styles.walletStatus}>Wallet Connected</Text>
              </View>
              <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                {account.address.toString()}
              </Text>
            </Card>

            <Button
              title={authenticating ? 'Signing In...' : 'Sign In with Wallet'}
              onPress={handleAuthenticate}
              disabled={authenticating}
              loading={authenticating}
              variant="primary"
              size="lg"
              style={styles.button}
            />

            <Button
              title="Switch Wallet"
              onPress={handleDisconnect}
              variant="ghost"
              size="md"
              style={styles.button}
            />

            {error && (
              <Card variant="outlined" style={styles.errorCard}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </Card>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.bodyLarge,
    color: colors.text.primary,
  },
  connectSection: {
    gap: spacing.md,
  },
  authSection: {
    gap: spacing.md,
  },
  walletCard: {
    alignItems: 'center',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  walletStatus: {
    ...typography.h4,
    color: colors.text.primary,
  },
  walletAddress: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  button: {
    width: '100%',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
})
