import { Text, View, StyleSheet, ActivityIndicator, Animated, Dimensions, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState, useRef } from 'react'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { AccountFeatureConnect } from '@/features/account/account-feature-connect'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { colors, spacing, typography } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'
import { Tutorial } from '@/components/Tutorial'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFadeIn, useScale, usePulse } from '@/utils/animations'
import * as Haptics from 'expo-haptics'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const TUTORIAL_COMPLETED_KEY = 'tutorial_completed'
const SLIDE_WIDTH = SCREEN_WIDTH - spacing.lg * 2

const FEATURES = [
  {
    icon: 'fitness-outline',
    title: 'Track Every Move',
    description: 'GPS-powered workout tracking with real-time metrics',
    color: colors.secondary[500],
  },
  {
    icon: 'people-outline',
    title: 'Compete Globally',
    description: 'Race against athletes worldwide in real-time',
    color: colors.accent[500],
  },
  {
    icon: 'trophy-outline',
    title: 'Earn Rewards',
    description: 'On-chain achievements and NFT collectibles',
    color: colors.gold[500],
  },
]

export default function WalletConnectScreen() {
  const { account, disconnect } = useMobileWallet()
  const { signInWithWallet, isAuthenticated } = useAuth()
  const router = useRouter()
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [checkingTutorial, setCheckingTutorial] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const scrollViewRef = useRef<ScrollView>(null)

  // Typing animation for title
  const [displayedText, setDisplayedText] = useState('')
  const fullText = 'STRIDE'

  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayedText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(interval)
      }
    }, 150)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % FEATURES.length
        scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH * next, animated: true })
        return next
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      setAuthenticating(true)
      setError(null)
      await signInWithWallet()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      if (err.message?.includes('declined')) {
        setError('Authentication declined')
      } else {
        setError('Authentication failed')
      }
      console.error(err)
    } finally {
      setAuthenticating(false)
    }
  }

  const handleDisconnect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    disconnect()
    setError(null)
  }

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / SCREEN_WIDTH)
    setCurrentSlide(index)
  }

  // Animations
  const titleOpacity = useFadeIn(800)
  const titleScale = useScale(800)
  const subtitleOpacity = useFadeIn(1000, 400)
  const connectedPulse = usePulse(!!account && !authenticating)

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
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Animated.Text style={[styles.title, { opacity: titleOpacity, transform: titleScale.transform }]}>
            {displayedText}
            <Animated.Text style={{ opacity: titleOpacity }}>_</Animated.Text>
          </Animated.Text>
          <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
            On-Chain Fitness Competition
          </Animated.Text>
        </View>

        {/* Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.carousel}
          >
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.slide}>
                <AnimatedCard variant="elevated" style={styles.featureCard} delay={600 + index * 100}>
                  <View style={[styles.iconCircle, { backgroundColor: `${feature.color}20` }]}>
                    <Ionicons name={feature.icon as any} size={40} color={feature.color} />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </AnimatedCard>
              </View>
            ))}
          </ScrollView>

          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {FEATURES.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentSlide && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* Connection Section */}
        <View style={styles.bottomSection}>
          {!account ? (
            <View style={styles.connectSection}>
              <AccountFeatureConnect onError={setError} />
              {error && (
                <AnimatedCard variant="outlined" style={styles.errorCard} delay={100}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </AnimatedCard>
              )}
            </View>
          ) : (
            <View style={styles.authSection}>
              <Animated.View style={connectedPulse}>
                <AnimatedCard variant="glow" style={styles.walletCard} delay={100}>
                  <Ionicons name="checkmark-circle" size={40} color={colors.success} />
                  <Text style={styles.walletLabel}>WALLET CONNECTED</Text>
                  <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                    {account.address.toString()}
                  </Text>
                </AnimatedCard>
              </Animated.View>

              <AnimatedButton
                title={authenticating ? 'AUTHENTICATING...' : 'ENTER APP'}
                onPress={handleAuthenticate}
                disabled={authenticating}
                variant="primary"
                size="lg"
              />

              <AnimatedButton
                title="DISCONNECT"
                onPress={handleDisconnect}
                variant="ghost"
                size="md"
              />

              {error && (
                <AnimatedCard variant="outlined" style={styles.errorCard} delay={100}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </AnimatedCard>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 56,
    fontWeight: '200',
    letterSpacing: 10,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: 'monospace',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  carouselContainer: {
    marginVertical: spacing.xl,
  },
  carousel: {
    flexGrow: 0,
  },
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing.lg,
  },
  featureCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    minHeight: 280,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featureTitle: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: 1,
    fontWeight: '400',
  },
  featureDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.default,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary[500],
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  connectSection: {
    gap: spacing.md,
  },
  authSection: {
    gap: spacing.md,
  },
  walletCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  walletLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
  walletAddress: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderColor: colors.error,
    padding: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
