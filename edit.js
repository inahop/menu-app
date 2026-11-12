// ==========================================
// 📝 レシピの編集・修正機能
// ==========================================

// 一覧画面の「編集」ボタンが押された時に実行される関数
window.startEditRecipe = function(recipeTitle) {
  const list = JSON.parse(localStorage.getItem('recipeList')) || [];
  const recipe = list.find(item => item.title === recipeTitle);
  
  if (!recipe) return;

  // レシピの各データを、登録フォーム（ページ①）の入力欄にセットする
  document.getElementById('in-title').value = recipe.title;
  document.getElementById('in-cat').value = recipe.cat;
  document.getElementById('in-ing').value = recipe.ing;
  document.getElementById('in-prep').value = recipe.prep || '';
  document.getElementById('in-steps').value = recipe.steps;
  
  // メモ欄（in-notes）のデータも呼び出す
  const notesInput = document.getElementById('in-notes');
  if (notesInput) {
    notesInput.value = recipe.notes || '';
  }

  // 自動的に「レシピ登録」のタブ画面に切り替える（疑似クリック）
  const registerTab = document.querySelector('.tab-btn[data-target="page-register"]');
  if (registerTab) {
    registerTab.click();
  }

  // ユーザーへの案内
  showToast(`レシピを登録画面に呼び出しました`);
};
