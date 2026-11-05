const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
let currentFilter = 'すべて'; 

window.addEventListener('DOMContentLoaded', () => {
  initTabs();           
  initFilterButtons();  
  initCalendar();       
  refreshSelectOptions(); 
  renderRecipeGrid();   
  if(typeof renderShoppingList === 'function') renderShoppingList();
});

// 1. タブ切り替え制御
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

// 2. レシピ保存処理
document.getElementById('save-btn').addEventListener('click', () => {
  const data = {
    title: document.getElementById('in-title').value.trim(),
    cat: document.getElementById('in-cat').value,
    ing: document.getElementById('in-ing').value,
    prep: document.getElementById('in-prep').value,
    steps: document.getElementById('in-steps').value
  };

  if (!data.title) return alert('レシピ名を入力してくださいでち！');

  const list = JSON.parse(localStorage.getItem('recipeList')) || [];
  const idx = list.findIndex(item => item.title === data.title);
  if (idx > -1) list[idx] = data; else list.push(data);

  localStorage.setItem('recipeList', JSON.stringify(list));
  alert(`「${data.title}」を保存しました！`);
  
  document.getElementById('in-title').value = '';
  document.getElementById('in-ing').value = '';
  document.getElementById('in-prep').value = '';
  document.getElementById('in-steps').value = '';
  
  refreshSelectOptions();
  renderRecipeGrid();
});

// 3. レシピ一覧の描画 ＆ カテゴリ絞り込み
function initFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderRecipeGrid(); 
    });
  });
}

function renderRecipeGrid() {
  const list = JSON.parse(localStorage.getItem('recipeList')) || [];
  const grid = document.getElementById('recipe-grid');
  grid.innerHTML = '';

  const filteredList = list.filter(r => currentFilter === 'すべて' || r.cat === currentFilter);

  if (filteredList.length === 0) {
    grid.innerHTML = `<p style="color:#999; grid-column:1/-1; text-align:center; padding:20px;">該当するレシピがありませんでち。</p>`;
    return;
  }

  filteredList.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    // 📝 削除ボタンのとなりに「編集」ボタンを追加したでち！
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <span class="card-cat">${recipe.cat}</span>
        <div style="display:flex; gap:5px;">
          <button class="edit-recipe-btn" style="background:none; border:none; color:#3498db; font-size:0.8rem; cursor:pointer; padding:2px;" data-title="${recipe.title}">📝 編集</button>
          <button class="delete-recipe-btn" style="background:none; border:none; color:#e74c3c; font-size:0.8rem; cursor:pointer; padding:2px;" data-title="${recipe.title}">🗑️ 削除</button>
        </div>
      </div>
      <div class="card-title" style="margin-top:5px;">${recipe.title}</div>
    `;
    
    // カード全体をクリックした時は献立画面へ
    card.addEventListener('click', (e) => {
      // 削除ボタン、または編集ボタンが押された時は何もしない
      if (e.target.classList.contains('delete-recipe-btn') || e.target.classList.contains('edit-recipe-btn')) return;
      
      const menuTab = document.querySelector('.tab-btn[data-target="page-menu"]');
      if (menuTab) menuTab.click(); 
      loadAndRenderRecipe(recipe.title); 
    });

    // 🗑️ 削除ボタンの処理（前回と同様）
    card.querySelector('.delete-recipe-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`「${recipe.title}」のレシピを削除しますか？\n（カレンダーからも自動で外れるでち）`)) {
        const updatedList = list.filter(item => item.title !== recipe.title);
        localStorage.setItem('recipeList', JSON.stringify(updatedList));

        const weekMenu = JSON.parse(localStorage.getItem('weekMenu')) || {};
        Object.keys(weekMenu).forEach(day => {
          if (weekMenu[day].main === recipe.title) weekMenu[day].main = '-';
          if (weekMenu[day].side === recipe.title) weekMenu[day].side = '-';
          if (weekMenu[day].soup === recipe.title) weekMenu[day].soup = '-';
        });
        localStorage.setItem('weekMenu', JSON.stringify(weekMenu));

        renderRecipeGrid();
        refreshSelectOptions();
        initCalendar();
        if(typeof renderShoppingList === 'function') renderShoppingList();
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



// 4. 献立選択肢の更新
function refreshSelectOptions() {
  const list = JSON.parse(localStorage.getItem('recipeList')) || [];
  const mainSel = document.getElementById('select-main');
  const sideSel = document.getElementById('select-side');
  const soupSel = document.getElementById('select-soup');

  mainSel.innerHTML = '<option>-</option>';
  sideSel.innerHTML = '<option>-</option>';
  soupSel.innerHTML = '<option>-</option>';

  list.forEach(r => {
    const opt = `<option value="${r.title}">${r.title}</option>`;
    if (r.cat === '主菜') mainSel.innerHTML += opt;
    if (r.cat === '副菜') sideSel.innerHTML += opt;
    if (r.cat === '汁物') soupSel.innerHTML += opt;
  });
}

// 5. カレンダー登録処理
document.getElementById('set-menu-btn').addEventListener('click', () => {
  const day = document.getElementById('select-day').value;
  const weekMenu = JSON.parse(localStorage.getItem('weekMenu')) || {};

  weekMenu[day] = {
    main: document.getElementById('select-main').value,
    side: document.getElementById('select-side').value,
    soup: document.getElementById('select-soup').value
  };

  localStorage.setItem('weekMenu', JSON.stringify(weekMenu));
  initCalendar();
  alert(`${day}曜日の献立を登録したでち！`);
});

document.getElementById('clear-all-btn').addEventListener('click', () => {
  if (confirm('すべて消去して初期化しますか？')) {
    localStorage.clear();
    location.reload();
  }
});

function initCalendar() {
  const weekMenu = JSON.parse(localStorage.getItem('weekMenu')) || {};
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  DAYS.forEach(day => {
    const menu = weekMenu[day] || { main: '-', side: '-', soup: '-' };
    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="day-name">${day}曜日</div>
      <div class="menu-dish main" data-name="${menu.main}">🍗 ${menu.main}</div>
      <div class="menu-dish side" data-name="${menu.side}">🥗 ${menu.side}</div>
      <div class="menu-dish soup" data-name="${menu.soup}">🥣 ${menu.soup}</div>
    `;
    card.querySelectorAll('.menu-dish').forEach(element => {
      const recipeName = element.getAttribute('data-name');
      if (recipeName && recipeName !== '-') {
        element.style.cursor = 'pointer';
        element.addEventListener('click', () => loadAndRenderRecipe(recipeName));
      }
    });
    grid.appendChild(card);
  });
}

function loadAndRenderRecipe(title) {
  const list = JSON.parse(localStorage.getItem('recipeList')) || [];
  const data = list.find(item => item.title === title);
  if (!data) return;

  const ings = data.ing.split('\n').filter(l => l.trim());
  const preps = data.prep.split('\n').filter(l => l.trim());
  const steps = data.steps.split('\n').filter(l => l.trim());

  let ingH = '', prepH = '', stepH = '';
  ings.forEach(i => {
    const p = i.split(/[\s　]+/);
    ingH += `<div class="ing-row"><span>${p[0] || ''}</span><span>${p[1] || ''}</span></div>`;
  });
  preps.forEach(p => { prepH += `<li>${p}</li>`; });
  steps.forEach(s => { stepH += `<li>${s}</li>`; });

  document.getElementById('preview').innerHTML = `
    <div class="recipe-detail-layout">
      <div class="detail-side">
        <span style="font-size:0.75rem; background:#fee; color:#e67e22; padding:2px 6px; border-radius:4px; font-weight:bold;">${data.cat}</span>
        <h2 style="margin:5px 0 10px 0; font-size:1.2rem;">${data.title}</h2>
        <div class="card" style="margin:0; padding:10px;"><h4 class="title-border">材料</h4>${ingH}</div>
      </div>
      <div class="detail-main">
        ${prepH ? `<div class="card"><h4 class="title-border">下準備</h4><ul>${prepH}</ul></div>` : ''}
        <div class="card"><h4 class="title-border">作り方</h4><ol>${stepH}</ol></div>
      </div>
    </div>
  `;
}
