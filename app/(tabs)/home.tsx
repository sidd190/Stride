import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { ellipsify } from '@/utils/ellipsify'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { colors, spacing, typography, surfaces } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

export default function Home() {
  const { account } = useMobileWallet()

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Ready to Compete?</Text>
          <Text style={styles.heroSubtitle}>Join leagues, track workouts, dominate leaderboards</Text>
        </View>

        {/* Wallet Status */}
        {account && (
          <Card variant="glow" style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <Ionicons name="wallet" size={24} color={colors.primary[500]} />
              <Badge label="CONNECTED" variant="success" size="sm" />
            </View>
            <Text style={styles.walletAddress}>{ellipsify(account.address.toString(), 12)}</Text>
          </Card>
        )}

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="trophy" size={32} color={colors.gold[500]} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Races Won</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <Ionicons name="flame" size={32} color={colors.secondary[500]} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </Card>
        </View>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="fitness" size={32} color={colors.accent[500]} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <Ionicons name="people" size={32} color={colors.primary[500]} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Leagues</Text>
          </Card>
        </View>

        {/* Action Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <Card variant="elevated" style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="play-circle" size={40} color={colors.secondary[500]} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Start Workout</Text>
              <Text style={styles.actionDescription}>Track your run and earn points</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
          </Card>

          <Card variant="elevated" style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="flag" size={40} color={colors.accent[500]} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Join a Race</Text>
              <Text style={styles.actionDescription}>Compete in real-time challenges</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
          </Card>

          <Card variant="elevated" style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name="trophy" size={40} color={colors.gold[500]} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Leaderboard</Text>
              <Text style={styles.actionDescription}>See where you rank</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
          </Card>
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
    paddingHorizontal: spacing.md,
  },
  hero: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  walletCard: {
    marginBottom: spacing.lg,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  walletAddress: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statValue: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
  },
  actionIcon: {
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
})
