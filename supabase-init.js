// ==========================================
// 🚀 Supabase 初期化 ＆ 確実動作ログイン管理
// ==========================================

const SUPABASE_URL = "https://tabwaqezvdukfsqqsjnh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YL0Ieg-7xNmSyPQgxFr7Sw_CNaN173X";

window.supabaseClient = null;
window.currentUser = null;

// 1. Supabaseクライアントを安全に初期化する関数
function initSupabaseClient() {
  if (window.supabaseClient) return true;

  // unpkgやjsdelivrで読み込まれたグローバル変数を探す
  const supabaseLib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
  
  if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
    console.error("❌ エラー: Supabaseのライブラリがまだ読み込まれていません。");
    return false;
  }

  try {
    window.supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabaseの初期化に成功しました！");
    return true;
  } catch (e) {
    console.error("❌ Supabase初期化エラー:", e);
    return false;
  }
}

// 2. クラウドからデータを並列取得して同期する関数
window.syncFromCloud = async function() {
  if (!window.currentUser || !window.supabaseClient) return;

  try {
    const [recipesRes, menusRes, memosRes] = await Promise.all([
      window.supabaseClient.from('recipes').select('*').order('created_at', { ascending: true }),
      window.supabaseClient.from('menus').select('*'),
      window.supabaseClient.from('custom_memos').select('*').order('created_at', { ascending: true }),
      window.supabaseClient.from('categories').select('*').order('created_at', { ascending: true })
    ]);

    if (!recipesRes.error && recipesRes.data) {
      localStorage.setItem('recipeList', JSON.stringify(recipesRes.data));
    }

    if (!menusRes.error && menusRes.data) {
      const weekMenuObj = {};
      menusRes.data.forEach(m => {
        weekMenuObj[m.day_of_week] = { main: m.main, side: m.side, soup: m.soup, extra: m.extra || {} };
      });
      localStorage.setItem('weekMenu', JSON.stringify(weekMenuObj));
    }

    if (!memosRes.error && memosRes.data) {
      localStorage.setItem('customMemos', JSON.stringify(memosRes.data));
    }

    if (!catsRes.error && catsRes.data && catsRes.data.length > 0) {
        const catNames = catsRes.data.map(c => c.name);
        localStorage.setItem('recipeCategories', JSON.stringify(catNames));
    }
    if (typeof window.refreshAllCategoryUI === 'function') {
        window.refreshAllCategoryUI();
    }

    if (typeof refreshSelectOptions === 'function') refreshSelectOptions();
    if (typeof renderRecipeGrid === 'function') renderRecipeGrid();
    if (typeof initCalendar === 'function') initCalendar();
    if (typeof renderShoppingList === 'function') renderShoppingList();
  } catch (e) {
    console.warn("クラウド同期エラー:", e);
  }
};

// 3. 画面読み込み後の認証監視設定（全画面切り替え版）
window.addEventListener('load', () => {
  if (!initSupabaseClient()) return;

  window.supabaseClient.auth.onAuthStateChange((event, session) => {
    const loginScreen = document.getElementById('login-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const emailDisplay = document.getElementById('user-display-email');

    if (session) {
      window.currentUser = session.user;
      // ログイン済み：ログイン画面を隠し、アプリ本体を表示する
      if (loginScreen) loginScreen.style.display = 'none';
      if (appWrapper) appWrapper.style.display = 'flex';
      if (emailDisplay) emailDisplay.innerText = session.user.email;
      
      window.syncFromCloud();
    } else {
      window.currentUser = null;
      // 未ログイン：ログイン画面を表示し、アプリ本体を隠す
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appWrapper) appWrapper.style.display = 'none';
    }
  });
});


// 4. ボタンのクリックイベント（イベント委譲で確実に反応させる）
document.addEventListener('click', async (e) => {
  
  // 🟢 「ログイン / 新規登録」ボタンが押されたとき
  if (e.target && (e.target.id === 'btn-login' || e.target.closest('#btn-login'))) {
    const btnLogin = document.getElementById('btn-login');
    const emailInput = document.getElementById('auth-email');
    const passInput = document.getElementById('auth-password');

    if (!emailInput || !passInput) return showToast("入力欄が見つかりません。");

    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      return showToast("メールアドレスとパスワードを入力してください。");
    }

    // パスワードが6文字未満だとSupabase側でエラーになるため事前チェック
    if (password.length < 6) {
      return showToast("パスワードは6文字以上で入力してください。");
    }

    if (!initSupabaseClient()) {
      return showToast("データベースとの接続準備ができていません。少し待ってからもう一度押すか、URLとAPIキーの設定を確認してください。");
    }

    btnLogin.innerText = "通信中...";
    btnLogin.disabled = true;

    try {
      // まずログインを試す
      const { data: signInData, error: signInError } = await window.supabaseClient.auth.signInWithPassword({ email, password });

      if (signInError) {
        console.log("ログイン失敗詳細:", signInError.message);
        // ユーザーが存在しない、または認証失敗時は新規登録を提案
        if (confirm("ログインできませんでした（未登録またはパスワード違い）。\nこのメールアドレスとパスワードで新しくアカウントを登録しますか？")) {
          const { data: signUpData, error: signUpError } = await window.supabaseClient.auth.signUp({ email, password });
          if (signUpError) {
            showToast("新規登録エラー: " + signUpError.message);
          } else {
            showToast("アカウントを作成しました！\n（※自動ログインされない場合は、もう一度ログインボタンを押してください）");
          }
        }
      } else {
        console.log("ログイン成功！");
      }
    } catch (err) {
      console.error("通信例外エラー:", err);
      showToast("通信エラーが発生しました: " + err.message);
    } finally {
      btnLogin.innerText = "ログイン / 新規登録";
      btnLogin.disabled = false;
    }
  }

  // 「ログアウト」ボタンが押されたとき
  if (e.target && (e.target.id === 'btn-logout' || e.target.closest('#btn-logout'))) {
    if (!initSupabaseClient()) return;
    await window.supabaseClient.auth.signOut();
    localStorage.clear();
    showToast("ログアウトしました。");
    location.reload();
  }

});
