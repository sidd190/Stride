import React, { useState, useEffect } from 'react'
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { getLeagues, getUserLeagues, getLeaderboard, joinLeague, leaveLeague } from '@/services/api'

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
      console.log('Loading leagues...')
      const data = await getLeagues()
      console.log('Leagues loaded:', data)
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
      console.log('Loading user leagues...')
      const data = await getUserLeagues(account.address.toString())
      console.log('User leagues loaded:', data)
      setUserLeagues(data.leagues.map((l: League) => l.id))
    } catch (error) {
      console.error('Failed to load user leagues:', error)
    }
  }

  const loadLeaderboard = async () => {
    if (!selectedLeague) return
    try {
      console.log('Loading leaderboard for league:', selectedLeague.id)
      const data = await getLeaderboard(selectedLeague.id)
      console.log('Leaderboard loaded:', data)
      setLeaderboard(data.leaderboard)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
      setLeaderboard([]) // Set empty array on error
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 50 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Leaderboard</Text>

        <View style={styles.leagueSelector}>
          <Text style={styles.sectionTitle}>Select League</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leagueScroll}>
            {leagues.map((league) => (
              <TouchableOpacity
                key={league.id}
                style={[
                  styles.leagueCard,
                  selectedLeague?.id === league.id && styles.leagueCardActive,
                ]}
                onPress={() => setSelectedLeague(league)}
              >
                <Text
                  style={[
                    styles.leagueName,
                    selectedLeague?.id === league.id && styles.leagueNameActive,
                  ]}
                >
                  {league.name}
                </Text>
                <Text style={styles.leagueSeason}>{league.season}</Text>
                <Text style={styles.leagueMembers}>{league.member_count} members</Text>
                
                {account && (
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      userLeagues.includes(league.id) && styles.leaveButton,
                    ]}
                    onPress={() =>
                      userLeagues.includes(league.id)
                        ? handleLeaveLeague(league.id)
                        : handleJoinLeague(league.id)
                    }
                  >
                    <Text style={styles.joinButtonText}>
                      {userLeagues.includes(league.id) ? 'Leave' : 'Join'}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedLeague && (
          <>
            {account && getUserRank() && (
              <View style={styles.userRankCard}>
                <Text style={styles.userRankLabel}>Your Rank</Text>
                <Text style={styles.userRankValue}>#{getUserRank()}</Text>
              </View>
            )}

            <View style={styles.leaderboardContainer}>
              <Text style={styles.sectionTitle}>Top Runners</Text>
              {leaderboard.length === 0 ? (
                <Text style={styles.emptyText}>No runners yet. Be the first to join!</Text>
              ) : (
                leaderboard.map((entry, index) => (
                  <View
                    key={entry.wallet_address}
                    style={[
                      styles.leaderboardItem,
                      account?.address.toString() === entry.wallet_address && styles.leaderboardItemHighlight,
                    ]}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </Text>
                    </View>
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardName}>
                        {entry.username}
                        {account?.address.toString() === entry.wallet_address && ' (You)'}
                      </Text>
                      <Text style={styles.leaderboardStats}>
                        {entry.workout_count} workouts • {entry.races_won} races won
                      </Text>
                    </View>
                    <View style={styles.pointsContainer}>
                      <Text style={styles.pointsValue}>{entry.season_points}</Text>
                      <Text style={styles.pointsLabel}>pts</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, color: '#111827' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#111827', paddingHorizontal: 20 },
  leagueSelector: { marginBottom: 20 },
  leagueScroll: { paddingHorizontal: 20 },
  leagueCard: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 180,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  leagueCardActive: { backgroundColor: '#10b981', borderColor: '#059669' },
  leagueName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  leagueNameActive: { color: '#fff' },
  leagueSeason: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  leagueMembers: { fontSize: 12, color: '#9ca3af' },
  joinButton: { backgroundColor: '#3b82f6', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginTop: 8 },
  leaveButton: { backgroundColor: '#ef4444' },
  joinButtonText: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  userRankCard: {
    backgroundColor: '#fef3c7',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  userRankLabel: { fontSize: 14, color: '#92400e', marginBottom: 4 },
  userRankValue: { fontSize: 36, fontWeight: 'bold', color: '#92400e' },
  leaderboardContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  leaderboardItemHighlight: { backgroundColor: '#dbeafe', borderWidth: 2, borderColor: '#3b82f6' },
  rankBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 20, fontWeight: 'bold' },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  leaderboardStats: { fontSize: 12, color: '#6b7280' },
  pointsContainer: { alignItems: 'flex-end' },
  pointsValue: { fontSize: 24, fontWeight: 'bold', color: '#10b981' },
  pointsLabel: { fontSize: 12, color: '#6b7280' },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
})
