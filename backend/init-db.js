import { pool } from "./db.js";

async function initDatabase() {
  try {
    // Create profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) NOT NULL,
        total_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create workouts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(255) NOT NULL,
        duration INTEGER NOT NULL,
        distance DECIMAL(10, 2) NOT NULL,
        nft_mint_address VARCHAR(255),
        gps_coordinates TEXT,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE
      )
    `);

    // Create races table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS races (
        id SERIAL PRIMARY KEY,
        race_code VARCHAR(10) NOT NULL,
        target_distance DECIMAL(10, 2) NOT NULL,
        winner_wallet VARCHAR(255),
        total_participants INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // Create race_participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS race_participants (
        id SERIAL PRIMARY KEY,
        race_id INTEGER NOT NULL,
        wallet_address VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        distance DECIMAL(10, 2) NOT NULL,
        finish_time INTEGER,
        position INTEGER,
        finished BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
        FOREIGN KEY (wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE
      )
    `);

    // Create leagues table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leagues (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        city VARCHAR(100),
        season VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create league_membership table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS league_membership (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(255) NOT NULL,
        league_id INTEGER NOT NULL,
        season_points INTEGER DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE,
        FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
        UNIQUE(wallet_address, league_id)
      )
    `);

    // Insert default leagues
    await pool.query(`
      INSERT INTO leagues (name, description, city, season)
      VALUES 
        ('Global League', 'Compete with runners worldwide', NULL, 'All-Time'),
        ('City Champions', 'Local runners in your city', 'San Francisco', 'Winter 2026'),
        ('College Circuit', 'University students only', NULL, 'Spring 2026')
      ON CONFLICT (name) DO NOTHING
    `);

    console.log("Database initialized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

initDatabase();
