import { Text, View, Button, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect, useState } from 'react'
import { appStyles } from '@/constants/app-styles'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { AccountFeatureConnect } from '@/features/account/account-feature-connect'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'

export default function WalletConnectScreen() {
  const { account, disconnect } = useMobileWallet()
  const { signInWithWallet, isAuthenticated } = useAuth()
  const router = useRouter()
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/home')
    }
  }, [isAuthenticated])

  useEffect(() => {
    // Clear error when account connects successfully
    if (account) {
      setError(null)
    }
  }, [account])

  const handleAuthenticate = async () => {
    try {
      setAuthenticating(true)
      setError(null)
      await signInWithWallet()
    } catch (err: any) {
      if (err.message?.includes('declined')) {
        setError('You declined the sign-in request. Please try again.')
      } else {
        setError('Authentication failed. Please try again.')
      }
      console.error(err)
    } finally {
      setAuthenticating(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setError(null)
  }

  return (
    <SafeAreaView style={appStyles.screen}>
      <View style={appStyles.stack}>
        <Text style={appStyles.title}>Welcome to Stride</Text>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>Connect your wallet to get started</Text>
        
        {!account ? (
          <>
            <AccountFeatureConnect onError={setError} />
            {error && <Text style={{ color: 'red', textAlign: 'center', marginTop: 10 }}>{error}</Text>}
          </>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={{ textAlign: 'center' }}>Wallet connected! Now sign in:</Text>
            <Text style={{ textAlign: 'center', fontSize: 12, color: '#6b7280' }} numberOfLines={1} ellipsizeMode="middle">
              {account.address.toString()}
            </Text>
            <Button 
              title={authenticating ? 'Signing in...' : 'Sign In with Wallet'} 
              onPress={handleAuthenticate}
              disabled={authenticating}
            />
            <Button 
              title="Switch Wallet" 
              onPress={handleDisconnect}
              color="#6b7280"
            />
            {authenticating && <ActivityIndicator />}
            {error && <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>}
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
