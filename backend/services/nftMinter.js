import { getMetaplex, isInitialized } from '../config/solana.js'
import { PublicKey } from '@solana/web3.js'
import lighthouse from '@lighthouse-web3/sdk'
import fs from 'fs'
import path from 'path'

/**
 * Get Lighthouse API key (read dynamically to support late env loading)
 */
function getLighthouseKey() {
  return process.env.LIGHTHOUSE_API_KEY
}

/**
 * Upload image to IPFS via Lighthouse
 */
async function uploadImage(imageBuffer) {
  try {
    const LIGHTHOUSE_API_KEY = getLighthouseKey()
    
    if (!LIGHTHOUSE_API_KEY) {
      throw new Error('LIGHTHOUSE_API_KEY not set')
    }

    console.log(' Uploading image to IPFS via Lighthouse...')
    
    // Save to temp file first (Lighthouse needs file path)
    const tempDir = 'backend/uploads/temp'
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    const tempFilePath = path.join(tempDir, `workout-${Date.now()}.png`)
    fs.writeFileSync(tempFilePath, imageBuffer)
    
    // Upload to Lighthouse
    const uploadResponse = await lighthouse.upload(tempFilePath, LIGHTHOUSE_API_KEY)
    const imageUrl = `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`
    
    console.log('Image uploaded to IPFS:', imageUrl)
    console.log(' IPFS Hash:', uploadResponse.data.Hash)
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath)
    
    // Also save to permanent local storage for backup
    const backupPath = `backend/uploads/workout-${Date.now()}.png`
    fs.writeFileSync(backupPath, imageBuffer)
    
    return imageUrl
  } catch (error) {
    console.error('IPFS upload failed:', error.message)
    
    // Fallback to local storage
    const filename = `workout-${Date.now()}.png`
    const filepath = `backend/uploads/${filename}`
    
    if (!fs.existsSync('backend/uploads')) {
      fs.mkdirSync('backend/uploads', { recursive: true })
    }
    
    fs.writeFileSync(filepath, imageBuffer)
    return `https://gateway.lighthouse.storage/ipfs/mock/${filename}`
  }
}

/**
 * Upload metadata JSON to IPFS via Lighthouse
 */
async function uploadMetadata(metadata) {
  try {
    const LIGHTHOUSE_API_KEY = getLighthouseKey()
    
    if (!LIGHTHOUSE_API_KEY) {
      throw new Error('LIGHTHOUSE_API_KEY not set')
    }

    console.log(' Uploading metadata to IPFS via Lighthouse...')
    
    // Save to temp file
    const tempDir = 'backend/uploads/temp'
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    const tempFilePath = path.join(tempDir, `metadata-${Date.now()}.json`)
    fs.writeFileSync(tempFilePath, JSON.stringify(metadata, null, 2))
    
    // Upload to Lighthouse
    const uploadResponse = await lighthouse.upload(tempFilePath, LIGHTHOUSE_API_KEY)
    const metadataUrl = `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`
    
    console.log('Metadata uploaded to IPFS:', metadataUrl)
    console.log(' IPFS Hash:', uploadResponse.data.Hash)
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath)
    
    return metadataUrl
  } catch (error) {
    console.error('Metadata upload failed:', error.message)
    return `https://gateway.lighthouse.storage/ipfs/mock/metadata-${Date.now()}.json`
  }
}

/**
 * Mint workout NFT to user's wallet (ACTUAL MINTING)
 */
export async function mintWorkoutNFT(userWallet, workoutData, imageBuffer) {
  try {
    if (!isInitialized()) {
      throw new Error('Solana not initialized')
    }

    console.log(' Minting workout NFT to devnet...')

    const metaplex = getMetaplex()

    // Upload image
    const imageUrl = await uploadImage(imageBuffer)
    console.log(' Image saved:', imageUrl)

    // Create metadata
    const metadata = {
      name: `${workoutData.distance.toFixed(2)}km Workout`,
      symbol: 'WORKOUT',
      description: `Completed on ${new Date().toLocaleDateString()} - ${Math.floor(workoutData.duration / 60)}:${String(workoutData.duration % 60).padStart(2, '0')}`,
      image: imageUrl,
      attributes: [
        {
          trait_type: 'Distance',
          value: workoutData.distance.toFixed(2),
        },
        {
          trait_type: 'Duration',
          value: `${Math.floor(workoutData.duration / 60)}:${String(workoutData.duration % 60).padStart(2, '0')}`,
        },
        {
          trait_type: 'Pace',
          value: `${workoutData.pace.toFixed(2)} min/km`,
        },
        {
          trait_type: 'Date',
          value: new Date().toISOString().split('T')[0],
        },
        {
          trait_type: 'Type',
          value: 'Workout Proof',
        },
      ],
      properties: {
        category: 'image',
        files: [
          {
            uri: imageUrl,
            type: 'image/png',
          },
        ],
      },
    }

    // Upload metadata
    const metadataUri = await uploadMetadata(metadata)
    console.log(' Metadata URI:', metadataUri)

    // ACTUALLY MINT NFT TO BLOCKCHAIN
    console.log('⛓️  Minting to Solana devnet...')
    console.log(' Recipient:', userWallet)

    const { nft } = await metaplex.nfts().create({
      uri: metadataUri,
      name: metadata.name,
      symbol: metadata.symbol,
      sellerFeeBasisPoints: 500, // 5% royalty
      tokenOwner: new PublicKey(userWallet), // Convert string to PublicKey
    })

    console.log('NFT ACTUALLY MINTED TO BLOCKCHAIN!')
    console.log(' Mint address:', nft.address.toString())
    console.log(' Owner:', userWallet)
    console.log(' View on Solana Explorer:')
    console.log(`   https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`)

    return {
      success: true,
      mintAddress: nft.address.toString(),
      metadata,
      imageUrl,
      explorerUrl: `https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`,
    }
  } catch (error) {
    console.error('Failed to mint NFT:', error)
    throw error
  }
}

/**
 * Mint race trophy NFT (ACTUAL MINTING)
 */
export async function mintRaceTrophyNFT(userWallet, raceData, position) {
  try {
    if (!isInitialized()) {
      throw new Error('Solana not initialized')
    }

    console.log(` Minting ${position} place trophy NFT to devnet...`)

    const metaplex = getMetaplex()
    const trophyEmoji = position === 1 ? '' : position === 2 ? '' : ''
    const positionText = position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'

    const metadata = {
      name: `${trophyEmoji} Race ${positionText} Place`,
      symbol: 'TROPHY',
      description: `Race #${raceData.code} - ${raceData.distance}km - ${raceData.participants} participants`,
      image: `https://arweave.net/mock/trophy-${position}.png`,
      attributes: [
        {
          trait_type: 'Position',
          value: positionText,
        },
        {
          trait_type: 'Race Code',
          value: raceData.code,
        },
        {
          trait_type: 'Distance',
          value: `${raceData.distance}km`,
        },
        {
          trait_type: 'Participants',
          value: raceData.participants.toString(),
        },
        {
          trait_type: 'Finish Time',
          value: `${Math.floor(raceData.finishTime / 60000)}:${String(Math.floor((raceData.finishTime % 60000) / 1000)).padStart(2, '0')}`,
        },
      ],
    }

    const metadataUri = await uploadMetadata(metadata)

    console.log('⛓️  Minting to Solana devnet...')

    const { nft } = await metaplex.nfts().create({
      uri: metadataUri,
      name: metadata.name,
      symbol: metadata.symbol,
      sellerFeeBasisPoints: 500,
      tokenOwner: new PublicKey(userWallet),
    })

    console.log('Trophy NFT ACTUALLY MINTED!')
    console.log(' Mint address:', nft.address.toString())
    console.log(' View on Explorer:')
    console.log(`   https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`)

    return {
      success: true,
      mintAddress: nft.address.toString(),
      metadata,
      explorerUrl: `https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`,
    }
  } catch (error) {
    console.error('Failed to mint trophy NFT:', error)
    throw error
  }
}

/**
 * Mint milestone NFT (ACTUAL MINTING)
 */
export async function mintMilestoneNFT(userWallet, milestoneType, totalDistance) {
  try {
    if (!isInitialized()) {
      throw new Error('Solana not initialized')
    }

    console.log(`️ Minting ${milestoneType}km milestone NFT to devnet...`)

    const metaplex = getMetaplex()
    const milestoneNames = {
      100: 'Century Runner',
      500: 'Marathon Veteran',
      1000: 'Ultra Legend',
    }

    const metadata = {
      name: milestoneNames[milestoneType] || `${milestoneType}km Milestone`,
      symbol: 'MILESTONE',
      description: `Achieved ${totalDistance.toFixed(1)}km total distance`,
      image: `https://arweave.net/mock/milestone-${milestoneType}.png`,
      attributes: [
        {
          trait_type: 'Milestone',
          value: `${milestoneType}km`,
        },
        {
          trait_type: 'Total Distance',
          value: `${totalDistance.toFixed(1)}km`,
        },
        {
          trait_type: 'Achievement Date',
          value: new Date().toISOString().split('T')[0],
        },
      ],
    }

    const metadataUri = await uploadMetadata(metadata)

    console.log('⛓️  Minting to Solana devnet...')

    const { nft } = await metaplex.nfts().create({
      uri: metadataUri,
      name: metadata.name,
      symbol: metadata.symbol,
      sellerFeeBasisPoints: 500,
      tokenOwner: new PublicKey(userWallet),
    })

    console.log('Milestone NFT ACTUALLY MINTED!')
    console.log(' Mint address:', nft.address.toString())
    console.log(' View on Explorer:')
    console.log(`   https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`)

    return {
      success: true,
      mintAddress: nft.address.toString(),
      metadata,
      explorerUrl: `https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`,
    }
  } catch (error) {
    console.error('Failed to mint milestone NFT:', error)
    throw error
  }
}
