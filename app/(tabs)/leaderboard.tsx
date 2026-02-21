import React, { useState, useEffect } from 'react'
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { getLeagues, getUserLeagues, getLeaderboard, joinLeague, leaveLeague } from '@/services/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { colors, spacing, typography, surfaces, borderRadius, shadows } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

interface League {
  id: number
  name: string
  description: string
  city: string | null
  season: string
  member_count: number
}

interface LeaderboardEntry {
  username: string
  wallet_address: string
  total_points: number
  season_points: number
  workout_count: number
  races_won: number
}

export default function Leaderboard() {
  const { account } = useMobileWallet()
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userLeagues, setUserLeagues] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadLeagues()
  }, [])

  useEffect(() => {
    if (account) {
      loadUserLeagues()
    }
  }, [account])

  useEffect(() => {
    if (selectedLeague) {
      loadLeaderboard()
    }
  }, [selectedLeague])

  const loadLeagues = async () => {
    try {
      const data = await getLeagues()
      setLeagues(data.leagues)
      if (data.leagues.length > 0 && !selectedLeague) {
        setSelectedLeague(data.leagues[0])
      }
    } catch (error) {
      console.error('Failed to load leagues:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserLeagues = async () => {
    if (!account) return
    try {
      const data = await getUserLeagues(account.address.toString())
      setUserLeagues(data.leagues.map((l: League) => l.id))
    } catch (error) {
      console.error('Failed to load user leagues:', error)
    }
  }

  const loadLeaderboard = async () => {
    if (!selectedLeague) return
    try {
      const data = await getLeaderboard(selectedLeague.id)
      setLeaderboard(data.leaderboard)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
      setLeaderboard([])
    }
  }

  const handleJoinLeague = async (leagueId: number) => {
    if (!account) return
    try {
      await joinLeague(account.address.toString(), leagueId)
      setUserLeagues([...userLeagues, leagueId])
      loadLeaderboard()
    } catch (error) {
      console.error('Failed to join league:', error)
    }
  }

  const handleLeaveLeague = async (leagueId: number) => {
    if (!account) return
    try {
      await leaveLeague(account.address.toString(), leagueId)
      setUserLeagues(userLeagues.filter((id) => id !== leagueId))
      loadLeaderboard()
    } catch (error) {
      console.error('Failed to leave league:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadLeagues(), loadUserLeagues(), loadLeaderboard()])
    setRefreshing(false)
  }

  const getUserRank = () => {
    if (!account) return null
    const index = leaderboard.findIndex((entry) => entry.wallet_address === account.address.toString())
    return index >= 0 ? index + 1 : null
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 50 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>RANKINGS</Text>
        </View>

        {/* League Selector */}
        <View style={styles.leagueSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leagueScroll}>
            {leagues.map((league) => {
              const isSelected = selectedLeague?.id === league.id
              const isMember = userLeagues.includes(league.id)

              return (
                <TouchableOpacity key={league.id} onPress={() => setSelectedLeague(league)}>
                  <Card
                    variant={isSelected ? 'elevated' : 'default'}
                    style={[styles.leagueCard, isSelected && styles.leagueCardActive]}
                  >
                    <Text style={styles.leagueName}>{league.name}</Text>
                    <Text style={styles.leagueSeason}>{league.season}</Text>
                    <View style={styles.leagueFooter}>
                      <Text style={styles.memberCount}>{league.member_count}</Text>
                      {isMember && <View style={styles.memberDot} />}
                    </View>

                    {account && (
                      <Button
                        title={isMember ? 'LEAVE' : 'JOIN'}
                        variant={isMember ? 'outline' : 'primary'}
                        size="sm"
                        onPress={() => (isMember ? handleLeaveLeague(league.id) : handleJoinLeague(league.id))}
                        style={styles.leagueButton}
                      />
                    )}
                  </Card>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* User Rank */}
        {selectedLeague && account && getUserRank() && (
          <View style={styles.userRankSection}>
            <Card variant="elevated" style={styles.userRankCard}>
              <Text style={styles.userRankLabel}>YOUR RANK</Text>
              <Text style={styles.userRankValue}>#{getUserRank()}</Text>
            </Card>
          </View>
        )}

        {/* Leaderboard */}
        {selectedLeague && (
          <View style={styles.leaderboardSection}>
            {leaderboard.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No competitors</Text>
              </View>
            ) : (
              leaderboard.map((entry, index) => {
                const isCurrentUser = account?.address.toString() === entry.wallet_address

                return (
                  <Card
                    key={entry.wallet_address}
                    variant={isCurrentUser ? 'elevated' : 'default'}
                    style={[styles.leaderboardItem, isCurrentUser && styles.leaderboardItemActive]}
                  >
                    <View style={styles.rankContainer}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>

                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardName}>
                        {entry.username}
                        {isCurrentUser && ' (YOU)'}
                      </Text>
                      <View style={styles.leaderboardStats}>
                        <Text style={styles.statText}>{entry.workout_count} workouts</Text>
                        <Text style={styles.statDivider}>·</Text>
                        <Text style={styles.statText}>{entry.races_won} wins</Text>
                      </View>
                    </View>

                    <View style={styles.pointsContainer}>
                      <Text style={styles.pointsValue}>{entry.season_points}</Text>
                    </View>
                  </Card>
                )
              })
            )}
          </View>
        )}
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

  // League Section
  leagueSection: {
    paddingVertical: spacing.lg,
  },
  leagueScroll: {
    paddingHorizontal: spacing.lg,
  },
  leagueCard: {
    minWidth: 180,
    marginRight: spacing.md,
    paddingVertical: spacing.lg,
  },
  leagueCardActive: {
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  leagueName: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 1,
    fontWeight: '400',
  },
  leagueSeason: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  leagueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  memberCount: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  memberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[500],
  },
  leagueButton: {
    marginTop: spacing.sm,
  },

  // User Rank
  userRankSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  userRankCard: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  userRankLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    letterSpacing: 1.5,
  },
  userRankValue: {
    ...typography.display,
    color: colors.primary[500],
    fontWeight: '300',
  },

  // Leaderboard
  leaderboardSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  leaderboardItemActive: {
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rankText: {
    ...typography.h3,
    color: colors.text.tertiary,
    fontWeight: '300',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
    fontWeight: '400',
  },
  leaderboardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statText: {
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  statDivider: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '300',
  },

  // Empty State
  emptyState: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
})
