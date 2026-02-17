import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  host: "ep-orange-dream-aifai135-pooler.c-4.us-east-1.aws.neon.tech",
  database: "neondb",
  user: "neondb_owner",
  password: "npg_xgmIZ1qROcY9",
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});