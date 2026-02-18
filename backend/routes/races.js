import express from 'express'
import { pool } from '../db.js'

const router = express.Router()

// Get user's race history
router.get('/history/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params

    const result = await pool.query(
      `SELECT 
        r.id,
        r.race_code,
        r.target_distance,
        r.total_participants,
        r.completed_at,
        rp.distance,
        rp.finish_time,
        rp.position,
        rp.finished,
        (SELECT username FROM race_participants WHERE race_id = r.id AND position = 1) as winner_name
       FROM races r
       JOIN race_participants rp ON r.id = rp.race_id
       WHERE rp.wallet_address = $1
       ORDER BY r.completed_at DESC
       LIMIT 50`,
      [wallet]
    )

    res.json({ races: result.rows })
  } catch (error) {
    console.error('Error fetching race history:', error)
    res.status(500).json({ error: 'Failed to fetch race history' })
  }
})

// Get race details
router.get('/:raceId', async (req, res) => {
  try {
    const { raceId } = req.params

    const raceResult = await pool.query(
      `SELECT * FROM races WHERE id = $1`,
      [raceId]
    )

    if (raceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Race not found' })
    }

    const participantsResult = await pool.query(
      `SELECT * FROM race_participants WHERE race_id = $1 ORDER BY position`,
      [raceId]
    )

    res.json({
      race: raceResult.rows[0],
      participants: participantsResult.rows,
    })
  } catch (error) {
    console.error('Error fetching race details:', error)
    res.status(500).json({ error: 'Failed to fetch race details' })
  }
})

export default router
