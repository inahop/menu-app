// ==========================================
// 買い物リストの手動メモ追加機能（即時反映＆クラウド同期版）
// ==========================================

document.addEventListener('click', (e) => {
  if (e.target && (e.target.id === 'add-memo-btn' || e.target.closest('#add-memo-btn'))) {
    executeAddMemo(e.target);
  }
});

document.addEventListener('keypress', (e) => {
  if (e.target && e.target.id === 'in-memo' && e.key === 'Enter') {
    executeAddMemo(e.target);
  }
});

async function executeAddMemo(clickedElement) {
  let memoInput = document.getElementById('in-memo');
  if (clickedElement && clickedElement.closest('#page-shopping')) {
    const localInput = clickedElement.closest('#page-shopping').querySelector('input[type="text"]');
    if (localInput) memoInput = localInput;
  }

  if (!memoInput) return;
  const memoText = memoInput.value.trim();
  if (!memoText) return;

  memoInput.value = '';

  // 1. まずローカルデータを即座に更新して、画面を0秒で再描画する
  const customMemos = JSON.parse(localStorage.getItem('customMemos')) || [];
  const tempMemo = { text: memoText, checked: false };
  customMemos.push(tempMemo);
  localStorage.setItem('customMemos', JSON.stringify(customMemos));
  
  if (typeof renderShoppingList === 'function') {
    renderShoppingList();
  }

  // 2. ログイン中なら裏側でクラウドにも保存し、正式なIDを同期する
  if (window.currentUser && window.supabaseClient) {
    const { data, error } = await window.supabaseClient
      .from('custom_memos')
      .insert([{ user_id: window.currentUser.id, text: memoText, checked: false }])
      .select()
      .single();

    if (!error && data) {
      // 仮のデータにクラウドで発行された正式なidを紐づけておく（削除時に必要）
      const latestMemos = JSON.parse(localStorage.getItem('customMemos')) || [];
      const targetIdx = latestMemos.findIndex(m => m.text === memoText && !m.id);
      if (targetIdx > -1) {
        latestMemos[targetIdx].id = data.id;
        localStorage.setItem('customMemos', JSON.stringify(latestMemos));
      }
    }
  }
}

window.appendCustomMemos = function() {
  const container = document.getElementById('shopping-list-container');
  if (!container) return;

  const customMemos = JSON.parse(localStorage.getItem('customMemos')) || [];
  if (customMemos.length === 0) return;

  const emptyMsg = document.getElementById('empty-message');
  if (emptyMsg) emptyMsg.remove();

  const existingHeader = container.querySelector('.custom-memo-header');
  if (existingHeader) existingHeader.remove();
  container.querySelectorAll('.custom-item-li').forEach(el => el.remove());

  const headerLi = document.createElement('li');
  headerLi.className = 'custom-memo-header';
  headerLi.style.cssText = "padding: 5px 12px; font-size: 0.8rem; color: #7f8c8d; font-weight: bold; background: #eef1f4; border-radius: 4px; margin: 15px 0 5px 0; list-style: none; width: 100%; box-sizing: border-box;";
  headerLi.innerText = "📌 個別に追加したメモ";
  container.appendChild(headerLi);

  customMemos.forEach((memo, index) => {
    const li = document.createElement('li');
    li.className = 'shopping-item custom-item-li';
    li.style.borderLeft = '4px solid #3498db';
    if (memo.checked) li.classList.add('checked');

    li.innerHTML = `
      <div class="item-left" style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" ${memo.checked ? 'checked' : ''}>
        <span class="item-name">${memo.text}</span>
      </div>
      <span class="delete-memo-x" style="color:#e74c3c; font-weight:bold; cursor:pointer; font-size:0.9rem; padding:0 5px;">×</span>
    `;

    // チェック切り替え（即時反映）
    li.addEventListener('click', async (e) => {
      if (e.target.classList.contains('delete-memo-x')) return;
      const checkbox = li.querySelector('input[type="checkbox"]');
      if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
      
      const isChecked = checkbox.checked;
      if (isChecked) li.classList.add('checked'); else li.classList.remove('checked');

      customMemos[index].checked = isChecked;
      localStorage.setItem('customMemos', JSON.stringify(customMemos));

      if (window.currentUser && window.supabaseClient && memo.id) {
        await window.supabaseClient.from('custom_memos').update({ checked: isChecked }).eq('id', memo.id);
      }
    });

    // 削除ボタン（即時反映）
    li.querySelector('.delete-memo-x').addEventListener('click', async (e) => {
      e.stopPropagation();
      
      const targetId = memo.id;
      const targetText = memo.text;

      // 1. 先に画面とローカルデータから即座に消去して再描画
      customMemos.splice(index, 1);
      localStorage.setItem('customMemos', JSON.stringify(customMemos));
      if (typeof renderShoppingList === 'function') renderShoppingList();

      // 2. クラウドからも削除
      if (window.currentUser && window.supabaseClient) {
        if (targetId) {
          await window.supabaseClient.from('custom_memos').delete().eq('id', targetId);
        } else {
          // まだidが紐づく前にすぐ消された場合はテキストとユーザーIDで削除
          await window.supabaseClient.from('custom_memos').delete().eq('user_id', window.currentUser.id).eq('text', targetText);
        }
      }
    });

    container.appendChild(li);
  });
};
