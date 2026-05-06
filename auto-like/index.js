require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { TwitterApi } = require("twitter-api-v2");

const SEARCH_QUERY =
  '(("AIツール" OR "ChatGPT" OR "Claude" OR "Gemini" OR "AI副業") ("コスト比較" OR "料金比較" OR "費用対効果" OR "月額" OR "API料金" OR "比較" OR "コスト" OR "稼ぐ" OR "収益" OR "案件" OR "自動化")) lang:ja -is:retweet -is:reply -has:links';
const RELEVANT_PATTERNS = [
  /AIツール/i,
  /ChatGPT/i,
  /Claude/i,
  /Gemini/i,
  /AI副業/i,
  /生成AI/i,
  /LLM/i,
  /プロンプト/i,
];
const REPOST_TOOL_PATTERNS = [
  /AIツール/i,
  /ChatGPT/i,
  /Claude/i,
  /Gemini/i,
  /AI副業/i,
];
const REPOST_CONTEXT_PATTERNS = [
  /コスト比較/i,
  /コスト/i,
  /料金比較/i,
  /料金/i,
  /価格/i,
  /費用対効果/i,
  /費用/i,
  /月額/i,
  /API料金/i,
  /比較/i,
];
const REPOST_SIDE_BUSINESS_PATTERNS = [
  /AI副業.*(稼|収益|案件|副収入|ツール|自動化|ChatGPT|Claude|Gemini|作業|効率)/i,
  /(稼|収益|案件|副収入|ツール|自動化|ChatGPT|Claude|Gemini|作業|効率).*AI副業/i,
];
const EXCLUDED_PATTERNS = [
  /占い/,
  /星座/,
  /恋愛/,
  /出会い/,
  /アダルト/,
  /懸賞/,
  /プレゼント企画/,
  /Giveaway/i,
];
const MAX_LIKES_PER_RUN = Number(process.env.AUTO_LIKE_MAX_PER_RUN ?? 2);
const MAX_REPOSTS_PER_RUN = Number(process.env.AUTO_REPOST_MAX_PER_RUN ?? 1);
const DRY_RUN = process.env.DRY_RUN === "true";
const FORCE_REPOST = process.env.AUTO_REPOST_FORCE === "true";

function createClient() {
  return new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  });
}

function createSearchQuery() {
  return SEARCH_QUERY;
}

function shouldRepostNow(date = new Date()) {
  if (FORCE_REPOST) return true;

  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((part) => part.type === "hour")?.value ?? "0";
  const jstHour = Number(hourPart);
  console.log(`JST時: ${jstHour}`);

  // GitHub Actionsが1時間おきに起動するため、毎回リポストを1件試行する。
  return true;
}

function isRelevantTweet(tweet) {
  const text = tweet.text ?? "";
  const hasRelevantKeyword = RELEVANT_PATTERNS.some((pattern) => pattern.test(text));
  const hasExcludedKeyword = EXCLUDED_PATTERNS.some((pattern) => pattern.test(text));

  return hasRelevantKeyword && !hasExcludedKeyword;
}

function isRepostEligibleTweet(tweet) {
  const text = tweet.text ?? "";
  const hasToolKeyword = REPOST_TOOL_PATTERNS.some((pattern) => pattern.test(text));
  const hasContextKeyword = REPOST_CONTEXT_PATTERNS.some((pattern) => pattern.test(text));
  const hasSideBusinessContext = REPOST_SIDE_BUSINESS_PATTERNS.some((pattern) => pattern.test(text));
  const hasExcludedKeyword = EXCLUDED_PATTERNS.some((pattern) => pattern.test(text));

  return !hasExcludedKeyword && ((hasToolKeyword && hasContextKeyword) || hasSideBusinessContext);
}

async function getCandidateTweets(client) {
  const query = createSearchQuery();
  console.log(`検索クエリ: ${query}`);

  const paginator = await client.readOnly.v2.search(query, {
    max_results: 20,
    sort_order: "recency",
    "tweet.fields": ["author_id", "created_at", "lang", "text"],
  });

  return (paginator.tweets ?? []).filter((tweet) => {
    const relevant = isRelevantTweet(tweet);
    if (!relevant) {
      console.log(`除外: ${tweet.id} (${tweet.text?.slice(0, 60) ?? "本文なし"}...)`);
    }
    return relevant;
  });
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
  const preview = (tweet.text ?? "").replace(/\s+/g, " ").slice(0, 100);
  if (DRY_RUN) {
    console.log(`[DRY_RUN] リポスト予定: https://x.com/i/web/status/${tweet.id} (${preview}...)`);
    return true;
  }

  await client.readWrite.v2.retweet(userId, tweet.id);
  console.log(`リポスト完了: https://x.com/i/web/status/${tweet.id} (${preview}...)`);
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

    if (canRepost && repostedCount < MAX_REPOSTS_PER_RUN) {
      if (!isRepostEligibleTweet(tweet)) {
        console.log(`リポスト対象外: ${tweet.id} (${tweet.text?.slice(0, 60) ?? "本文なし"}...)`);
      } else {
        try {
          const reposted = await repostTweet(client, userId, tweet);
          if (reposted) repostedCount += 1;
        } catch (e) {
          const detail = e.data?.detail ?? e.message;
          console.warn(`リポストをスキップ: ${tweet.id} (${detail})`);
        }
      }
    }

    if (likedCount < MAX_LIKES_PER_RUN) {
      try {
        const liked = await likeTweet(client, userId, tweet);
        if (liked) likedCount += 1;
      } catch (e) {
        const detail = e.data?.detail ?? e.message;
        console.warn(`いいねをスキップ: ${tweet.id} (${detail})`);
      }
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
