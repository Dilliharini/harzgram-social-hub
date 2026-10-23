import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: fileURLToPath(new URL(".env", import.meta.url)) });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  await pool.query(schema);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationDirectory = new URL("./migrations/", import.meta.url);
  const migrations = (await readdir(migrationDirectory))
    .filter((filename) => /^\d+.*\.sql$/.test(filename))
    .sort();

  for (const filename of migrations) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const alreadyApplied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [filename],
      );
      if (alreadyApplied.rowCount === 0) {
        const migration = await readFile(new URL(filename, migrationDirectory), "utf8");
        await client.query(migration);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  console.log("HarzGram database tables are ready.");
} finally {
  await pool.end();
}
