import React, { useEffect, useState } from 'react'
import { Text, View, TextInput, Button, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { getProfile, createProfile, deleteProfile } from '@/services/api'
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
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showNetworkSelect, setShowNetworkSelect] = useState(false)

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
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete your profile? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteProfile,
        },
      ]
    )
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {loading ? (
          <ProfileSkeleton />
        ) : profile ? (
          <View style={styles.profileCard}>
            <Text style={styles.label}>Username:</Text>
            <Text style={styles.value}>{profile.username}</Text>
            
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
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#f3f4f6',
    padding: 20,
    borderRadius: 10,
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: '#111827',
  },
  createForm: {
    gap: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  networkSelect: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  deleteButton: {
    marginTop: 20,
  },
  skeleton: {
    height: 20,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginVertical: 8,
  },
  errorContainer: {
    marginTop: 10,
    gap: 10,
    alignItems: 'center',
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
  },
  success: {
    color: '#16a34a',
    textAlign: 'center',
    marginTop: 10,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
})