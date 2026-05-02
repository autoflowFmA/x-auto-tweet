const TOPICS = [
  "ChatGPT vs Gemini vs Claude のAPI料金を徹底比較",
  "無料で使えるAIツールランキング2024年版",
  "GPT-4oとClaude 3.5 Sonnetのコスパ比較",
  "Gemini 1.5 Proが無料枠で使える驚きの事実",
  "AIコーディングツール：GitHub Copilot vs Cursor vs Codeium の料金比較",
  "画像生成AI：Midjourney vs DALL-E 3 vs Stable Diffusion のコスト差",
  "ビジネスで使うAIツールの月額コスト最適化術",
  "Claude APIが実は安い？主要LLMのトークン単価を比較",
  "AIツールを無料で最大限活用する5つの方法",
  "ChatGPT Plusは月20ドルの価値があるか？徹底検証",
  "Perplexity AI vs ChatGPT：検索AIのコスト比較",
  "NotionAI vs Notion単体：AIアドオンは費用対効果があるか",
  "音声AIツール：ElevenLabs vs OpenAI TTS の料金差",
  "企業向けAI導入コスト：クラウドAI vs ローカルLLMを比較",
  "Gemini Advanced（旧Bard）は月2,900円の価値があるか",
];

function getSystemPrompt() {
  return `あなたはAIツールの専門家です。
X（旧Twitter）への投稿文を日本語で1件だけ生成してください。

【厳守事項】
- 文字数：100〜150字（スペース・ハッシュタグをすべて含めた合計）
- 改行は一切使わない。すべて1行で書く
- 末尾に必ずハッシュタグを付ける：#AI #AIツール
- 具体的な数字・金額を必ず1つ以上含める
- 絵文字は1〜2個のみ
- 投稿文のみを出力する（前置き・説明・かぎかっこ不要）`;
}

function getUserPrompt() {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  return `今日のテーマ：「${topic}」\n\nこのテーマでX投稿文を1件生成してください。`;
}

module.exports = { getSystemPrompt, getUserPrompt };
