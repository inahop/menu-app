// ==========================================
// 🛒 買い物リストの手動メモ追加機能
// ==========================================

// 「＋ メモを追加」ボタンをクリックした時
document.getElementById('add-memo-btn').addEventListener('click', () => {
  const memoInput = document.getElementById('in-memo');
  const memoText = memoInput.value.trim();

  if (!memoText) return;

  // LocalStorageから既存の手動メモ配列を取得（無ければ空配列）
  const customMemos = JSON.parse(localStorage.getItem('customMemos')) || [];
  
  // 新しいメモを追加（未チェック状態で保存）
  customMemos.push({ text: memoText, checked: false });
  localStorage.setItem('customMemos', JSON.stringify(customMemos));

  // 入力欄をクリアして、買い物リストを再描画する
  memoInput.value = '';
  if (typeof renderShoppingList === 'function') {
    renderShoppingList();
  }
});

// 💡 既存の shopping.js の処理の最後に、この手動メモを合流させる処理を付け足します
// app.js から「買い物リストタブが開かれた時」に自動で動くように、フック関数を用意します
window.appendCustomMemos = function() {
  const container = document.getElementById('shopping-list-container');
  if (!container) return;

  const customMemos = JSON.parse(localStorage.getItem('customMemos')) || [];
  if (customMemos.length === 0) return;

  // 区切り用のヘッダーをリストの途中に挟む（見やすくするため）
  const headerLi = document.createElement('li');
  headerLi.style.cssText = "padding: 5px 12px; font-size: 0.8rem; color: #7f8c8d; font-weight: bold; background: #eef1f4; border-radius: 4px; margin: 15px 0 5px 0; list-style: none;";
  headerLi.innerText = "📌 個別に追加したメモ";
  container.appendChild(headerLi);

  // 手動メモをループして、買い物リストの末尾にどんどん追加していく
  customMemos.forEach((memo, index) => {
    const li = document.createElement('li');
    li.className = 'shopping-item';
    li.style.borderLeftColor = '#3498db'; // レシピ材料（緑）と区別するために青色にするでち！
    
    if (memo.checked) {
      li.classList.add('checked');
    }

    li.innerHTML = `
      <div class="item-left">
        <input type="checkbox" ${memo.checked ? 'checked' : ''}>
        <span class="item-name">${memo.text}</span>
      </div>
      <span class="delete-memo-x" style="color:#e74c3c; font-weight:bold; cursor:pointer; font-size:0.9rem; padding:0 5px;">×</span>
    `;

    // タップした時にチェックボックスを切り替えるイベント
    li.addEventListener('click', (e) => {
      // 削除の「×」ボタンが押された時は、このチェック処理は無視する
      if (e.target.classList.contains('delete-memo-x')) return;

      const checkbox = li.querySelector('input[type="checkbox"]');
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }

      customMemos[index].checked = checkbox.checked;
      if (checkbox.checked) {
        li.classList.add('checked');
      } else {
        li.classList.remove('checked');
      }
      localStorage.setItem('customMemos', JSON.stringify(customMemos));
    });

    // ❌ 個別メモを削除する「×」ボタンのイベント
    li.querySelector('.delete-memo-x').addEventListener('click', (e) => {
      e.stopPropagation(); // クリックの連鎖を止める
      
      // 配列からこのアイテムを削除
      customMemos.splice(index, 1);
      localStorage.setItem('customMemos', JSON.stringify(customMemos));
      
      // 再描画
      if (typeof renderShoppingList === 'function') {
        renderShoppingList();
      }
    });

    container.appendChild(li);
  });
};
