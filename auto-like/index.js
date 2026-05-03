require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { TwitterApi } = require("twitter-api-v2");

const KEYWORDS = ["AI", "ChatGPT", "Claude", "Gemini", "AIツール", "人工知能"];
const MAX_LIKES_PER_RUN = Number(process.env.AUTO_LIKE_MAX_PER_RUN ?? 2);
const MAX_REPOSTS_PER_RUN = Number(process.env.AUTO_REPOST_MAX_PER_RUN ?? 1);
const DRY_RUN = process.env.DRY_RUN === "true";

function createClient() {
  return new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  });
}

function createSearchQuery() {
  const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
  return `("${keyword}") lang:ja -is:retweet -is:reply -has:links`;
}

function shouldRepostNow(date = new Date()) {
  const jstHour = Number(
    new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      hour12: false,
    }).format(date)
  );

  // 3時間おきに最大1件リポストすることで、1日最大8件に抑える。
  return jstHour % 3 === 0;
}

async function getCandidateTweets(client) {
  const query = createSearchQuery();
  console.log(`検索クエリ: ${query}`);

  const paginator = await client.readOnly.v2.search(query, {
    max_results: 10,
    sort_order: "recency",
    "tweet.fields": ["author_id", "created_at", "lang"],
  });

  return paginator.tweets ?? [];
}

async function likeTweet(client, userId, tweet) {
  if (DRY_RUN) {
    console.log(`[DRY_RUN] いいね予定: https://x.com/i/web/status/${tweet.id}`);
    return true;
  }

  await client.readWrite.v2.like(userId, tweet.id);
  console.log(`いいね完了: https://x.com/i/web/status/${tweet.id}`);
  return true;
}

async function repostTweet(client, userId, tweet) {
  if (DRY_RUN) {
    console.log(`[DRY_RUN] リポスト予定: https://x.com/i/web/status/${tweet.id}`);
    return true;
  }

  await client.readWrite.v2.retweet(userId, tweet.id);
  console.log(`リポスト完了: https://x.com/i/web/status/${tweet.id}`);
  return true;
}

async function main() {
  console.log("=== X Auto Like & Repost ===");
  console.log(`実行日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
  console.log(`1回あたり最大いいね数: ${MAX_LIKES_PER_RUN}`);
  console.log(`1回あたり最大リポスト数: ${MAX_REPOSTS_PER_RUN}`);

  const client = createClient();
  const me = await client.readOnly.v2.me();
  const userId = me.data.id;
  console.log(`実行アカウント: @${me.data.username}`);

  const tweets = await getCandidateTweets(client);
  console.log(`候補ツイート数: ${tweets.length}`);

  let likedCount = 0;
  let repostedCount = 0;
  const canRepost = shouldRepostNow();
  console.log(`この実行でリポストするか: ${canRepost ? "はい" : "いいえ"}`);

  for (const tweet of tweets) {
    if (likedCount >= MAX_LIKES_PER_RUN && (!canRepost || repostedCount >= MAX_REPOSTS_PER_RUN)) {
      break;
    }
    if (tweet.author_id === userId) continue;

    try {
      if (likedCount < MAX_LIKES_PER_RUN) {
        const liked = await likeTweet(client, userId, tweet);
        if (liked) likedCount += 1;
      }

      if (canRepost && repostedCount < MAX_REPOSTS_PER_RUN) {
        const reposted = await repostTweet(client, userId, tweet);
        if (reposted) repostedCount += 1;
      }
    } catch (e) {
      const detail = e.data?.detail ?? e.message;
      console.warn(`スキップ: ${tweet.id} (${detail})`);
    }
  }

  console.log(`今回のいいね数: ${likedCount}`);
  console.log(`今回のリポスト数: ${repostedCount}`);
  console.log("完了");
}

main().catch((err) => {
  console.error("\n[ERROR]", err.message);
  if (err.data) {
    console.error("詳細:", JSON.stringify(err.data, null, 2));
  }
  process.exit(1);
});
