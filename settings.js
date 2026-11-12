// ==========================================
// ⚙️ 設定画面 ＆ カテゴリー動的管理（並び替え対応）
// ==========================================

const DEFAULT_CATEGORIES = ['主菜', '副菜', '汁物'];

// 現在のカテゴリー一覧を取得する共通関数
window.getCategories = function() {
  const saved = JSON.parse(localStorage.getItem('recipeCategories'));
  return (saved && saved.length > 0) ? saved : [...DEFAULT_CATEGORIES];
};

// カテゴリーが変更されたとき、アプリ全体のUIを一括更新する
window.refreshAllCategoryUI = function() {
  const categories = window.getCategories();

  // 1. 「レシピ登録」ページのカテゴリ選択（#in-cat）を更新
  const regSelect = document.getElementById('in-cat');
  if (regSelect) {
    const currentVal = regSelect.value;
    regSelect.innerHTML = '';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      regSelect.appendChild(opt);
    });
    if (categories.includes(currentVal)) regSelect.value = currentVal;
  }

  // 2. 「レシピ一覧」ページの絞り込みボタン（.filter-group）を更新
  const filterGroup = document.querySelector('.filter-group');
  if (filterGroup) {
    const activeCat = window.currentFilter || 'すべて'; // 未定義なら'すべて'をデフォルトにする
    filterGroup.innerHTML = `<button class="filter-btn ${activeCat === 'すべて' ? 'active' : ''}" data-filter="すべて">すべて</button>`;
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `filter-btn ${activeCat === cat ? 'active' : ''}`;
      btn.setAttribute('data-filter', cat);
      btn.textContent = cat;
      filterGroup.appendChild(btn);
    });
    if (typeof initFilterButtons === 'function') {
      initFilterButtons();
    }
  }

  // 3. 「設定」ページ内のカテゴリー管理リストを描画（↑↓ボタン付き）
  const manageList = document.getElementById('cat-manage-list');
  if (manageList) {
    manageList.innerHTML = '';
    categories.forEach((cat, index) => {
      const li = document.createElement('li');
      li.className = 'cat-manage-item';
      
      // 一番上の要素は「↑」を無効化、一番下の要素は「↓」を無効化
      const isFirst = index === 0;
      const isLast = index === categories.length - 1;
      
      li.innerHTML = `
        <div class="cat-item-left">
          <div class="cat-sort-btns">
            <button class="cat-move-btn cat-up-btn" data-index="${index}" ${isFirst ? 'disabled' : ''} title="上へ移動">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </button>
            <button class="cat-move-btn cat-down-btn" data-index="${index}" ${isLast ? 'disabled' : ''} title="下へ移動">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>
          <span class="cat-item-name">${cat}</span>
        </div>
        <div class="cat-action-btns">
          <button class="cat-edit-btn" data-index="${index}">編集</button>
          <button class="cat-del-btn" data-index="${index}">削除</button>
        </div>
      `;
      manageList.appendChild(li);
    });
  }

  // settings.js の refreshAllCategoryUI() の一番最後に追記
  if (typeof refreshSelectOptions === 'function') {
      refreshSelectOptions();
    }

};

// クラウドとローカルの両方にカテゴリーを順番通りに保存する関数
async function saveCategoriesToStorage(newCategories) {
  localStorage.setItem('recipeCategories', JSON.stringify(newCategories));
  window.refreshAllCategoryUI();

  if (window.currentUser && window.supabaseClient) {
    const userId = window.currentUser.id;
    // 一度すべて削除してから、新しい配列の順番通りに再登録することで順番を保持する
    await window.supabaseClient.from('categories').delete().eq('user_id', userId);
    
    // created_at の順序が確実に並ぶよう、1ミリ秒ずつずらしたタイムスタンプを付与して一括保存
    const now = Date.now();
    const payload = newCategories.map((name, idx) => ({
      user_id: userId,
      name: name,
      created_at: new Date(now + idx * 10).toISOString()
    }));
    
    if (payload.length > 0) {
      await window.supabaseClient.from('categories').insert(payload);
    }
  }
}

// 画面読み込み時の初期描画
document.addEventListener('DOMContentLoaded', () => {
  window.refreshAllCategoryUI();
});

// ボタン操作のイベント監視
document.addEventListener('click', async (e) => {
    // ⬆️ 「↑（上へ）」移動ボタン（SVGクリックにも対応）
  const upBtn = e.target.closest('.cat-up-btn');
  if (upBtn && !upBtn.disabled) {
    const idx = Number(upBtn.getAttribute('data-index'));
    if (idx > 0) {
      const categories = window.getCategories();
      [categories[idx - 1], categories[idx]] = [categories[idx], categories[idx - 1]];
      await saveCategoriesToStorage(categories);
    }
  }

  // ⬇️ 「↓（下へ）」移動ボタン（SVGクリックにも対応）
  const downBtn = e.target.closest('.cat-down-btn');
  if (downBtn && !downBtn.disabled) {
    const idx = Number(downBtn.getAttribute('data-index'));
    const categories = window.getCategories();
    if (idx < categories.length - 1) {
      [categories[idx], categories[idx + 1]] = [categories[idx + 1], categories[idx]];
      await saveCategoriesToStorage(categories);
    }
  }

  // ➕ カテゴリー追加ボタン
  if (e.target && e.target.id === 'btn-add-cat') {
    const input = document.getElementById('in-new-cat');
    const newCat = input.value.trim();
    if (!newCat) return ashowToast('カテゴリー名を入力してください。');

    const categories = window.getCategories();
    if (categories.includes(newCat)) return showToast('すでに同じカテゴリーが存在します。');

    categories.push(newCat);
    input.value = '';
    await saveCategoriesToStorage(categories);
  }

  // ✏️ カテゴリーの名前変更ボタン
  if (e.target && e.target.classList.contains('cat-edit-btn')) {
    const idx = Number(e.target.getAttribute('data-index'));
    const categories = window.getCategories();
    const oldName = categories[idx];
    const newName = prompt(`「${oldName}」の新しいカテゴリー名を入力してください:`, oldName);

    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
      const trimmed = newName.trim();
      if (categories.includes(trimmed)) return showToast('すでに同じ名前のカテゴリーが存在します。');

      categories[idx] = trimmed;
      await saveCategoriesToStorage(categories);

      const recipeList = JSON.parse(localStorage.getItem('recipeList')) || [];
      let recipeUpdated = false;
      recipeList.forEach(r => {
        if (r.cat === oldName) {
          r.cat = trimmed;
          recipeUpdated = true;
        }
      });

      if (recipeUpdated) {
        localStorage.setItem('recipeList', JSON.stringify(recipeList));
        if (window.currentUser && window.supabaseClient) {
          await window.supabaseClient
            .from('recipes')
            .update({ cat: trimmed })
            .eq('user_id', window.currentUser.id)
            .eq('cat', oldName);
        }
        if (typeof renderRecipeGrid === 'function') renderRecipeGrid();
      }
    }
  }

  // 🗑️ カテゴリー削除ボタン
  if (e.target && e.target.classList.contains('cat-del-btn')) {
    const idx = Number(e.target.getAttribute('data-index'));
    const categories = window.getCategories();
    if (categories.length <= 1) return showToast('カテゴリーは最低1つ残す必要があります。');

    const targetName = categories[idx];
    if (confirm(`カテゴリー「${targetName}」を削除しますか？\n（※登録済みのレシピ自体は消えません）`)) {
      categories.splice(idx, 1);
      await saveCategoriesToStorage(categories);
    }
  }
});
