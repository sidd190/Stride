import dotenv from 'dotenv'

// Load environment variables FIRST before any other imports
dotenv.config()

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profile.js'
import workoutRoutes from './routes/workouts.js'
import racesRoutes from './routes/races.js'
import leaguesRoutes from './routes/leagues.js'
import { pool } from './db.js'
import { initializeSolana } from './config/solana.js'

// Initialize Solana connection
initializeSolana()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/workouts', workoutRoutes)
app.use('/api/races', racesRoutes)
app.use('/api/leagues', leaguesRoutes)

// Race management
const races = new Map() // raceCode -> race data
const relays = new Map() // raceCode -> relay data

// Generate 6-digit race code
function generateRaceCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Save race to database
async function saveRaceToDatabase(race) {
  try {
    // Insert race record
    const raceResult = await pool.query(
      `INSERT INTO races (race_code, target_distance, winner_wallet, total_participants, completed_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [
        race.code,
        race.targetDistance,
        race.participants.find((p) => p.finished)?.wallet || null,
        race.participants.length,
      ]
    )

    const raceId = raceResult.rows[0].id

    for (let i = 0; i < race.participants.length; i++) {
      const p = race.participants[i]
      await pool.query(
        `INSERT INTO race_participants (race_id, wallet_address, username, distance, finish_time, position, finished)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [raceId, p.wallet, p.username, p.distance, p.finishTime || null, i + 1, p.finished]
      )

      // Award points based on position
      if (p.finished) {
        let points = 0
        if (i === 0) points = 100 
        else if (i === 1) points = 75 
        else if (i === 2) points = 50
        else points = 25 

        await pool.query(
          `UPDATE profiles 
           SET total_points = COALESCE(total_points, 0) + $1 
           WHERE wallet_address = $2`,
          [points, p.wallet]
        )

        await pool.query(
          `UPDATE league_membership 
           SET season_points = COALESCE(season_points, 0) + $1 
           WHERE wallet_address = $2`,
          [points, p.wallet]
        )
      }
    }

    console.log(`Race ${race.code} saved to database`)
  } catch (error) {
    console.error('Error saving race to database:', error)
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('create_race', ({ targetDistance, username, wallet }) => {
    const code = generateRaceCode()
    const race = {
      code,
      host: socket.id,
      targetDistance: parseFloat(targetDistance),
      participants: [
        {
          id: socket.id,
          username: username || 'Anonymous',
          wallet,
          isHost: true,
          distance: 0,
          pace: 0,
          finished: false,
        },
      ],
      status: 'lobby', // lobby, countdown, active, finished
      startTime: null,
    }

    races.set(code, race)
    socket.join(code)
    socket.emit('race_created', { code, race })
    console.log(`Race created: ${code}`)
  })

  socket.on('join_race', ({ code, username, wallet }) => {
    const race = races.get(code)

    if (!race) {
      socket.emit('error', { message: 'Race not found' })
      return
    }

    if (race.status !== 'lobby') {
      socket.emit('error', { message: 'Race already started' })
      return
    }

    const participant = {
      id: socket.id,
      username: username || 'Anonymous',
      wallet,
      isHost: false,
      distance: 0,
      pace: 0,
      finished: false,
    }

    race.participants.push(participant)
    socket.join(code)

    io.to(code).emit('participant_joined', { participant, race })
    socket.emit('race_joined', { race })
    console.log(`${username} joined race: ${code}`)
  })

  socket.on('start_race', ({ code }) => {
    const race = races.get(code)

    if (!race || race.host !== socket.id) {
      socket.emit('error', { message: 'Only host can start race' })
      return
    }

    race.status = 'countdown'
    io.to(code).emit('countdown_started')

    // 3-2-1-GO countdown
    let count = 3
    const countdown = setInterval(() => {
      io.to(code).emit('countdown_tick', { count })
      count--

      if (count < 0) {
        clearInterval(countdown)
        race.status = 'active'
        race.startTime = Date.now()
        io.to(code).emit('race_started', { startTime: race.startTime })
        console.log(`Race ${code} started`)
      }
    }, 1000)
  })

  socket.on('update_progress', async ({ code, distance, pace }) => {
    const race = races.get(code)

    if (!race || race.status !== 'active') return

    const participant = race.participants.find((p) => p.id === socket.id)
    if (!participant) return

    participant.distance = distance
    participant.pace = pace

    // Check if finished
    if (distance >= race.targetDistance && !participant.finished) {
      participant.finished = true
      participant.finishTime = Date.now() - race.startTime
      io.to(code).emit('participant_finished', {
        participant,
        position: race.participants.filter((p) => p.finished).length,
      })
    }

    // Broadcast updated leaderboard
    const leaderboard = race.participants
      .map((p) => ({
        username: p.username,
        distance: p.distance,
        pace: p.pace,
        progress: (p.distance / race.targetDistance) * 100,
        finished: p.finished,
      }))
      .sort((a, b) => b.distance - a.distance)

    io.to(code).emit('leaderboard_update', { leaderboard })

    // Check if all finished
    if (race.participants.every((p) => p.finished)) {
      race.status = 'finished'
      const results = race.participants.filter((p) => p.finished).sort((a, b) => a.finishTime - b.finishTime)
      io.to(code).emit('race_finished', { results })
      
      // Save race to database
      await saveRaceToDatabase(race)
    }
  })

  socket.on('leave_race', ({ code }) => {
    const race = races.get(code)
    if (!race) return

    race.participants = race.participants.filter((p) => p.id !== socket.id)
    socket.leave(code)

    if (race.participants.length === 0) {
      races.delete(code)
      console.log(`Race ${code} deleted (no participants)`)
    } else {
      io.to(code).emit('participant_left', { socketId: socket.id, race })
    }
  })

  socket.on('end_race', async ({ code }) => {
    const race = races.get(code)
    if (!race) return

    race.status = 'finished'
    const results = race.participants.sort((a, b) => {
      // Finished participants come first
      if (a.finished && !b.finished) return -1
      if (!a.finished && b.finished) return 1
      // Among finished, sort by finish time
      if (a.finished && b.finished) return a.finishTime - b.finishTime
      // Among unfinished, sort by distance
      return b.distance - a.distance
    })

    io.to(code).emit('race_finished', { results })
    
    // Save race to database
    await saveRaceToDatabase(race)
    
    console.log(`Race ${code} ended manually`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)

    // Remove from all races
    races.forEach((race, code) => {
      const participant = race.participants.find((p) => p.id === socket.id)
      if (participant) {
        race.participants = race.participants.filter((p) => p.id !== socket.id)

        if (race.participants.length === 0) {
          races.delete(code)
        } else {
          io.to(code).emit('participant_left', { socketId: socket.id, race })
        }
      }
    })

    // Remove from all relays
    relays.forEach((relay, code) => {
      relay.teams.forEach((team) => {
        const memberIndex = team.members.findIndex((m) => m.id === socket.id)
        if (memberIndex !== -1) {
          team.members.splice(memberIndex, 1)
          io.to(code).emit('relay_updated', { relay })
        }
      })
    })
  })

  // ============ RELAY RACE HANDLERS ============

  socket.on('create_relay', ({ distancePerLeg, legsPerTeam, numTeams, username, wallet }) => {
    const code = generateRaceCode()
    
    // Create teams
    const teamCount = parseInt(numTeams) || Math.min(4, legsPerTeam)
    const teamNames = ['ALPHA', 'BETA', 'GAMMA', 'DELTA']
    const teamColors = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b']
    
    const teams = []
    for (let i = 0; i < teamCount; i++) {
      teams.push({
        id: `team-${i + 1}`,
        name: teamNames[i],
        color: teamColors[i],
        members: [],
        currentLeg: 1,
        totalDistance: 0,
        finished: false,
        finishTime: null,
      })
    }
    
    const relay = {
      code,
      host: wallet,
      distancePerLeg: parseFloat(distancePerLeg),
      legsPerTeam: parseInt(legsPerTeam),
      numTeams: teamCount,
      teams,
      status: 'lobby',
      startTime: null,
    }
    
    relays.set(code, relay)
    socket.join(code)
    socket.emit('relay_created', { code, relay })
    console.log(`Relay created: ${code} (${teamCount} teams, ${legsPerTeam} legs, ${distancePerLeg}km each)`)
  })

  socket.on('fetch_relay', ({ code }) => {
    const relay = relays.get(code)
    
    if (!relay) {
      socket.emit('error', { message: 'Relay not found' })
      return
    }
    
    socket.emit('relay_fetched', { relay })
  })

  socket.on('join_relay', ({ code, teamId, legOrder, username, wallet }) => {
    const relay = relays.get(code)
    
    if (!relay) {
      socket.emit('error', { message: 'Relay not found' })
      return
    }
    
    if (relay.status !== 'lobby') {
      socket.emit('error', { message: 'Relay already started' })
      return
    }
    
    const team = relay.teams.find((t) => t.id === teamId)
    
    if (!team) {
      socket.emit('error', { message: 'Team not found' })
      return
    }
    
    // Check if leg is already taken
    const legTaken = team.members.some((m) => m.legOrder === legOrder)
    if (legTaken) {
      socket.emit('error', { message: 'Leg already taken' })
      return
    }
    
    // Check if team is full
    if (team.members.length >= relay.legsPerTeam) {
      socket.emit('error', { message: 'Team is full' })
      return
    }
    
    const member = {
      id: socket.id,
      username: username || 'Anonymous',
      wallet,
      legOrder,
      distance: 0,
      completed: false,
      finishTime: null,
    }
    
    team.members.push(member)
    team.members.sort((a, b) => a.legOrder - b.legOrder)
    
    socket.join(code)
    socket.emit('relay_joined', { relay })
    io.to(code).emit('relay_updated', { relay })
    console.log(`${username} joined relay ${code} - Team ${team.name}, Leg ${legOrder}`)
  })

  socket.on('start_relay', ({ code }) => {
    const relay = relays.get(code)
    
    if (!relay) {
      socket.emit('error', { message: 'Relay not found' })
      return
    }
    
    // Check if all teams have at least one member
    const allTeamsReady = relay.teams.every((t) => t.members.length > 0)
    if (!allTeamsReady) {
      socket.emit('error', { message: 'All teams need at least one member' })
      return
    }
    
    relay.status = 'countdown'
    io.to(code).emit('countdown_started')
    
    // 3-2-1-GO countdown
    let count = 3
    const countdown = setInterval(() => {
      io.to(code).emit('countdown_tick', { count })
      count--
      
      if (count < 0) {
        clearInterval(countdown)
        relay.status = 'active'
        relay.startTime = Date.now()
        io.to(code).emit('relay_started', { startTime: relay.startTime })
        console.log(`Relay ${code} started`)
      }
    }, 1000)
  })

  socket.on('update_relay_progress', ({ code, distance }) => {
    const relay = relays.get(code)
    
    if (!relay || relay.status !== 'active') return
    
    // Find member's team and update distance
    for (const team of relay.teams) {
      const member = team.members.find((m) => m.id === socket.id)
      if (member && member.legOrder === team.currentLeg && !member.completed) {
        member.distance = distance
        
        // Calculate team total distance
        team.totalDistance = team.members
          .filter((m) => m.completed)
          .reduce((sum) => sum + relay.distancePerLeg, 0) + distance
        
        io.to(code).emit('relay_updated', { relay })
        break
      }
    }
  })

  socket.on('complete_leg', ({ code }) => {
    const relay = relays.get(code)
    
    if (!relay) return
    
    // Find member's team
    for (const team of relay.teams) {
      const member = team.members.find((m) => m.id === socket.id)
      if (member && member.legOrder === team.currentLeg && !member.completed) {
        // Mark leg as completed
        member.completed = true
        member.finishTime = Date.now() - relay.startTime
        member.distance = relay.distancePerLeg
        
        // Update team total distance
        team.totalDistance = team.members
          .filter((m) => m.completed)
          .reduce((sum) => sum + relay.distancePerLeg, 0)
        
        // Check if team finished
        if (team.currentLeg >= relay.legsPerTeam) {
          team.finished = true
          team.finishTime = Date.now() - relay.startTime
          console.log(`Team ${team.name} finished relay ${code}!`)
        } else {
          // Pass baton to next leg
          team.currentLeg++
          io.to(code).emit('baton_passed', { team, leg: team.currentLeg })
          console.log(`Baton passed to leg ${team.currentLeg} in team ${team.name}`)
        }
        
        io.to(code).emit('relay_updated', { relay })
        
        // Check if all teams finished
        const allFinished = relay.teams.every((t) => t.finished)
        if (allFinished) {
          relay.status = 'finished'
          
          // Sort teams by finish time
          const results = relay.teams
            .filter((t) => t.finished)
            .sort((a, b) => a.finishTime - b.finishTime)
          
          io.to(code).emit('relay_finished', { results })
          console.log(`Relay ${code} finished!`)
        }
        
        break
      }
    }
  })

  socket.on('leave_relay', ({ code }) => {
    const relay = relays.get(code)
    if (!relay) return
    
    // Remove member from team
    for (const team of relay.teams) {
      const memberIndex = team.members.findIndex((m) => m.id === socket.id)
      if (memberIndex !== -1) {
        team.members.splice(memberIndex, 1)
        break
      }
    }
    
    socket.leave(code)
    io.to(code).emit('relay_updated', { relay })
  })
})

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
