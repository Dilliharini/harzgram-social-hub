import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: fileURLToPath(new URL(".env", import.meta.url)) });

const { DATABASE_URL, SEED_DEMO_PASSWORD } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (
  !SEED_DEMO_PASSWORD ||
  SEED_DEMO_PASSWORD.length < 8 ||
  SEED_DEMO_PASSWORD.startsWith("replace-with-")
) {
  throw new Error("Set SEED_DEMO_PASSWORD (at least 8 characters) in backend/.env before seeding.");
}
if (Buffer.byteLength(SEED_DEMO_PASSWORD, "utf8") > 72) {
  throw new Error("SEED_DEMO_PASSWORD must be at most 72 bytes.");
}

const users = [
  [
    "maya.chen",
    "Maya Chen",
    "Designer & coffee enthusiast. Sketching my way through Mumbai to Berlin.",
  ],
  ["arjun.mehta", "Arjun Mehta", "Travel photographer chasing light across 34 countries."],
  ["sofia.reyes", "Sofia Reyes", "Home cook sharing one easy recipe a week."],
  ["liam.oconnor", "Liam O'Connor", "Marathoner and coach. 6am club, reluctantly."],
  ["priya.nair", "Priya Nair", "Illustrator and plant parent. New stickers every Friday."],
  ["alex.rivera", "Alex Rivera", "Just here for the dog photos. Learning to post."],
];

const posts = [
  [
    "p1",
    "maya.chen",
    "Sunday reset: flat white, a warm croissant, and absolutely zero notifications.",
  ],
  [
    "p2",
    "liam.oconnor",
    "18km along the river before sunrise. Legs are gone but the head is clear.",
  ],
  [
    "p3",
    "arjun.mehta",
    "Golden hour on the ridge — three hours of climbing for thirty seconds of light like this. Worth it every time.",
  ],
  [
    "p4",
    "sofia.reyes",
    "One-pot lemon garlic pasta tonight. Ten minutes, one dish to wash, zero regrets.",
  ],
  [
    "p5",
    "priya.nair",
    "Finished this tiny mushroom house illustration. He's a toadstool landlord and thriving.",
  ],
  ["p6", "alex.rivera", "Employee of the month hard at work. Biscuit says hi."],
  [
    "p7",
    "maya.chen",
    "Design tip: if it looks crowded, remove something. If it still looks crowded, remove two things.",
  ],
  [
    "p8",
    "sofia.reyes",
    "Night market run complete. Boat noodles, mango sticky rice, and a mystery skewer.",
  ],
];

const comments = [
  ["c1", "p1", "liam.oconnor", "That croissant looks elite."],
  ["c2", "p1", "priya.nair", "Saving this café for my Berlin trip!"],
  ["c3", "p2", "arjun.mehta", "Respect. That's a brutal route."],
  ["c4", "p2", "maya.chen", "Teach me your ways."],
  ["c5", "p3", "maya.chen", "Unreal light."],
  ["c6", "p3", "sofia.reyes", "Adding this trail to my list immediately."],
  ["c7", "p4", "maya.chen", "Made this tonight — 10/10."],
  ["c8", "p5", "sofia.reyes", "The little chimney!"],
  ["c9", "p6", "maya.chen", "I would die for Biscuit."],
  ["c10", "p8", "alex.rivera", "Boat noodles are undefeated."],
];

const follows = [
  ["maya.chen", "arjun.mehta"],
  ["maya.chen", "priya.nair"],
  ["arjun.mehta", "maya.chen"],
  ["arjun.mehta", "liam.oconnor"],
  ["sofia.reyes", "maya.chen"],
  ["sofia.reyes", "priya.nair"],
  ["liam.oconnor", "arjun.mehta"],
  ["liam.oconnor", "maya.chen"],
  ["priya.nair", "sofia.reyes"],
  ["priya.nair", "maya.chen"],
  ["alex.rivera", "maya.chen"],
  ["alex.rivera", "arjun.mehta"],
  ["alex.rivera", "sofia.reyes"],
];

function seedId(number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  const passwordHash = await bcrypt.hash(SEED_DEMO_PASSWORD, 12);
  const userIds = new Map();

  for (const [index, [username, name, bio]] of users.entries()) {
    const result = await client.query(
      `INSERT INTO users (id, username, name, email, password_hash, bio)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (LOWER(username)) DO UPDATE
         SET name = EXCLUDED.name, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
             bio = EXCLUDED.bio
       RETURNING id`,
      [seedId(index + 1), username, name, `${username}@example.test`, passwordHash, bio],
    );
    userIds.set(username, result.rows[0].id);
  }

  const postIds = new Map();
  const now = Date.now();
  for (const [index, [key, username, text]] of posts.entries()) {
    const id = seedId(index + 101);
    postIds.set(key, id);
    await client.query(
      `INSERT INTO posts (id, author_id, text, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
         SET author_id = EXCLUDED.author_id, text = EXCLUDED.text, created_at = EXCLUDED.created_at`,
      [id, userIds.get(username), text, new Date(now - (index + 1) * 45 * 60 * 1000)],
    );
  }

  for (const [index, [key, postKey, username, text]] of comments.entries()) {
    await client.query(
      `INSERT INTO comments (id, post_id, author_id, text, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET post_id = EXCLUDED.post_id, author_id = EXCLUDED.author_id,
             text = EXCLUDED.text, created_at = EXCLUDED.created_at`,
      [
        seedId(index + 201),
        postIds.get(postKey),
        userIds.get(username),
        text,
        new Date(now - (index + 1) * 5 * 60 * 1000),
      ],
    );
  }

  for (const [follower, following] of follows) {
    await client.query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userIds.get(follower), userIds.get(following)],
    );
  }

  await client.query("COMMIT");
  console.log("Demo users, posts, comments, and follows are ready.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
