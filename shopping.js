// ==========================================
// 買い物リストの自動集計 ＆ チェック機能
// ==========================================
function renderShoppingList() {
  const weekMenu = JSON.parse(localStorage.getItem('weekMenu')) || {};
  const recipeList = JSON.parse(localStorage.getItem('recipeList')) || [];
  const container = document.getElementById('shopping-list-container');
  
  if (!container) return;
  container.innerHTML = '';

  // カレンダーに登録されているすべての料理名を抜き出す
  const activeDishes = [];
  Object.values(weekMenu).forEach(menu => {
    if (menu.main && menu.main !== '-') activeDishes.push(menu.main);
    if (menu.side && menu.side !== '-') activeDishes.push(menu.side);
    if (menu.soup && menu.soup !== '-') activeDishes.push(menu.soup);
    // 追加カテゴリーの料理も買い物リストの材料集計に含める
    if (menu.extra) {
        Object.values(menu.extra).forEach(dish => {
        if (dish && dish !== '-') activeDishes.push(dish);
        });
    }
  });

  // 【重要修正】カレンダーが空の場合の処理を変更
  if (activeDishes.length === 0) {
    container.innerHTML = '<p style="color:#999; text-align:center; padding:30px;" id="empty-message">カレンダーに献立が登録されていません。まずは献立を作成してください！</p>';
    
    // カレンダーが空でも、手動メモがあれば合流させてから終了する
    if (typeof window.appendCustomMemos === 'function') {
      window.appendCustomMemos();
    }
    return; // ここで終了
  }

  // 料理名から材料を集計する
  const ingredientsSummary = {};

  activeDishes.forEach(dishTitle => {
    const recipe = recipeList.find(r => r.title === dishTitle);
    if (recipe && recipe.ing) {
      const lines = recipe.ing.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        const parts = line.split(/[\s　]+/);
        const name = parts[0];
        const amount = parts[1] || '適量';

        if (name) {
          if (!ingredientsSummary[name]) {
            ingredientsSummary[name] = [];
          }
          ingredientsSummary[name].push(amount);
        }
      });
    }
  });

  // チェック状態を保持するためのLocalStorage
  const checkedItems = JSON.parse(localStorage.getItem('checkedShoppingItems')) || {};

  // 集計した材料をループしてHTMLリストを作る
  Object.keys(ingredientsSummary).forEach(name => {
    const amounts = ingredientsSummary[name];
    const combinedAmount = amounts.join(', ');

    const li = document.createElement('li');
    li.className = 'shopping-item';
    
    if (checkedItems[name]) {
      li.classList.add('checked');
    }

    li.innerHTML = `
      <div class="item-left">
        <input type="checkbox" ${checkedItems[name] ? 'checked' : ''}>
        <span class="item-name">${name}</span>
      </div>
      <span class="item-amount">${combinedAmount}</span>
    `;

    // タップした時にチェックボックスを切り替え、見た目に横線を引く
    li.addEventListener('click', (e) => {
      const checkbox = li.querySelector('input[type="checkbox"]');
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }

      if (checkbox.checked) {
        li.classList.add('checked');
        checkedItems[name] = true;
      } else {
        li.classList.remove('checked');
        delete checkedItems[name];
      }
      localStorage.setItem('checkedShoppingItems', JSON.stringify(checkedItems));
    });

    container.appendChild(li);
  });
  
  // 自動集計の材料がある場合も、最後に手動メモを合流させる
  if (typeof window.appendCustomMemos === 'function') {
    window.appendCustomMemos();
  }
}
