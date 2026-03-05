import React from 'react'
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { ellipsify } from '@/utils/ellipsify'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { colors, spacing, typography } from '@/constants/theme'
import { useFadeIn } from '@/utils/animations'

export default function Home() {
  const { account } = useMobileWallet()
  const headerOpacity = useFadeIn(400)

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <Text style={styles.headerTitle}>OVERVIEW</Text>
        </Animated.View>

        {/* Wallet */}
        {account && (
          <View style={styles.walletSection}>
            <AnimatedCard style={styles.walletCard} delay={200}>
              <Text style={styles.walletLabel}>CONNECTED</Text>
              <Text style={styles.walletAddress}>{ellipsify(account.address.toString(), 12)}</Text>
            </AnimatedCard>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <AnimatedCard style={styles.statCard} delay={300} slideDirection="left">
              <Text style={styles.statLabel}>WINS</Text>
              <Text style={styles.statValue}>0</Text>
            </AnimatedCard>
            
            <AnimatedCard style={styles.statCard} delay={350} slideDirection="right">
              <Text style={styles.statLabel}>POINTS</Text>
              <Text style={styles.statValue}>0</Text>
            </AnimatedCard>
          </View>

          <View style={styles.statsRow}>
            <AnimatedCard style={styles.statCard} delay={400} slideDirection="left">
              <Text style={styles.statLabel}>WORKOUTS</Text>
              <Text style={styles.statValue}>0</Text>
            </AnimatedCard>
            
            <AnimatedCard style={styles.statCard} delay={450} slideDirection="right">
              <Text style={styles.statLabel}>LEAGUES</Text>
              <Text style={styles.statValue}>0</Text>
            </AnimatedCard>
          </View>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    letterSpacing: 2,
    fontWeight: '300',
  },
  walletSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  walletCard: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  walletLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    letterSpacing: 1.5,
  },
  walletAddress: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  statsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  statLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    letterSpacing: 1.5,
  },
  statValue: {
    ...typography.h1,
    color: colors.text.primary,
    fontWeight: '300',
  },
})
