// news-script.js

const NEWS_PER_LOAD = 10; 
let currentItemIndex = 0; 
let allNewsData = []; 
let isLoading = false; 

// 🚨 【重要】データ生成リポジトリのURLを設定する
// 💡 [ユーザー名]と[リポジトリ名]を実際に作ったものに書き換えてね！
const DATA_URL = 'https://raw.githubusercontent.com/[ユーザー名]/[リポジトリ名]/main/data.json'; 


// 記事データをHTMLに追加する関数
function appendArticles(articles) {
    const newsContainer = document.getElementById('news-container');
    
    // 記事リストのコンテナがなければ作成
    if (!document.getElementById('article-list')) {
        const ul = document.createElement('ul');
        ul.id = 'article-list';
        newsContainer.appendChild(ul);
    }
    const ul = document.getElementById('article-list');

    articles.forEach(item => {
        const li = document.createElement('li');
        li.className = 'article-item';
        
        // 要約がある場合はsummary、ない場合は「まだ要約されていません」をセット
        const summaryHtml = item.summary 
            ? `<div class="summary">${item.summary}</div>` 
            : `<div class="summary">ごめん、この内容はまだAI要約されていません。</div>`;
        
        li.innerHTML = `
            <a href="${item.link}" target="_blank" class="article-link">${item.title}</a>
            <span class="article-date">${item.pubDate} - ${item.source}</span>
            <button class="kame-button" data-status="${item.summary ? 'has-summary' : 'no-summary'}">
                ${item.summary ? '🐢 要約を表示/非表示' : '❌ 要約待ち'}
            </button>
            <div id="summary-${btoa(item.link).replace(/=/g, '')}" class="summary-box hidden">
                ${summaryHtml}
            </div>
        `;
        
        // 🐢 ボタンにイベントリスナーを設定
        li.querySelector('.kame-button').addEventListener('click', (e) => {
            const button = e.target;
            const summaryBox = button.nextElementSibling; // 次の要素がsummary-box
            
            // 要約データがない場合は何もしない
            if (button.getAttribute('data-status') === 'no-summary') {
                alert('要約データは次の自動更新を待ってね！');
                return;
            }

            // 要約の表示・非表示を切り替える
            summaryBox.classList.toggle('hidden');
        });
        
        ul.appendChild(li);
    });
}

// 🚀 次のブロックの記事をロードする関数 (無限スクロールのトリガー)
function loadMoreArticles() {
    if (isLoading || currentItemIndex >= allNewsData.length) return; 

    isLoading = true; 
    document.getElementById('status-message').textContent = '記事を追加読み込み中...';

    const nextBatch = allNewsData.slice(
        currentItemIndex, 
        currentItemIndex + NEWS_PER_LOAD
    );
    
    // サーバー通信の「遅延」をシミュレート
    setTimeout(() => {
        appendArticles(nextBatch);
        currentItemIndex += NEWS_PER_LOAD;
        isLoading = false; 
        document.getElementById('status-message').textContent = `全 ${allNewsData.length} 件の記事をロード済み。`;
        
        // 記事の追加後、まだ画面の下部に隙間がある場合は、もう一度ロードを試みる
        if (currentItemIndex < allNewsData.length && 
            document.documentElement.scrollHeight <= window.innerHeight + 50) {
            loadMoreArticles();
        }
    }, 500); 
}

// 🔍 スクロール監視のイベントリスナー
window.addEventListener('scroll', () => {
    // ページの底から100px以内になったら次の記事をロード
    const isNearBottom = (document.documentElement.scrollHeight - window.scrollY) < (window.innerHeight + 100);
    if (isNearBottom) {
        loadMoreArticles();
    }
});

// 🌐 記事データを外部JSONから取得し、初期化する関数
async function initNewsFeed() {
    try {
        document.getElementById('status-message').textContent = 'AI要約データを外部から取得中...';
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            throw new Error(`データ取得に失敗: ${response.status}`);
        }
        allNewsData = await response.json();
        
        // 日付でソート（データ生成側でやっても良いが、念のため）
        allNewsData.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        
        document.getElementById('status-message').textContent = `全 ${allNewsData.length} 件の記事を準備完了。`;
        loadMoreArticles();
    } catch (error) {
        console.error("データ初期化エラー:", error);
        document.getElementById('status-message').textContent = `🚨 エラー: データの読み込みに失敗しました。URLを確認してね。 (${error.message})`;
    }
}

initNewsFeed();
