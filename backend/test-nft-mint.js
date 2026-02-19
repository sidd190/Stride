import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env FIRST before importing other modules
dotenv.config({ path: join(__dirname, '.env') })

import { initializeSolana } from './config/solana.js'
import { mintWorkoutNFT, mintRaceTrophyNFT, mintMilestoneNFT } from './services/nftMinter.js'
import { generateRouteArt } from './services/routeArtGenerator.js'

// Initialize Solana
const initialized = initializeSolana()

if (!initialized) {
  console.error('❌ Failed to initialize Solana. Check your .env file.')
  process.exit(1)
}

// Sample data
// IMPORTANT: Replace with your actual devnet wallet address to receive the NFT!
const userWallet = 'A4AgCXBMnvajbTBD3YVYU1zuGEPvS4pNJkXUxUwsYit3' // Your devnet wallet
const workoutData = {
  distance: 5.2,
  duration: 1530,
  pace: 4.9,
}

const sampleCoordinates = [
  { latitude: 37.7749, longitude: -122.4194 },
  { latitude: 37.7759, longitude: -122.4194 },
  { latitude: 37.7759, longitude: -122.4184 },
  { latitude: 37.7749, longitude: -122.4184 },
  { latitude: 37.7749, longitude: -122.4194 },
]

async function testMinting() {
  console.log(' Testing NFT Minting...\n')

  // Test 1: Mint workout NFT
  console.log('--- Test 1: Workout NFT ---')
  const routeArt = generateRouteArt(sampleCoordinates, workoutData)
  const workoutNFT = await mintWorkoutNFT(userWallet, workoutData, routeArt)
  console.log('Result:', workoutNFT.success ? '✅ SUCCESS' : '❌ FAILED')
  console.log()

  // Test 2: Mint race trophy
  console.log('--- Test 2: Race Trophy NFT ---')
  const raceData = {
    code: 'ABC123',
    distance: 5,
    participants: 10,
    finishTime: 1500000,
  }
  const trophyNFT = await mintRaceTrophyNFT(userWallet, raceData, 1)
  console.log('Result:', trophyNFT.success ? '✅ SUCCESS' : '❌ FAILED')
  console.log()

  // Test 3: Mint milestone
  console.log('--- Test 3: Milestone NFT ---')
  const milestoneNFT = await mintMilestoneNFT(userWallet, 100, 105.5)
  console.log('Result:', milestoneNFT.success ? '✅ SUCCESS' : '❌ FAILED')
  console.log()

  console.log(' All tests completed!')
}

testMinting().catch(console.error)
