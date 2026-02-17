import { Button } from 'react-native'
import React, { useState } from 'react'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'

export function AccountFeatureConnect({ onError }: { onError?: (error: string) => void }) {
  const { account, connect } = useMobileWallet()
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    try {
      setConnecting(true)
      await connect()
    } catch (error: any) {
      console.error('Connection error:', error)
      if (onError) {
        const errorMsg = error.message || error.toString()
        
        if (errorMsg.includes('CancellationException') || errorMsg.includes('cancelled')) {
          onError('Connection was cancelled. Please try again.')
        } else if (errorMsg.includes('declined') || errorMsg.includes('rejected')) {
          onError('Connection request was declined. Please try again.')
        } else if (errorMsg.includes('No wallet found') || errorMsg.includes('not installed')) {
          onError('No Solana wallet app found. Please install one.')
        } else {
          onError('Failed to connect wallet. Please try again.')
        }
      }
    } finally {
      setConnecting(false)
    }
  }

  return <Button disabled={!!account || connecting} title={connecting ? 'Connecting...' : 'Connect Wallet'} onPress={handleConnect} />
}
