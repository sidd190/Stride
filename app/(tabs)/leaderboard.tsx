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
        {/* League Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leagues</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leagueScroll}>
            {leagues.map((league) => {
              const isSelected = selectedLeague?.id === league.id
              const isMember = userLeagues.includes(league.id)

              return (
                <TouchableOpacity key={league.id} onPress={() => setSelectedLeague(league)}>
                  <Card
                    variant={isSelected ? 'glow' : 'default'}
                    style={isSelected ? { ...styles.leagueCard, ...styles.leagueCardActive } : styles.leagueCard}
                  >
                    <View style={styles.leagueHeader}>
                      <Text style={styles.leagueName}>{league.name}</Text>
                      {isMember && <Badge label="JOINED" variant="success" size="sm" />}
                    </View>
                    <Text style={styles.leagueSeason}>{league.season}</Text>
                    <View style={styles.leagueFooter}>
                      <View style={styles.memberCount}>
                        <Ionicons name="people" size={14} color={colors.text.tertiary} />
                        <Text style={styles.memberCountText}>{league.member_count}</Text>
                      </View>
                    </View>

                    {account && (
                      <Button
                        title={isMember ? 'Leave' : 'Join'}
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

        {/* User Rank Card */}
        {selectedLeague && account && getUserRank() && (
          <Card variant="elevated" style={styles.userRankCard}>
            <View style={styles.userRankContent}>
              <View>
                <Text style={styles.userRankLabel}>YOUR RANK</Text>
                <Text style={styles.userRankValue}>#{getUserRank()}</Text>
              </View>
              <Ionicons name="trophy" size={48} color={colors.gold[500]} />
            </View>
          </Card>
        )}

        {/* Leaderboard */}
        {selectedLeague && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Competitors</Text>
            {leaderboard.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="trophy-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No competitors yet</Text>
                <Text style={styles.emptySubtext}>Be the first to join and compete!</Text>
              </Card>
            ) : (
              leaderboard.map((entry, index) => {
                const isCurrentUser = account?.address.toString() === entry.wallet_address

                return (
                  <Card
                    key={entry.wallet_address}
                    variant={isCurrentUser ? 'glow' : 'default'}
                    style={
                      isCurrentUser
                        ? { ...styles.leaderboardItem, ...styles.leaderboardItemHighlight }
                        : styles.leaderboardItem
                    }
                  >
                    <View style={index < 3 ? { ...styles.rankBadge, ...styles.rankBadgeTop } : styles.rankBadge}>
                      <Text style={styles.rankText}>{getRankIcon(index)}</Text>
                    </View>

                    <View style={styles.leaderboardInfo}>
                      <View style={styles.leaderboardHeader}>
                        <Text style={styles.leaderboardName}>
                          {entry.username}
                          {isCurrentUser && ' (You)'}
                        </Text>
                        {index < 3 && <Badge label="TOP 3" variant="gold" size="sm" />}
                      </View>
                      <View style={styles.leaderboardStats}>
                        <View style={styles.stat}>
                          <Ionicons name="fitness" size={14} color={colors.text.tertiary} />
                          <Text style={styles.statText}>{entry.workout_count}</Text>
                        </View>
                        <View style={styles.stat}>
                          <Ionicons name="trophy" size={14} color={colors.text.tertiary} />
                          <Text style={styles.statText}>{entry.races_won}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.pointsContainer}>
                      <Text style={styles.pointsValue}>{entry.season_points}</Text>
                      <Text style={styles.pointsLabel}>PTS</Text>
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },

  // League Cards
  leagueScroll: {
    paddingHorizontal: spacing.md,
  },
  leagueCard: {
    minWidth: 200,
    marginRight: spacing.md,
  },
  leagueCardActive: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  leagueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  leagueName: {
    ...typography.h4,
    color: colors.text.primary,
    flex: 1,
  },
  leagueSeason: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  leagueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberCountText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  leagueButton: {
    marginTop: spacing.sm,
  },

  // User Rank
  userRankCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  userRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRankLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  userRankValue: {
    ...typography.display,
    color: colors.gold[500],
  },

  // Leaderboard Items
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  leaderboardItemHighlight: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: surfaces.elevated2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rankBadgeTop: {
    backgroundColor: colors.gold[900],
  },
  rankText: {
    ...typography.h4,
    color: colors.text.primary,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  leaderboardName: {
    ...typography.h4,
    color: colors.text.primary,
  },
  leaderboardStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    ...typography.h2,
    color: colors.secondary[500],
    fontWeight: '700',
  },
  pointsLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },

  // Empty State
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    marginHorizontal: spacing.md,
  },
  emptyText: {
    ...typography.h4,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
})
