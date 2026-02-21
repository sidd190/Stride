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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>OVERVIEW</Text>
        </View>

        {/* Wallet */}
        {account && (
          <View style={styles.walletSection}>
            <Card style={styles.walletCard}>
              <Text style={styles.walletLabel}>CONNECTED</Text>
              <Text style={styles.walletAddress}>{ellipsify(account.address.toString(), 12)}</Text>
            </Card>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>WINS</Text>
              <Text style={styles.statValue}>0</Text>
            </Card>
            
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>POINTS</Text>
              <Text style={styles.statValue}>0</Text>
            </Card>
          </View>

          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>WORKOUTS</Text>
              <Text style={styles.statValue}>0</Text>
            </Card>
            
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>LEAGUES</Text>
              <Text style={styles.statValue}>0</Text>
            </Card>
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
