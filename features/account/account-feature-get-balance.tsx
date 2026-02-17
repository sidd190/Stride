import { Text, ActivityIndicator, TouchableOpacity } from 'react-native'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useAccountGetBalance } from '@/features/account/use-account-get-balance'

export function AccountFeatureGetBalance({ address }: { address: PublicKey }) {
  const { data, isLoading, error, refetch } = useAccountGetBalance({ address })

  if (isLoading) {
    return <ActivityIndicator size="small" />
  }

  if (error) {
    return (
      <TouchableOpacity onPress={() => refetch()}>
        <Text style={{ color: '#dc2626' }}>Failed to load (tap to retry)</Text>
      </TouchableOpacity>
    )
  }

  const balance = data !== undefined ? (data / LAMPORTS_PER_SOL).toFixed(4) : '0.0000'
  
  return <Text style={{ fontSize: 16, color: '#111827' }}>{balance} SOL</Text>
}
