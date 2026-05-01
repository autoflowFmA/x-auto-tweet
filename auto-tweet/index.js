require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");
const { getSystemPrompt, getUserPrompt } = require("./prompt");

const TWEET_MIN = 200;
const TWEET_MAX = 280;

async function generateTweet() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: getSystemPrompt(),
  });

  const MAX_RETRIES = 3;
  for (let i = 1; i <= MAX_RETRIES; i++) {
    const result = await model.generateContent(getUserPrompt());
    const text = result.response.text().trim();

    if (text.length >= TWEET_MIN && text.length <= TWEET_MAX) {
      return text;
    }
    console.log(`  リトライ ${i}/${MAX_RETRIES}：${text.length}字（範囲外）`);
  }

  throw new Error(`${MAX_RETRIES}回試みましたが、適切な文字数のツイートを生成できませんでした`);
}

async function postTweet(text) {
  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  });

  // 改行をスペースに変換（X Free APIの制限対応）
  const singleLine = text.replace(/\n+/g, " ").trim();

  const rwClient = client.readWrite;
  const response = await rwClient.v2.tweet(singleLine);
  return response.data.id;
}

async function main() {
  console.log("=== X Auto Tweet ===");
  console.log(`実行日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);

  console.log("\n[1/2] Gemini APIでツイートを生成中...");
  const tweet = await generateTweet();
  console.log("\n--- 生成されたツイート ---");
  console.log(tweet);
  console.log(`\n文字数: ${tweet.length}字`);

  console.log("\n[2/2] X（Twitter）に投稿中...");
  let tweetId;
  try {
    tweetId = await postTweet(tweet);
  } catch (e) {
    console.error("\n投稿エラー詳細:", JSON.stringify(e.data ?? e.message, null, 2));
    throw e;
  }
  console.log(`\n投稿完了！ Tweet ID: ${tweetId}`);
  console.log(`URL: https://x.com/i/web/status/${tweetId}`);
}

main().catch((err) => {
  console.error("\n[ERROR]", err.message);
  process.exit(1);
});
