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
import { Tutorial } from '@/components/Tutorial'
import AsyncStorage from '@react-native-async-storage/async-storage'

const TUTORIAL_COMPLETED_KEY = 'tutorial_completed'

export default function WalletConnectScreen() {
  const { account, disconnect } = useMobileWallet()
  const { signInWithWallet, isAuthenticated } = useAuth()
  const router = useRouter()
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [checkingTutorial, setCheckingTutorial] = useState(true)

  useEffect(() => {
    checkTutorialStatus()
  }, [])

  const checkTutorialStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY)
      if (!completed) {
        setShowTutorial(true)
      }
    } catch (error) {
      console.error('Failed to check tutorial status:', error)
    } finally {
      setCheckingTutorial(false)
    }
  }

  const handleTutorialComplete = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true')
      setShowTutorial(false)
    } catch (error) {
      console.error('Failed to save tutorial status:', error)
      setShowTutorial(false)
    }
  }

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

  if (checkingTutorial) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    )
  }

  if (showTutorial) {
    return <Tutorial onComplete={handleTutorialComplete} />
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.title}>STRIDE</Text>
          <Text style={styles.subtitle}>
            On-chain fitness competition
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Track performance</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Compete globally</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Earn rewards</Text>
          </View>
        </View>

        {/* Connection Section */}
        {!account ? (
          <View style={styles.connectSection}>
            <AccountFeatureConnect onError={setError} />
            {error && (
              <Card variant="outlined" style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </Card>
            )}
          </View>
        ) : (
          <View style={styles.authSection}>
            <Card variant="elevated" style={styles.walletCard}>
              <Text style={styles.walletLabel}>CONNECTED</Text>
              <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                {account.address.toString()}
              </Text>
            </Card>

            <Button
              title={authenticating ? 'AUTHENTICATING' : 'AUTHENTICATE'}
              onPress={handleAuthenticate}
              disabled={authenticating}
              loading={authenticating}
              variant="primary"
              size="lg"
              style={styles.button}
            />

            <Button
              title="DISCONNECT"
              onPress={handleDisconnect}
              variant="ghost"
              size="md"
              style={styles.button}
            />

            {error && (
              <Card variant="outlined" style={styles.errorCard}>
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
  title: {
    fontSize: 56,
    fontWeight: '300',
    letterSpacing: 8,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  features: {
    gap: spacing.lg,
    marginBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[500],
  },
  featureText: {
    ...typography.body,
    color: colors.text.secondary,
    letterSpacing: 0.5,
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
  walletLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  walletAddress: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  button: {
    width: '100%',
  },
  errorCard: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
