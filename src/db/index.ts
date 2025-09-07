import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Create a pool with explicit credentials
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST!,
  user: process.env.MYSQL_USER!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!,
  port: 3306,
});

// Initialize Drizzle with schema
export const db = drizzle(pool, { schema, mode: "default" });

// Optional: global type
export type DB = typeof db;
