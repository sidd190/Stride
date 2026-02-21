import React, { useEffect, useState } from 'react'
import { Text, View, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { getProfile, createProfile, deleteProfile, getWorkoutHistory, getRaceHistory, getUserLeagues } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'expo-router'
import { AccountFeatureGetBalance } from '@/features/account/account-feature-get-balance'
import { NetworkUiSelect } from '@/features/network/network-ui-select'
import { useNetwork } from '@/features/network/use-network'
import { colors, spacing, typography } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '@/components/ui/Card'

const PROFILE_CACHE_KEY = 'cached_profile_'

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
  const [error, setError] = useState<string | null>(null)
  const [showNetworkSelect, setShowNetworkSelect] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

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

      const cacheKey = PROFILE_CACHE_KEY + account.address.toString()
      const cached = await AsyncStorage.getItem(cacheKey)

      if (cached) {
        setProfile(JSON.parse(cached))
        setLoading(false)
      }

      const data = await getProfile(account.address.toString())

      if (data) {
        setProfile(data)
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data))

        try {
          const workoutData = await getWorkoutHistory(account.address.toString())
          setWorkouts(workoutData)
        } catch (err) {
          console.error('Failed to load workouts:', err)
        }

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
        setProfile(null)
        if (cached) {
          await AsyncStorage.removeItem(cacheKey)
        }
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err)
      if (!profile) {
        setError('Failed to load profile')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProfile = async () => {
    if (!username.trim()) {
      setError('Username required')
      return
    }

    try {
      setCreating(true)
      setError(null)

      const newProfile = {
        wallet: account!.address.toString(),
        username: username.trim(),
      }

      await createProfile(newProfile)

      const cacheKey = PROFILE_CACHE_KEY + account!.address.toString()
      const profileData = {
        wallet_address: newProfile.wallet,
        username: newProfile.username,
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(profileData))

      setProfile(profileData)
      setUsername('')
    } catch (err) {
      console.error('Failed to create profile:', err)
      setError('Failed to create profile')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteProfile = () => {
    Alert.alert('Delete Profile', 'Confirm deletion?', [
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
      await deleteProfile(account!.address.toString())

      const cacheKey = PROFILE_CACHE_KEY + account!.address.toString()
      await AsyncStorage.removeItem(cacheKey)

      setProfile(null)
    } catch (err) {
      console.error('Failed to delete profile:', err)
      setError('Failed to delete profile')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    disconnect()
    router.replace('/')
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFILE</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFILE</Text>
        </View>

        {profile ? (
          <View style={styles.content}>
            {/* Profile Info */}
            <Card style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>USERNAME</Text>
                <Text style={styles.profileValue}>{profile.username}</Text>
              </View>
              <View style={styles.profileDivider} />
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>POINTS</Text>
                <Text style={styles.profileValue}>{profile.total_points || 0}</Text>
              </View>
            </Card>

            {/* Wallet */}
            <Card style={styles.section}>
              <Text style={styles.sectionLabel}>WALLET</Text>
              <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                {profile.wallet_address}
              </Text>
              <View style={styles.balanceContainer}>
                <AccountFeatureGetBalance address={account!.address} />
              </View>
            </Card>

            {/* Network */}
            <Card style={styles.section}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => setShowNetworkSelect(!showNetworkSelect)}
              >
                <Text style={styles.sectionLabel}>NETWORK</Text>
                <Ionicons 
                  name={showNetworkSelect ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.text.tertiary} 
                />
              </TouchableOpacity>
              <Text style={styles.networkValue}>{selectedNetwork.label}</Text>
              
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
            </Card>

            {/* Workouts */}
            <Card style={styles.section}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => toggleSection('workouts')}
              >
                <Text style={styles.sectionLabel}>WORKOUTS ({workouts.length})</Text>
                <Ionicons 
                  name={expandedSection === 'workouts' ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.text.tertiary} 
                />
              </TouchableOpacity>

              {expandedSection === 'workouts' && (
                <View style={styles.listContainer}>
                  {workouts.length > 0 ? (
                    workouts.map((workout) => (
                      <View key={workout.id} style={styles.listItem}>
                        <Text style={styles.listDate}>
                          {new Date(workout.completed_at).toLocaleDateString()}
                        </Text>
                        <Text style={styles.listStats}>
                          {Math.floor(workout.duration / 60)}m · {workout.distance}km · {workout.points}pts
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No workouts</Text>
                  )}
                </View>
              )}
            </Card>

            {/* Races */}
            <Card style={styles.section}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => toggleSection('races')}
              >
                <Text style={styles.sectionLabel}>RACES ({races.length})</Text>
                <Ionicons 
                  name={expandedSection === 'races' ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.text.tertiary} 
                />
              </TouchableOpacity>

              {expandedSection === 'races' && (
                <View style={styles.listContainer}>
                  {races.length > 0 ? (
                    races.map((race) => (
                      <View key={race.id} style={styles.listItem}>
                        <View style={styles.raceHeader}>
                          <Text style={styles.raceCode}>#{race.race_code}</Text>
                          <Text style={styles.racePosition}>#{race.position}</Text>
                        </View>
                        <Text style={styles.listStats}>
                          {race.target_distance}km · {race.total_participants} racers
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No races</Text>
                  )}
                </View>
              )}
            </Card>

            {/* Leagues */}
            <Card style={styles.section}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => toggleSection('leagues')}
              >
                <Text style={styles.sectionLabel}>LEAGUES ({leagues.length})</Text>
                <Ionicons 
                  name={expandedSection === 'leagues' ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.text.tertiary} 
                />
              </TouchableOpacity>

              {expandedSection === 'leagues' && (
                <View style={styles.listContainer}>
                  {leagues.length > 0 ? (
                    leagues.map((league) => (
                      <View key={league.id} style={styles.listItem}>
                        <Text style={styles.leagueName}>{league.name}</Text>
                        <Text style={styles.listStats}>
                          {league.season} · {league.season_points || 0}pts
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No leagues</Text>
                  )}
                </View>
              )}
            </Card>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProfile}>
                <Text style={styles.deleteButtonText}>DELETE PROFILE</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <Text style={styles.signOutButtonText}>SIGN OUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.createContainer}>
            <Card style={styles.createCard}>
              <Text style={styles.createTitle}>CREATE PROFILE</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={colors.text.tertiary}
                value={username}
                onChangeText={setUsername}
                editable={!creating}
              />

              <TouchableOpacity 
                style={[styles.createButton, creating && styles.buttonDisabled]} 
                onPress={handleCreateProfile}
                disabled={creating}
              >
                <Text style={styles.createButtonText}>{creating ? 'CREATING' : 'CREATE'}</Text>
              </TouchableOpacity>

              {error && <Text style={styles.errorText}>{error}</Text>}
            </Card>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.xl,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.lg,
  },
  profileLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  profileValue: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '300',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  walletAddress: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  balanceContainer: {
    marginTop: spacing.md,
  },
  networkValue: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  networkSelect: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  listContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  listItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  listDate: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  listStats: {
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  raceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  raceCode: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    letterSpacing: 1,
  },
  racePosition: {
    ...typography.bodySmall,
    color: colors.primary[500],
    letterSpacing: 1,
  },
  leagueName: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  emptyText: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  deleteButton: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteButtonText: {
    ...typography.label,
    color: colors.error,
    letterSpacing: 2,
  },
  signOutButton: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  signOutButtonText: {
    ...typography.label,
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
  createContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xxxl,
  },
  createCard: {
    paddingVertical: spacing.xxxl,
  },
  createTitle: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 2,
    fontWeight: '300',
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 4,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    letterSpacing: 0.5,
  },
  createButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
  },
  createButtonText: {
    ...typography.label,
    color: colors.background.primary,
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
})
