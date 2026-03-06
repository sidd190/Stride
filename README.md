# Stride

A blockchain-powered fitness competition platform that transforms running into a competitive, social experience with real-time races and on-chain rewards.

## The Problem

Traditional fitness apps lack competitive engagement and fail to provide meaningful rewards for athletic achievements. Runners train alone, progress goes unrecognized, and there's no transparent way to verify accomplishments or compete globally in real-time.

## Our Solution

Stride combines GPS workout tracking with blockchain technology to create a competitive fitness ecosystem where athletes can:

- Compete in real-time races against others worldwide
- Earn verifiable on-chain achievements as NFTs
- Join seasonal leagues and climb global leaderboards
- Participate in team relay races with coordinated baton passing
- Track detailed workout metrics with GPS precision

## Key Features

### Real-Time Racing
Create or join races with customizable distances. Watch live leaderboards update as competitors progress. Solo races for individual competition or relay races for team-based challenges.

### Blockchain Integration
Wallet-based authentication using Solana Mobile Wallet Adapter. Race victories are minted as compressed NFTs, creating a permanent, verifiable record of achievements on-chain.

### GPS Tracking
Precise location tracking with real-time metrics including distance, pace, speed, and calories. Route visualization on interactive maps.

### League System
Seasonal competitions with point-based rankings. Join multiple leagues, compete for top positions, and track historical performance across seasons.

### Live Updates
WebSocket-powered real-time race synchronization. See competitor progress instantly, receive notifications for race events, and experience the thrill of live competition.

## Technology Stack

**Frontend**
- React Native with Expo for cross-platform mobile development
- TypeScript for type safety
- Solana Web3.js for blockchain interactions
- Socket.IO for real-time communication
- React Native Maps for GPS tracking

**Backend**
- Node.js with Express for REST API
- Socket.IO for WebSocket server
- PostgreSQL for data persistence
- JWT authentication

**Blockchain**
- Solana for fast, low-cost transactions
- Metaplex Bubblegum for compressed NFTs
- Mobile Wallet Adapter for secure signing
- Lighthouse for decentralized metadata storage

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Expo CLI
- Solana wallet with devnet SOL

### Installation

1. Clone and install dependencies:
```bash
git clone <repository-url>
cd stride
npm install
cd backend && npm install && cd ..
```

2. Set up the database:
```bash
createdb stride
cd backend
node init-db.js
```

3. Configure environment variables:

Create `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/stride
JWT_SECRET=your-secret-key
SOLANA_RPC_URL=https://api.devnet.solana.com
LIGHTHOUSE_API_KEY=your-lighthouse-key
PORT=3000
```

Update API URLs in `services/api.ts` and `services/socket.ts` to your backend URL.

4. Start the application:
```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start mobile app
npm start
```

## How It Works

### For Athletes

1. **Connect Wallet**: Authenticate using your Solana wallet
2. **Create or Join Race**: Choose solo or relay mode, set distance, generate race code
3. **Start Running**: GPS tracks your progress in real-time
4. **Compete Live**: Watch the leaderboard update as you and competitors progress
5. **Earn Rewards**: Winners receive NFTs minted on Solana

### Race Modes

**Solo Racing**
- Individual competition
- Distances: 1km, 3km, 5km, 10km, 21km
- Winner determined by fastest completion time

**Relay Racing**
- Team-based sequential racing
- 2-4 teams with 2-4 legs each
- Baton passing between teammates
- Team coordination required

### Technical Flow

```
User connects wallet → Signs authentication message → Creates/joins race
→ GPS tracking begins → Real-time updates via WebSocket → Race completion
→ Winner determined → NFT minted on Solana → Achievement recorded on-chain
```

## Architecture

```
Mobile App (React Native)
    ↓
REST API + WebSocket (Express + Socket.IO)
    ↓
PostgreSQL Database
    ↓
Solana Blockchain (NFT Minting)
```

## Innovation Highlights

### Compressed NFTs
Using Metaplex Bubblegum for cost-effective NFT minting at scale. Each race victory costs a fraction of traditional NFT minting.

### Real-Time Synchronization
WebSocket architecture ensures all participants see race updates instantly, creating a truly live competitive experience.

### Mobile-First Blockchain
Leveraging Solana Mobile Wallet Adapter for seamless transaction signing without leaving the app.

### Hybrid Data Architecture
Off-chain PostgreSQL for fast queries and real-time updates, on-chain Solana for immutable achievement verification.

## Project Structure

```
stride/
├── app/                    # React Native screens
│   ├── (tabs)/            # Main navigation tabs
│   └── index.tsx          # Welcome screen
├── backend/               # Express server
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic
│   └── index.js          # Server entry point
├── components/           # Reusable UI components
├── services/            # API and WebSocket clients
└── utils/              # Helper functions
```

## Challenges We Faced

1. **Real-Time Synchronization**: Ensuring race updates are delivered instantly to all participants required careful WebSocket state management and conflict resolution.

2. **GPS Accuracy**: Balancing battery consumption with location precision for accurate distance tracking during races.

3. **Blockchain Integration**: Implementing secure wallet authentication and transaction signing in a mobile environment.

4. **Scalability**: Designing a system that can handle multiple concurrent races with many participants.

## What We Learned

- Building real-time multiplayer experiences requires careful state management
- Compressed NFTs make blockchain rewards economically viable at scale
- Mobile blockchain UX requires thoughtful integration of wallet adapters
- GPS tracking in production requires extensive testing across devices

## Future Enhancements

- Voice coaching during races
- AR features for enhanced running experience
- Social features: friend challenges, team creation
- Integration with fitness wearables
- Staking mechanisms for race entry
- Marketplace for trading achievement NFTs
- Training plans and workout recommendations
- Integration with major fitness platforms

## Team

Solo roller

## Built For

Monolith Hackathon


## Acknowledgments

Built with Expo, React Native, Solana, and PostgreSQL. Special thanks to the Solana Mobile team for the Mobile Wallet Adapter SDK.
