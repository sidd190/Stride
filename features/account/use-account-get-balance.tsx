import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'

export function useAccountGetBalance({ address }: { address: PublicKey }) {
  const { chain, connection } = useMobileWallet()
  return useQuery({
    queryKey: ['get-balance', chain, address.toString()],
    queryFn: async () => {
      try {
        // Convert to proper PublicKey if needed
        const pubkey = typeof address === 'string' ? new PublicKey(address) : address
        const balance = await connection.getBalance(pubkey)
        return balance
      } catch (error) {
        console.error('Balance fetch error:', error)
        throw error
      }
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  })
}
