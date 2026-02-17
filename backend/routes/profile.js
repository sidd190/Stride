import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    const result = await pool.query(
      "SELECT * FROM profiles WHERE wallet_address=$1",
      [wallet]
    );
    // Return null if no profile found (not an error)
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { wallet, username } = req.body;

    await pool.query(
      "INSERT INTO profiles(wallet_address, username) VALUES($1,$2)",
      [wallet, username]
    );

    res.json({ success: true, message: "Profile created" });
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

router.delete("/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;

    await pool.query("DELETE FROM profiles WHERE wallet_address=$1", [wallet]);

    res.json({ success: true, message: "Profile deleted" });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ error: "Failed to delete profile" });
  }
});

export default router;
