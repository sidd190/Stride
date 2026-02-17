import React from 'react'
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { appStyles } from '@/constants/app-styles'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { ellipsify } from '@/utils/ellipsify'

export default function Home() {
  const { account } = useMobileWallet()

  return (
    <SafeAreaView style={appStyles.screen}>
      <View style={appStyles.stack}>
        <Text style={appStyles.title}>Home</Text>
        {account && (
          <View style={appStyles.card}>
            <Text>Connected: {ellipsify(account.address.toString(), 8)}</Text>
          </View>
        )}
        <Text>Welcome to Stride!</Text>
      </View>
    </SafeAreaView>
  )
}