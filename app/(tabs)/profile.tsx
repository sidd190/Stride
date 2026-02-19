import React, { useEffect, useState } from 'react'
import { Text, View, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { getProfile, createProfile, deleteProfile, getWorkoutHistory, getRaceHistory, getUserLeagues } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'expo-router'
import { AccountFeatureGetBalance } from '@/features/account/account-feature-get-balance'
import { NetworkUiSelect } from '@/features/network/network-ui-select'
import { useNetwork } from '@/features/network/use-network'

const PROFILE_CACHE_KEY = 'cached_profile_'

function ProfileSkeleton() {
  return (
    <View style={styles.profileCard}>
      <View style={styles.skeleton} />
      <View style={[styles.skeleton, { width: '60%' }]} />
      <View style={styles.skeleton} />
      <View style={[styles.skeleton, { width: '80%' }]} />
    </View>
  )
}

export default function Profile() {
  const { account, disconnect } = useMobileWallet()
  const { signOut } = useAuth()
  const { networks, selectedNetwork, setSelectedNetwork } = useNetwork()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [workouts, setWorkouts] = useState<any[]>([])
  const [races, setRaces] = useState<any[]>([])
  const [leagues, setLeagues] = useState<any[]>([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showNetworkSelect, setShowNetworkSelect] = useState(false)
  const [showWorkouts, setShowWorkouts] = useState(false)
  const [showRaces, setShowRaces] = useState(false)
  const [showLeagues, setShowLeagues] = useState(false)

  useEffect(() => {
    if (account) {
      loadProfile()
    }
  }, [account])

  const loadProfile = async () => {
    if (!account) return

    try {
      setLoading(true)
      setError(null)

      // Try to load from cache first
      const cacheKey = PROFILE_CACHE_KEY + account.address.toString()
      const cached = await AsyncStorage.getItem(cacheKey)

      if (cached) {
        setProfile(JSON.parse(cached))
        setLoading(false)
      }

      // Then fetch from backend in background
      const data = await getProfile(account.address.toString())

      if (data) {
        setProfile(data)
        // Update cache
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data))

        // Load workout history
        try {
          const workoutData = await getWorkoutHistory(account.address.toString())
          setWorkouts(workoutData)
        } catch (err) {
          console.error('Failed to load workouts:', err)
        }

        // Load race history
        try {
          const raceData = await getRaceHistory(account.address.toString())
          setRaces(raceData.races || [])
        } catch (err) {
          console.error('Failed to load races:', err)
        }

        try {
          const leagueData = await getUserLeagues(account.address.toString())
          setLeagues(leagueData.leagues || [])
        } catch (err) {
          console.error('Failed to load leagues:', err)
        }
      } else {
        // No profile exists - this is normal for new users
        setProfile(null)
        if (cached) {
          // Clear stale cache if backend says no profile
          await AsyncStorage.removeItem(cacheKey)
        }
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err)
      // Only show error for actual failures (network/server errors)
      // Don't show error if we have cached data
      if (!profile) {
        setError('Failed to load profile')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProfile = async () => {
    if (!username.trim()) {
      setError('Username is required')
      return
    }

    try {
      setCreating(true)
      setError(null)
      setSuccess(null)

      const newProfile = {
        wallet: account!.address.toString(),
        username: username.trim(),
      }

      await createProfile(newProfile)

      // Update cache immediately
      const cacheKey = PROFILE_CACHE_KEY + account!.address.toString()
      const profileData = {
        wallet_address: newProfile.wallet,
        username: newProfile.username,
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(profileData))

      setProfile(profileData)
      setSuccess('Profile created successfully!')
      setUsername('')
    } catch (err) {
      console.error('Failed to create profile:', err)
      setError('Failed to create profile')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteProfile = () => {
    Alert.alert('Delete Profile', 'Are you sure you want to delete your profile? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: confirmDeleteProfile,
      },
    ])
  }

  const confirmDeleteProfile = async () => {
    try {
      setDeleting(true)
      setError(null)
      setSuccess(null)

      await deleteProfile(account!.address.toString())

      // Clear cache
      const cacheKey = PROFILE_CACHE_KEY + account!.address.toString()
      await AsyncStorage.removeItem(cacheKey)

      setProfile(null)
      setSuccess('Profile deleted successfully!')
    } catch (err) {
      console.error('Failed to delete profile:', err)
      setError('Failed to delete profile')
    } finally {
      setDeleting(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    disconnect()
    router.replace('/')
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        {loading ? (
          <ProfileSkeleton />
        ) : profile ? (
          <View style={styles.profileCard}>
            <Text style={styles.label}>Username:</Text>
            <Text style={styles.value}>{profile.username}</Text>

            <Text style={styles.label}>Total Points:</Text>
            <Text style={styles.value}>{profile.total_points || 0} pts</Text>

            <Text style={styles.label}>Wallet Address:</Text>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
              {profile.wallet_address}
            </Text>

            <Text style={styles.label}>Balance:</Text>
            <AccountFeatureGetBalance address={account!.address} />

            <Text style={styles.label}>Network:</Text>
            <Text style={styles.value}>{selectedNetwork.label}</Text>
            <Button
              title={showNetworkSelect ? 'Hide Networks' : 'Switch Network'}
              onPress={() => setShowNetworkSelect(!showNetworkSelect)}
              color="#6b7280"
            />

            {showNetworkSelect && (
              <View style={styles.networkSelect}>
                <NetworkUiSelect
                  networks={networks}
                  selectedNetwork={selectedNetwork}
                  setSelectedNetwork={(network) => {
                    setSelectedNetwork(network)
                    setShowNetworkSelect(false)
                  }}
                />
              </View>
            )}

            <View style={styles.workoutHistorySection}>
              <TouchableOpacity onPress={() => setShowWorkouts(!showWorkouts)}>
                <Text style={styles.workoutHistoryTitle}>
                  Workout History ({workouts.length}) {showWorkouts ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {showWorkouts && workouts.length > 0 && (
                <View style={styles.workoutList}>
                  {workouts.map((workout) => (
                    <View key={workout.id} style={styles.workoutItem}>
                      <Text style={styles.workoutDate}>{new Date(workout.completed_at).toLocaleDateString()}</Text>
                      <Text style={styles.workoutStats}>
                        {Math.floor(workout.duration / 60)}min • {workout.distance}km • {workout.points}pts
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {showWorkouts && workouts.length === 0 && (
                <Text style={styles.noWorkouts}>No workouts yet. Start tracking!</Text>
              )}
            </View>

            <View style={styles.raceHistorySection}>
              <TouchableOpacity onPress={() => setShowRaces(!showRaces)}>
                <Text style={styles.raceHistoryTitle}>
                  Race History ({races.length}) {showRaces ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {showRaces && races.length > 0 && (
                <View style={styles.raceList}>
                  {races.map((race) => (
                    <View key={race.id} style={styles.raceItem}>
                      <View style={styles.raceHeader}>
                        <Text style={styles.raceCode}>#{race.race_code}</Text>
                        <Text style={styles.raceDate}>{new Date(race.completed_at).toLocaleDateString()}</Text>
                      </View>
                      <Text style={styles.raceStats}>
                        {race.target_distance}km • {race.total_participants} racers
                      </Text>
                      <View style={styles.raceResult}>
                        <Text style={styles.racePosition}>
                          {race.position === 1 ? '🥇' : race.position === 2 ? '🥈' : race.position === 3 ? '🥉' : `#${race.position}`}
                        </Text>
                        <Text style={styles.raceTime}>
                          {race.finished && race.finish_time
                            ? `${Math.floor(race.finish_time / 60000)}:${String(Math.floor((race.finish_time % 60000) / 1000)).padStart(2, '0')}`
                            : `${race.distance}km (DNF)`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {showRaces && races.length === 0 && (
                <Text style={styles.noRaces}>No races yet. Join a race!</Text>
              )}
            </View>

            <View style={styles.leaguesSection}>
              <TouchableOpacity onPress={() => setShowLeagues(!showLeagues)}>
                <Text style={styles.leaguesTitle}>
                  My Leagues ({leagues.length}) {showLeagues ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {showLeagues && leagues.length > 0 && (
                <View style={styles.leaguesList}>
                  {leagues.map((league) => (
                    <View key={league.id} style={styles.leagueItem}>
                      <View style={styles.leagueInfo}>
                        <Text style={styles.leagueName}>{league.name}</Text>
                        <Text style={styles.leagueSeason}>{league.season}</Text>
                      </View>
                      <View style={styles.leaguePoints}>
                        <Text style={styles.leaguePointsValue}>{league.season_points || 0}</Text>
                        <Text style={styles.leaguePointsLabel}>pts</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {showLeagues && leagues.length === 0 && (
                <Text style={styles.noLeagues}>No leagues joined. Check the Leaderboard tab!</Text>
              )}
            </View>

            <View style={styles.deleteButton}>
              <Button
                title={deleting ? 'Deleting...' : 'Delete Profile'}
                onPress={handleDeleteProfile}
                color="#dc2626"
                disabled={deleting}
              />
            </View>
          </View>
        ) : (
          <View style={styles.createForm}>
            <Text style={styles.subtitle}>Create Your Profile</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
              editable={!creating}
            />

            <Button
              title={creating ? 'Creating...' : 'Create Profile'}
              onPress={handleCreateProfile}
              disabled={creating}
            />
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.error}>{error}</Text>
            <Button title="Retry" onPress={loadProfile} color="#dc2626" />
          </View>
        )}
        {success && <Text style={styles.success}>{success}</Text>}

        <View style={styles.footer}>
          <Button title="Sign Out" onPress={handleSignOut} color="#dc2626" />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
    color: '#ffffff',
  },
  profileCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: '#ffffff',
  },
  createForm: {
    gap: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
  },
  networkSelect: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  workoutHistorySection: {
    marginTop: 20,
  },
  workoutHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 10,
  },
  workoutList: {
    gap: 8,
  },
  workoutItem: {
    backgroundColor: '#0f0f0f',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  workoutDate: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '500',
  },
  workoutStats: {
    fontSize: 14,
    color: '#ffffff',
  },
  noWorkouts: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  raceHistorySection: {
    marginTop: 20,
  },
  raceHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 10,
  },
  raceList: {
    gap: 8,
  },
  raceItem: {
    backgroundColor: '#0f0f0f',
    padding: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  raceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  raceCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00d4ff',
  },
  raceDate: {
    fontSize: 12,
    color: '#888888',
  },
  raceStats: {
    fontSize: 13,
    color: '#888888',
  },
  raceResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  racePosition: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  raceTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  noRaces: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  leaguesSection: {
    marginTop: 20,
  },
  leaguesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 10,
  },
  leaguesList: {
    gap: 8,
  },
  leagueItem: {
    backgroundColor: '#0f0f0f',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  leagueSeason: {
    fontSize: 12,
    color: '#888888',
  },
  leaguePoints: {
    alignItems: 'flex-end',
  },
  leaguePointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ff88',
  },
  leaguePointsLabel: {
    fontSize: 11,
    color: '#888888',
  },
  noLeagues: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  deleteButton: {
    marginTop: 20,
  },
  skeleton: {
    height: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginVertical: 8,
  },
  errorContainer: {
    marginTop: 10,
    gap: 10,
    alignItems: 'center',
  },
  error: {
    color: '#ff4444',
    textAlign: 'center',
  },
  success: {
    color: '#00ff88',
    textAlign: 'center',
    marginTop: 10,
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
  },
})
