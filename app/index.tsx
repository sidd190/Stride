import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect } from 'react'
import { appStyles } from '@/constants/app-styles'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { AccountFeatureConnect } from '@/features/account/account-feature-connect'
import { useRouter } from 'expo-router'

export default function WalletConnectScreen() {
  const { account } = useMobileWallet()
  const router = useRouter()

  useEffect(() => {
    if (account) {
      router.replace('/(tabs)/home')
    }
  }, [account])

  return (
    <SafeAreaView style={appStyles.screen}>
      <View style={appStyles.stack}>
        <Text style={appStyles.title}>Welcome to Stride</Text>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>Connect your wallet to get started</Text>
        <AccountFeatureConnect />
      </View>
    </SafeAreaView>
  )
}
