const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
window.currentFilter = 'すべて'; 

window.addEventListener('DOMContentLoaded', () => {
  initTabs();           
  initFilterButtons();  
  initCalendar();
  renderRecipeGrid();   
  if(typeof renderShoppingList === 'function') renderShoppingList();
});

// ==========================================
// トースト通知を表示する共通関数
// ==========================================
window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return alert(message);

  const toast = document.createElement('div');
  toast.className = `toast-item ${type === 'error' ? 'is-error' : ''}`;
  
  toast.innerHTML = `<span class="toast-msg">${message}</span>`;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('is-show');
  });

  setTimeout(() => {
    toast.classList.remove('is-show');
    setTimeout(() => toast.remove(), 350);
  }, 2500);
};


// ==========================================
// 1. タブ切り替え制御
// ==========================================
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const pages = document.querySelectorAll('.page-view');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      pages.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'page-list') {
        renderRecipeGrid();
      } else if (targetId === 'page-shopping') {
        if(typeof renderShoppingList === 'function') renderShoppingList();
      }
    });
  });
}

// ==========================================
// 2. レシピ保存処理（即時反映＆クラウド同期版）
// ==========================================
document.getElementById('save-btn').addEventListener('click', async () => {
  const data = {
    title: document.getElementById('in-title').value.trim(),
    cat: document.getElementById('in-cat').value,
    ing: document.getElementById('in-ing').value,
    prep: document.getElementById('in-prep').value,
    steps: document.getElementById('in-steps').value,
    notes: document.getElementById('in-notes') ? document.getElementById('in-notes').value.trim() : ''
  };

  if (!data.title) return showToast('レシピ名を入力してください。');

  // 1. まずローカルデータ（localStorage）を即座に更新する
  const list = JSON.parse(localStorage.getItem('recipeList')) || [];
  const idx = list.findIndex(item => item.title === data.title);
  if (idx > -1) {
    list[idx] = { ...list[idx], ...data }; // 既存レシピの上書き
  } else {
    list.push(data); // 新規レシピの追加
  }
  localStorage.setItem('recipeList', JSON.stringify(list));

  // 2. 通信を待たずに「レシピ一覧」を0秒で更新する
  renderRecipeGrid();

  // 入力欄をクリアして完了メッセージを出す
  document.getElementById('in-title').value = '';
  document.getElementById('in-ing').value = '';
  document.getElementById('in-prep').value = '';
  document.getElementById('in-steps').value = '';
  if (document.getElementById('in-notes')) document.getElementById('in-notes').value = '';

  showToast(`「${data.title}」を保存しました！`);

  // 3. ログイン中なら、裏側で静かにSupabaseへ保存する
  if (window.currentUser && window.supabaseClient) {
    const { data: existing } = await window.supabaseClient
      .from('recipes')
      .select('id')
      .eq('user_id', window.currentUser.id)
      .eq('title', data.title)
      .maybeSingle();

    if (existing) {
      await window.supabaseClient.from('recipes').update(data).eq('id', existing.id);
    } else {
      await window.supabaseClient.from('recipes').insert([{ ...data, user_id: window.currentUser.id }]);
    }
  }
});


// ==========================================
// 3. レシピ一覧の描画 ＆ カテゴリ絞り込み
// ==========================================
function initFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.currentFilter = btn.getAttribute('data-filter');
      renderRecipeGrid(); 
    });
  });
}

function renderRecipeGrid() {
  const list = JSON.parse(localStorage.getItem('recipeList')) || [];
  const grid = document.getElementById('recipe-grid');
  grid.innerHTML = '';

  const filteredList = list.filter(r => window.currentFilter === 'すべて' || r.cat === window.currentFilter);

  if (filteredList.length === 0) {
    grid.innerHTML = `<p style="color:#999; grid-column:1/-1; text-align:center; padding:20px;">該当するレシピがありません。</p>`;
    return;
  }

  filteredList.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    // 📝 削除ボタンのとなりに「編集」ボタンを追加しました！
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="card-cat">${recipe.cat}</span>
        <div style="display:flex; gap:5px;">
          <button class="edit-recipe-btn" style="background:none; border:none; color:#3498db; font-size:0.8rem; cursor:pointer; padding:2px;" data-title="${recipe.title}">📝 編集</button>
          <button class="delete-recipe-btn" style="background:none; border:none; color:#e74c3c; font-size:0.8rem; cursor:pointer; padding:2px;" data-title="${recipe.title}">🗑️ 削除</button>
        </div>
      </div>
      <div class="card-title">${recipe.title}</div>
    `;
    
    // カード全体をクリックした時は、画面移動せずモーダルで詳細を開く
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-recipe-btn') || e.target.classList.contains('edit-recipe-btn')) return;
      loadAndRenderRecipe(recipe.title); 
    });


    // 🗑️ 削除ボタンの処理（即時反映＆クラウド同期版）
    card.querySelector('.delete-recipe-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`「${recipe.title}」のレシピを削除しますか？\n（カレンダーからも自動で外れます）`)) {
        
        // 1. 先にローカルデータから削除して即座に画面を更新
        const currentList = JSON.parse(localStorage.getItem('recipeList')) || [];
        const updatedList = currentList.filter(item => item.title !== recipe.title);
        localStorage.setItem('recipeList', JSON.stringify(updatedList));

        const weekMenu = JSON.parse(localStorage.getItem('weekMenu')) || {};
        const updatedDays = [];
        Object.keys(weekMenu).forEach(day => {
          let changed = false;
          if (weekMenu[day].main === recipe.title) { weekMenu[day].main = '-'; changed = true; }
          if (weekMenu[day].side === recipe.title) { weekMenu[day].side = '-'; changed = true; }
          if (weekMenu[day].soup === recipe.title) { weekMenu[day].soup = '-'; changed = true; }
          if (changed) updatedDays.push(day);
        });
        localStorage.setItem('weekMenu', JSON.stringify(weekMenu));

        // 画面のすべてのパーツを0秒で再描画
        renderRecipeGrid();
        initCalendar();
        if (typeof renderShoppingList === 'function') renderShoppingList();

        // 2. ログイン中なら裏側でクラウドからも削除・更新する
        if (window.currentUser && window.supabaseClient) {
          await window.supabaseClient
            .from('recipes')
            .delete()
            .eq('user_id', window.currentUser.id)
            .eq('title', recipe.title);

          for (const day of updatedDays) {
            await window.supabaseClient
              .from('menus')
              .update(weekMenu[day])
              .eq('user_id', window.currentUser.id)
              .eq('day_of_week', day);
          }
        }
      }
    });

    // 📝 編集ボタンがクリックされた時のイベント（処理本体は edit.js に引き渡すための目印）
    card.querySelector('.edit-recipe-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof window.startEditRecipe === 'function') {
        window.startEditRecipe(recipe.title);
      }
    });

    grid.appendChild(card);
  });
}


// ==========================================
// 🧹 今週の献立カレンダーだけをリセットする処理
// ==========================================
const clearBtn = document.getElementById('clear-all-btn');
if (clearBtn) {
  clearBtn.addEventListener('click', async () => {
    if (!confirm('1週間の献立カレンダーをすべて空にしますか？\n（※登録したレシピ自体は消えません）')) return;

    // 1. ローカルのカレンダーを空にして即座に画面更新
    localStorage.setItem('weekMenu', JSON.stringify({}));
    initCalendar();
    if (typeof renderShoppingList === 'function') renderShoppingList();

    // 2. ログイン中ならクラウドのmenusテーブルも空にする
    if (window.currentUser && window.supabaseClient) {
      await window.supabaseClient
        .from('menus')
        .delete()
        .eq('user_id', window.currentUser.id);
    }
  });
}



// ==========================================
// 1週間の献立カレンダー描画（個別削除ボタン付き）
// ==========================================
function initCalendar() {
  const weekMenu = JSON.parse(localStorage.getItem('weekMenu')) || {};
  const categories = typeof window.getCategories === 'function' 
    ? window.getCategories() 
    : ['主菜', '副菜', '汁物'];
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  grid.innerHTML = '';

  DAYS.forEach(day => {
    const menu = weekMenu[day] || { main: '-', side: '-', soup: '-', extra: {} };
    const card = document.createElement('div');
    card.className = 'day-card';
    
    let dishesHtml = `<div class="day-name">${day}曜日</div>`;

    categories.forEach(cat => {
      let dishName = '-';
      let dishClass = '';

      if (cat === '主菜') {
        dishName = menu.main || '-';
        dishClass = 'main';
      } else if (cat === '副菜') {
        dishName = menu.side || '-';
        dishClass = 'side';
      } else if (cat === '汁物') {
        dishName = menu.soup || '-';
        dishClass = 'soup';
      } else {
        dishName = (menu.extra && menu.extra[cat]) ? menu.extra[cat] : '-';
        dishClass = 'extra';
      }

      // 追加カテゴリーで未登録('-')の場合は枠自体を表示しない
      if (!['主菜', '副菜', '汁物'].includes(cat) && dishName === '-') {
        return;
      }

      const hasDish = dishName && dishName !== '-';
      const removeBtnHtml = hasDish 
        ? `<button type="button" class="dish-remove-btn" data-day="${day}" data-cat="${cat}" title="献立から外す">×</button>` 
        : '';

      dishesHtml += `
        <div class="menu-dish ${dishClass} ${hasDish ? 'is-clickable' : ''}" data-name="${dishName}">
          <span class="dish-text">${dishName}</span>
          ${removeBtnHtml}
        </div>
      `;
    });

    card.innerHTML = dishesHtml;

    // 料理名クリックで詳細モーダルを開く
    card.querySelectorAll('.menu-dish.is-clickable').forEach(element => {
      element.addEventListener('click', (e) => {
        if (e.target.closest('.dish-remove-btn')) return;
        const recipeName = element.getAttribute('data-name');
        if (recipeName && recipeName !== '-') {
          loadAndRenderRecipe(recipeName);
        }
      });
    });

    // 「×」ボタンクリックで1品だけ個別に外す
    card.querySelectorAll('.dish-remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetDay = btn.getAttribute('data-day');
        const targetCat = btn.getAttribute('data-cat');

        const currentMenu = JSON.parse(localStorage.getItem('weekMenu')) || {};
        if (!currentMenu[targetDay]) return;

        if (targetCat === '主菜') {
          currentMenu[targetDay].main = '-';
        } else if (targetCat === '副菜') {
          currentMenu[targetDay].side = '-';
        } else if (targetCat === '汁物') {
          currentMenu[targetDay].soup = '-';
        } else if (currentMenu[targetDay].extra) {
          delete currentMenu[targetDay].extra[targetCat];
        }

        // ローカルデータを即座に更新してカレンダーと買い物リストを再描画
        localStorage.setItem('weekMenu', JSON.stringify(currentMenu));
        initCalendar();
        if (typeof renderShoppingList === 'function') {
          renderShoppingList();
        }

        // ログイン中ならクラウドへも保存
        if (window.currentUser && window.supabaseClient) {
          await window.supabaseClient.from('menus').upsert([{
            user_id: window.currentUser.id,
            day_of_week: targetDay,
            main: currentMenu[targetDay].main || '-',
            side: currentMenu[targetDay].side || '-',
            soup: currentMenu[targetDay].soup || '-',
            extra: currentMenu[targetDay].extra || {}
          }], { onConflict: 'user_id,day_of_week' });
        }
      });
    });

    grid.appendChild(card);
  });
}



// ==========================================
// 📖 レシピ詳細モーダル表示 ＆ クイック献立登録
// ==========================================
function closeRecipeModal() {
  const modal = document.getElementById('recipe-modal');
  if (modal) modal.classList.remove('is-open');
}

// 「×」ボタンと背景オーバーレイのクリックで閉じる
document.addEventListener('click', (e) => {
  if (e.target && (e.target.id === 'modal-close-btn' || e.target.id === 'modal-overlay')) {
    closeRecipeModal();
  }
});

function loadAndRenderRecipe(title) {
  const list = JSON.parse(localStorage.getItem('recipeList')) || [];
  const data = list.find(item => item.title === title);
  if (!data) return;

  const ings = data.ing ? data.ing.split('\n').filter(l => l.trim()) : [];
  const preps = data.prep ? data.prep.split('\n').filter(l => l.trim()) : [];
  const steps = data.steps ? data.steps.split('\n').filter(l => l.trim()) : [];

  let ingH = '', prepH = '', stepH = '';
  ings.forEach(i => ingH += `<li>${i}</li>`);
  preps.forEach(p => prepH += `<li>${p}</li>`);
  steps.forEach(s => stepH += `<li>${s}</li>`);

  let notesH = '';
  if (data.notes) {
    notesH = `
      <div class="detail-notes">
        <strong>📝 レシピメモ:</strong>
        <p>${data.notes}</p>
      </div>
    `;
  }

  const dayOptions = DAYS.map(d => `<option value="${d}">${d}曜日</option>`).join('');

  // モーダルの中身（#modal-body）に詳細を描画する
  const modalBody = document.getElementById('modal-body');
  const modal = document.getElementById('recipe-modal');
  if (!modalBody || !modal) return;

  modalBody.innerHTML = `
    <div class="recipe-detail-wrapper">
      <div class="detail-header">
        <div class="detail-title-group">
          <h3>${data.title}</h3>
          <span class="detail-cat-badge">${data.cat}</span>
        </div>

      <div class="detail-body-grid">
        <div>
          <h4 class="detail-sub-title">🍎 材料</h4>
          <ul class="detail-list">${ingH}</ul>
          
          <h4 class="detail-sub-title" style="margin-top:12px;">🔪 下準備</h4>
          <ul class="detail-list">${prepH || '<li>なし</li>'}</ul>
        </div>
        <div>
          <h4 class="detail-sub-title">🍳 作り方</h4>
          <ol class="detail-list">${stepH}</ol>
        </div>
        ${notesH}
      </div>
        
        <div class="quick-assign-box">
          <span>献立に登録：</span>
          <select id="quick-assign-day" class="quick-day-select">
            ${dayOptions}
          </select>
          <button type="button" class="btn quick-assign-btn" id="btn-quick-assign">登録</button>
        </div>
      </div>

    </div>
  `;

  // モーダルを表示する
  modal.classList.add('is-open');

  // 「📅 献立に登録」ボタンが押された時の処理
  document.getElementById('btn-quick-assign').addEventListener('click', async () => {
    const targetDay = document.getElementById('quick-assign-day').value;
    const cat = data.cat;
    const recipeTitle = data.title;

    const weekMenu = JSON.parse(localStorage.getItem('weekMenu')) || {};
    if (!weekMenu[targetDay]) {
      weekMenu[targetDay] = { main: '-', side: '-', soup: '-', extra: {} };
    }
    if (!weekMenu[targetDay].extra) {
      weekMenu[targetDay].extra = {};
    }

    if (cat === '主菜') {
      weekMenu[targetDay].main = recipeTitle;
    } else if (cat === '副菜') {
      weekMenu[targetDay].side = recipeTitle;
    } else if (cat === '汁物') {
      weekMenu[targetDay].soup = recipeTitle;
    } else {
      weekMenu[targetDay].extra[cat] = recipeTitle;
    }

    localStorage.setItem('weekMenu', JSON.stringify(weekMenu));
    initCalendar();
    if (typeof renderShoppingList === 'function') {
      renderShoppingList();
    }

    showToast(`${targetDay}曜日の「${cat}」に『${recipeTitle}』を登録しました！`);
    
    // 登録したら自動でモーダルを閉じてレシピ一覧にすぐ戻れるようにする
    closeRecipeModal();

    if (window.currentUser && window.supabaseClient) {
      await window.supabaseClient.from('menus').upsert([{
        user_id: window.currentUser.id,
        day_of_week: targetDay,
        main: weekMenu[targetDay].main,
        side: weekMenu[targetDay].side,
        soup: weekMenu[targetDay].soup,
        extra: weekMenu[targetDay].extra
      }], { onConflict: 'user_id,day_of_week' });
    }
  });
}


