import cafeImg from "@/assets/post-cafe.jpg";
import dogImg from "@/assets/post-dog.jpg";
import hikeImg from "@/assets/post-hike.jpg";
import marketImg from "@/assets/post-market.jpg";

/**
 * Realistic sample data used by the mock backend (src/services/mock-backend.ts).
 * Timestamps are stored as "minutes ago" so the feed always looks fresh.
 */

export interface SeedUser {
  username: string;
  name: string;
  bio: string;
  baseFollowerCount: number;
  baseFollowingCount: number;
  joinedDaysAgo: number;
}

export interface SeedPost {
  id: string;
  author: string;
  minutesAgo: number;
  text: string;
  image?: string;
  likeCount: number;
}

export interface SeedComment {
  id: string;
  postId: string;
  author: string;
  minutesAgo: number;
  text: string;
}

export const seedUsers: SeedUser[] = [
  {
    username: "maya.chen",
    name: "Maya Chen",
    bio: "Designer & coffee enthusiast ☕ Sketching my way through Mumbai → Berlin.",
    baseFollowerCount: 1240,
    baseFollowingCount: 182,
    joinedDaysAgo: 412,
  },
  {
    username: "arjun.mehta",
    name: "Arjun Mehta",
    bio: "Travel photographer 📷 Chasing light across 34 countries. Prints in bio.",
    baseFollowerCount: 4830,
    baseFollowingCount: 310,
    joinedDaysAgo: 690,
  },
  {
    username: "sofia.reyes",
    name: "Sofia Reyes",
    bio: "Home cook sharing one easy recipe a week 🍳 Weeknight food only.",
    baseFollowerCount: 2160,
    baseFollowingCount: 451,
    joinedDaysAgo: 520,
  },
  {
    username: "liam.oconnor",
    name: "Liam O'Connor",
    bio: "Marathoner. Coach. Probably out on a run right now 🏃 6am club, reluctantly.",
    baseFollowerCount: 892,
    baseFollowingCount: 203,
    joinedDaysAgo: 298,
  },
  {
    username: "priya.nair",
    name: "Priya Nair",
    bio: "Illustrator & plant parent 🌿 New stickers every Friday.",
    baseFollowerCount: 1560,
    baseFollowingCount: 267,
    joinedDaysAgo: 365,
  },
  {
    username: "alex.rivera",
    name: "Alex Rivera",
    bio: "Just here for the dog photos 🐶 Recovering lurker, learning to post.",
    baseFollowerCount: 214,
    baseFollowingCount: 186,
    joinedDaysAgo: 120,
  },
];

/** [follower, who they follow] */
export const seedFollows: [string, string][] = [
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

export const seedPosts: SeedPost[] = [
  {
    id: "p1",
    author: "maya.chen",
    minutesAgo: 45,
    text: "Sunday reset: flat white, a warm croissant, and absolutely zero notifications. ☕✨",
    image: cafeImg,
    likeCount: 214,
  },
  {
    id: "p2",
    author: "liam.oconnor",
    minutesAgo: 120,
    text: "18km along the river before sunrise. Legs are gone but the head is clear. 🏃‍♂️",
    likeCount: 87,
  },
  {
    id: "p3",
    author: "arjun.mehta",
    minutesAgo: 185,
    text: "Golden hour on the ridge — three hours of climbing for thirty seconds of light like this. Worth it every time. 📷",
    image: hikeImg,
    likeCount: 356,
  },
  {
    id: "p4",
    author: "sofia.reyes",
    minutesAgo: 300,
    text: "One-pot lemon garlic pasta tonight. Ten minutes, one dish to wash, zero regrets. Recipe in the comments if anyone wants it! 🍋",
    likeCount: 129,
  },
  {
    id: "p5",
    author: "priya.nair",
    minutesAgo: 420,
    text: "Finished this tiny mushroom house illustration. He's a toadstool landlord and honestly? Thriving. 🍄",
    likeCount: 98,
  },
  {
    id: "p6",
    author: "alex.rivera",
    minutesAgo: 540,
    text: "Employee of the month hard at work. Biscuit says hi. 🐶",
    image: dogImg,
    likeCount: 421,
  },
  {
    id: "p7",
    author: "maya.chen",
    minutesAgo: 1380,
    text: "Design tip: if it looks crowded, remove something. If it still looks crowded, remove two things.",
    likeCount: 76,
  },
  {
    id: "p8",
    author: "sofia.reyes",
    minutesAgo: 1500,
    text: "Night market run complete. Boat noodles, mango sticky rice, and a mystery skewer I'm choosing not to question. 🍢",
    image: marketImg,
    likeCount: 168,
  },
];

export const seedComments: SeedComment[] = [
  { id: "c1", postId: "p1", author: "liam.oconnor", minutesAgo: 40, text: "That croissant looks elite 😍" },
  { id: "c2", postId: "p1", author: "priya.nair", minutesAgo: 25, text: "Saving this café for my Berlin trip!" },
  { id: "c3", postId: "p2", author: "arjun.mehta", minutesAgo: 100, text: "Respect. That's a brutal route 💪" },
  { id: "c4", postId: "p2", author: "maya.chen", minutesAgo: 80, text: "Teach me your ways 🙏" },
  { id: "c5", postId: "p3", author: "maya.chen", minutesAgo: 170, text: "Unreal light 😮🔍" },
  { id: "c6", postId: "p3", author: "sofia.reyes", minutesAgo: 150, text: "Adding this trail to my list immediately" },
  { id: "c7", postId: "p3", author: "alex.rivera", minutesAgo: 120, text: "Which trail is this? Asking for my camera roll" },
  { id: "c8", postId: "p4", author: "maya.chen", minutesAgo: 260, text: "Made this tonight — 10/10" },
  { id: "c9", postId: "p4", author: "priya.nair", minutesAgo: 240, text: "One-pot gang 🙌" },
  { id: "c10", postId: "p4", author: "liam.oconnor", minutesAgo: 200, text: "Carbs earned. I'll allow it." },
  { id: "c11", postId: "p5", author: "sofia.reyes", minutesAgo: 380, text: "The little chimney 😭💕" },
  { id: "c12", postId: "p5", author: "maya.chen", minutesAgo: 350, text: "Your colors are always so warm" },
  { id: "c13", postId: "p6", author: "maya.chen", minutesAgo: 500, text: "I would die for Biscuit" },
  { id: "c14", postId: "p6", author: "liam.oconnor", minutesAgo: 480, text: "Employee of the month, no contest" },
  { id: "c15", postId: "p6", author: "arjun.mehta", minutesAgo: 450, text: "Those ears!! 🐕" },
  { id: "c16", postId: "p7", author: "priya.nair", minutesAgo: 1300, text: "Stealing this for my deck review" },
  { id: "c17", postId: "p7", author: "arjun.mehta", minutesAgo: 1250, text: "+1, brutal but true" },
  { id: "c18", postId: "p8", author: "alex.rivera", minutesAgo: 1400, text: "Boat noodles are undefeated" },
  { id: "c19", postId: "p8", author: "liam.oconnor", minutesAgo: 1350, text: "Adding this to the food tour itinerary" },
];
