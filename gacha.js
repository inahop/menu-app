// ==========================================
// 🎲 登録レシピからランダム提案！献立ガチャ機能
// ==========================================
document.getElementById('gacha-btn').addEventListener('click', () => {
  const list = JSON.parse(localStorage.getItem('recipeList')) || [];

  if (list.length === 0) {
    alert('まずはレシピ登録ページで、いくつかレシピを登録してねでち！');
    return;
  }

  // カテゴリごとにレシピを分類する
  const mains = list.filter(r => r.cat === '主菜');
  const sides = list.filter(r => r.cat === '副菜');
  const soups = list.filter(r => r.cat === '汁物');

  // ランダムに1つ選ぶ関数（無ければ「-」にする）
  const getRandomRecipe = (array) => {
    if (array.length === 0) return '-';
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex].title;
  };

  // それぞれのカテゴリからランダムに料理名をピックアップ
  const chosenMain = getRandomRecipe(mains);
  const chosenSide = getRandomRecipe(sides);
  const chosenSoup = getRandomRecipe(soups);

  // 画面のセレクトボックス（ドロップダウン）の選択状態を、ガチャ結果に書き換える
  document.getElementById('select-main').value = chosenMain;
  document.getElementById('select-side').value = chosenSide;
  document.getElementById('select-soup').value = chosenSoup;

  // ガチャ結果のテキストを画面に可愛く表示する
  const resultDiv = document.getElementById('gacha-result');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <strong style="color:#9b59b6;">🎲 今日のガチャ結果：</strong><br>
    【主菜】${chosenMain}<br>
    【副菜】${chosenSide}<br>
    【汁物】${chosenSoup}<br>
    <span style="font-size:0.75rem; color:#666; display:block; margin-top:4px;">※上のドロップダウンにセットされたので、そのまま「カレンダーに登録」を押せば確定できるでち！</span>
  `;
});
