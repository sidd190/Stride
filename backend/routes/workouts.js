import express from "express";
import { pool } from "../db.js";

const router = express.Router();

const MIN_DURATION = 600;
const MIN_DISTANCE = 0.5; 

router.post("/", async (req, res) => {
  try {
    const { wallet, duration, distance } = req.body;

    if (!wallet || !duration || distance === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (duration < MIN_DURATION) {
      return res.status(400).json({
        error: `Workout must be at least ${MIN_DURATION / 60} minutes`,
        requirement: "duration",
      });
    }

    if (distance < MIN_DISTANCE) {
      return res.status(400).json({
        error: `Workout must be at least ${MIN_DISTANCE} km`,
        requirement: "distance",
      });
    }

    const points = Math.floor(duration / 60 + distance * 10);

    const result = await pool.query(
      `INSERT INTO workouts(wallet_address, duration, distance, created_at) 
       VALUES($1, $2, $3, NOW()) 
       RETURNING workout_id`,
      [wallet, duration, distance]
    );

    await pool.query(
      `UPDATE profiles 
       SET total_points = COALESCE(total_points, 0) + $1 
       WHERE wallet_address = $2`,
      [points, wallet]
    );

    res.json({
      success: true,
      message: "Workout saved successfully",
      workout: {
        id: result.rows[0].workout_id,
        points: points,
      },
    });
  } catch (error) {
    console.error("Error saving workout:", error);
    res.status(500).json({ error: "Failed to save workout" });
  }
});

router.get("/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    const result = await pool.query(
      `SELECT 
        workout_id as id, 
        duration, 
        distance, 
        created_at as completed_at,
        FLOOR(duration / 60 + distance * 10) as points
       FROM workouts 
       WHERE wallet_address = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [wallet]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching workouts:", error);
    res.status(500).json({ error: "Failed to fetch workouts" });
  }
});

export default router;
