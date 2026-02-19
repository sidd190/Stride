import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js'
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js'
import bs58 from 'bs58'

// Use devnet for testing
const NETWORK = 'devnet'
const RPC_ENDPOINT = clusterApiUrl(NETWORK)

// Create connection
export const connection = new Connection(RPC_ENDPOINT, 'confirmed')

// App wallet keypair (will be loaded from env)
let appWallet = null

// Initialize Metaplex instance
let metaplex = null

export function initializeSolana() {
  try {
    // Get wallet private key from environment
    const privateKeyString = process.env.SOLANA_PRIVATE_KEY
    
    if (!privateKeyString) {
      console.warn('SOLANA_PRIVATE_KEY not set in .env - NFT minting will be disabled')
      return false
    }

    // Decode private key (expects base58 encoded string)
    const privateKeyBytes = bs58.decode(privateKeyString)
    appWallet = Keypair.fromSecretKey(privateKeyBytes)

    // Initialize Metaplex
    metaplex = Metaplex.make(connection).use(keypairIdentity(appWallet))

    console.log('Solana initialized')
    console.log('Network:', NETWORK)
    console.log('App Wallet:', appWallet.publicKey.toString())

    return true
  } catch (error) {
    console.error('Failed to initialize Solana:', error.message)
    return false
  }
}

export function getMetaplex() {
  if (!metaplex) {
    throw new Error('Metaplex not initialized. Call initializeSolana() first.')
  }
  return metaplex
}

export function getAppWallet() {
  if (!appWallet) {
    throw new Error('App wallet not initialized. Call initializeSolana() first.')
  }
  return appWallet
}

export function isInitialized() {
  return metaplex !== null && appWallet !== null
}
