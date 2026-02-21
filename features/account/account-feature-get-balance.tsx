import { Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useAccountGetBalance } from '@/features/account/use-account-get-balance'
import { colors, typography } from '@/constants/theme'

export function AccountFeatureGetBalance({ address }: { address: PublicKey }) {
  const { data, isLoading, error, refetch } = useAccountGetBalance({ address })

  if (isLoading) {
    return <ActivityIndicator size="small" color={colors.primary[500]} />
  }

  if (error) {
    return (
      <TouchableOpacity onPress={() => refetch()}>
        <Text style={styles.errorText}>Failed to load (tap to retry)</Text>
      </TouchableOpacity>
    )
  }

  const balance = data !== undefined ? (data / LAMPORTS_PER_SOL).toFixed(4) : '0.0000'
  
  return <Text style={styles.balanceText}>{balance} SOL</Text>
}

const styles = StyleSheet.create({
  balanceText: {
    ...typography.body,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    letterSpacing: 0.5,
  },
})
