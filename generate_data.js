// generate_data.js

// 必要な外部ライブラリを読み込む
const { GoogleGenAI } = require('@google/genai');
const fetch = require('node-fetch');
const fs = require('fs');
const cheerio = require('cheerio'); // HTMLから本文を抽出するためのライブラリ

// ----------------------------------------------------
// 💡 設定
// ----------------------------------------------------
// APIキーはGitHub Secretsから自動的に読み込まれる
const apiKey = process.env.GEMINI_API_KEY; 
if (!apiKey) {
    console.error("🚨 エラー: GEMINI_API_KEYが環境変数に設定されていません。");
    process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

// ----------------------------------------------------
// 📰 テスト用の記事データ
// ----------------------------------------------------
// ⚠️ 実際には、RSSフィードからこれらのリンクとタイトルを取得する必要があるよ
const TEST_ARTICLES = [
    { 
        title: '嘉手納基地、F-15退役後の新たな動向と訓練予定', 
        link: 'https://www.example.com/kadena-article-1', 
        source: '防衛局発表',
        pubDate: new Date(Date.now() - 3600000).toISOString() // 1時間前
    },
    { 
        title: '沖縄市周辺自治体、騒音問題への対応強化を表明', 
        link: 'https://www.example.com/okinawa-city-noise', 
        source: '地元メディア',
        pubDate: new Date(Date.now() - 86400000).toISOString() // 1日前
    },
    { 
        title: '米軍普天間基地、新型輸送機の試験飛行を実施', 
        link: 'https://www.example.com/futenma-test-flight', 
        source: '速報ニュース',
        pubDate: new Date(Date.now() - 172800000).toISOString() // 2日前
    },
];

// ----------------------------------------------------
// 🛠️ 関数
// ----------------------------------------------------

/**
 * 記事のURLから本文テキストを取得する関数
 * ⚠️ これはデモ用。実際のニュースサイトの構造に合わせて修正が必要！
 */
async function fetchArticleBody(url) {
    try {
        const response = await fetch(url);
        // 400番台や500番台のエラーならnullを返す
        if (!response.ok) {
            console.warn(`⚠️ 記事本文の取得失敗（${response.status}）：${url}`);
            return null;
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // 💡 <body>タグの中のテキストを全部取得し、スペースや改行を整形
        let bodyText = $('body').text();
        bodyText = bodyText.replace(/\s+/g, ' ').trim(); 
        
        // 長すぎる場合は5000文字で切り詰める (APIトークン節約のため)
        return bodyText.substring(0, 5000); 
    } catch (error) {
        console.error(`🚨 例外エラーで記事本文の取得失敗: ${url}`, error.message);
        return null;
    }
}

/**
 * Gemini APIを使って記事を要約する関数
 */
async function summarizeArticle(title, body) {
    const prompt = `あなたは、日本のローカルニュースの専門家AIです。次のニュース記事の本文を読み、**3行以内**で、日本の読者向けに簡潔かつ中立的なトーンで要約してください。
    
    タイトル: ${title}
    
    本文:
    ---
    ${body}
    ---
    要約（3行以内）：`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: prompt,
        });
        
        // 結果テキストを整形して返す
        return response.text.trim();
    } catch (error) {
        console.error("🚨 Gemini APIでの要約失敗:", error.message);
        return null;
    }
}


// ----------------------------------------------------
// 🚀 メイン処理
// ----------------------------------------------------
async function main() {
    console.log("--- AIニュースデータ生成を開始します ---");
    let allArticles = [];

    for (const item of TEST_ARTICLES) {
        console.log(`\n▶️ 記事処理開始: ${item.title}`);
        
        // 1. 記事本文を取得
        const body = await fetchArticleBody(item.link);
        
        let summary = null;
        if (body && body.length > 50) { // 記事本文が短すぎる場合は要約しない
            // 2. 記事本文があればGeminiで要約
            summary = await summarizeArticle(item.title, body);
        } else {
            console.log("記事本文が見つからないか短すぎるため、要約をスキップします。");
        }
        
        // 3. 結果をJSONに追加
        allArticles.push({
            title: item.title,
            link: item.link,
            pubDate: new Date(item.pubDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            source: item.source, 
            // 要約が成功したらそれを使う、失敗したらエラーメッセージを格納
            summary: summary || 'AI要約生成に失敗しました。',
        });
        
        console.log("✅ 処理完了。");
    }

    // 4. data.jsonに書き出し
    try {
        fs.writeFileSync('data.json', JSON.stringify(allArticles, null, 2));
        console.log(`\n🎉 成功: data.jsonに全 ${allArticles.length} 件の記事を書き込みました。`);
    } catch (e) {
        console.error("🚨 data.jsonの書き出しに失敗:", e.message);
    }
}

main().catch(console.error);
