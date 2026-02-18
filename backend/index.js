import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profile.js'
import workoutRoutes from './routes/workouts.js'
import racesRoutes from './routes/races.js'
import { pool } from './db.js'

dotenv.config()

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

// Race management
const races = new Map() // raceCode -> race data

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

    // Insert participant records
    for (let i = 0; i < race.participants.length; i++) {
      const p = race.participants[i]
      await pool.query(
        `INSERT INTO race_participants (race_id, wallet_address, username, distance, finish_time, position, finished)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [raceId, p.wallet, p.username, p.distance, p.finishTime || null, i + 1, p.finished]
      )
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
  })
})

httpServer.listen(3000, () => console.log('Backend running on port 3000'))
