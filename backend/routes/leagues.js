import express from 'express'
import { pool } from '../db.js'

const router = express.Router()

// Get all leagues
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, 
        (SELECT COUNT(*) FROM league_membership WHERE league_id = l.id) as member_count
       FROM leagues l
       ORDER BY l.id`
    )
    res.json({ leagues: result.rows })
  } catch (error) {
    console.error('Error fetching leagues:', error)
    res.status(500).json({ error: 'Failed to fetch leagues' })
  }
})

// Join a league
router.post('/join', async (req, res) => {
  try {
    const { wallet, leagueId } = req.body

    await pool.query(
      `INSERT INTO league_membership (wallet_address, league_id)
       VALUES ($1, $2)
       ON CONFLICT (wallet_address, league_id) DO NOTHING`,
      [wallet, leagueId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error joining league:', error)
    res.status(500).json({ error: 'Failed to join league' })
  }
})

// Leave a league
router.post('/leave', async (req, res) => {
  try {
    const { wallet, leagueId } = req.body

    await pool.query(
      `DELETE FROM league_membership 
       WHERE wallet_address = $1 AND league_id = $2`,
      [wallet, leagueId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error leaving league:', error)
    res.status(500).json({ error: 'Failed to leave league' })
  }
})

// Get user's leagues
router.get('/user/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params

    const result = await pool.query(
      `SELECT l.*, lm.season_points, lm.joined_at
       FROM leagues l
       JOIN league_membership lm ON l.id = lm.league_id
       WHERE lm.wallet_address = $1
       ORDER BY lm.joined_at DESC`,
      [wallet]
    )

    res.json({ leagues: result.rows })
  } catch (error) {
    console.error('Error fetching user leagues:', error)
    res.status(500).json({ error: 'Failed to fetch user leagues' })
  }
})

// Get league leaderboard
router.get('/:leagueId/leaderboard', async (req, res) => {
  try {
    const { leagueId } = req.params

    const result = await pool.query(
      `SELECT 
        p.username,
        p.wallet_address,
        p.total_points,
        lm.season_points,
        (SELECT COUNT(*) FROM workouts WHERE wallet_address = p.wallet_address) as workout_count,
        (SELECT COUNT(*) FROM race_participants WHERE wallet_address = p.wallet_address AND finished = true) as races_won
       FROM profiles p
       JOIN league_membership lm ON p.wallet_address = lm.wallet_address
       WHERE lm.league_id = $1
       ORDER BY lm.season_points DESC, p.total_points DESC
       LIMIT 100`,
      [leagueId]
    )

    res.json({ leaderboard: result.rows })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

export default router
