// --- UI操作・イベントハンドラ ---

  // チェックボックス生成・操作
  function initSkillCheckboxes() {
    const skillContainer = document.getElementById('skillCheckboxes');
    if (!skillContainer) return;
    
    allSkills.forEach(skill => {
      const label = document.createElement('label');
      label.className = 'chip-label';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = skill;
      if (defaultChecked.includes(skill)) checkbox.checked = true;
      checkbox.addEventListener('change', saveSettings);

      const span = document.createElement('span');
      span.className = 'chip-text';
      span.textContent = skill;
      label.appendChild(checkbox);
      label.appendChild(span);
      skillContainer.appendChild(label);
    });
  }

  function initSecretProfileCheckboxes() {
    const secretContainer = document.getElementById('secretProfileCheckboxes');
    if (!secretContainer) return;

    secretProfileFields.forEach(field => {
      const label = document.createElement('label');
      label.className = 'chip-label';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = field;
      if (defaultSecretChecked.includes(field)) checkbox.checked = true;
      checkbox.addEventListener('change', saveSettings);

      const span = document.createElement('span');
      span.className = 'chip-text';
      span.textContent = field;
      label.appendChild(checkbox);
      label.appendChild(span);
      secretContainer.appendChild(label);
    });
  }

  function toggleSkillFields(isChecked) {
    document.querySelectorAll('#skillCheckboxes input[type="checkbox"]').forEach(cb => { cb.checked = isChecked; });
    saveSettings();
  }
  function resetSkillFields() {
    document.querySelectorAll('#skillCheckboxes input[type="checkbox"]').forEach(cb => { cb.checked = defaultChecked.includes(cb.value); });
    saveSettings();
  }
  function toggleSecretFields(isChecked) {
    document.querySelectorAll('#secretProfileCheckboxes input[type="checkbox"]').forEach(cb => { cb.checked = isChecked; });
    saveSettings();
  }
  function resetSecretFields() {
    document.querySelectorAll('#secretProfileCheckboxes input[type="checkbox"]').forEach(cb => { cb.checked = defaultSecretChecked.includes(cb.value); });
    saveSettings();
  }

  // モード切替
  function toggleSecretMode() {
    if (document.getElementById('isSecretProfile').checked) {
      document.getElementById('includeTraits').checked = false;
      document.getElementById('includeWeaponsProfile').checked = false;
      document.getElementById('includeItems').checked = false;
      document.getElementById('includePersonalData').checked = false;
    }
    saveSettings();
  }
  function toggleNormalMode() {
    const traits = document.getElementById('includeTraits').checked;
    const weapons = document.getElementById('includeWeaponsProfile').checked;
    const items = document.getElementById('includeItems').checked;
    const personal = document.getElementById('includePersonalData').checked;
    if (traits || weapons || items || personal) {
      document.getElementById('isSecretProfile').checked = false;
    }
    saveSettings();
  }
  function toggleColumnInput() {
    const isChecked = document.getElementById('updateColumns').checked;
    const inputArea = document.getElementById('tekeyColumnInputArea');
    inputArea.style.display = isChecked ? 'block' : 'none';
  }

  // プリセット適用
  function applyPreset(type) {
    const btns = document.querySelectorAll('.preset-btn');
    btns.forEach(b => b.classList.remove('active'));
    
    if (type === 'tekey') document.getElementById('btn-tekey').classList.add('active');
    if (type === 'ccfolia') document.getElementById('btn-ccfolia').classList.add('active');
    
    const chatPaletteIds = [
      'outputAllSkills', 'addBrackets', 'useFolding', 'useVariable', 
      'includeStatVariables', 'includeStatx5', 'includeStatRes', 
      'includeCombination', 'includeCommands', 'includeDB', 
      'includeWeaponsPalette', 'useSkillCap', 'isSecret'
    ];
    chatPaletteIds.forEach(id => { const el = document.getElementById(id); if(el) el.checked = false; });

    // 既存のincludeInsanityCalcをリセット
    const insanityCalc = document.getElementById('includeInsanityCalc');
    if(insanityCalc) insanityCalc.checked = false;

    if (type === 'off') { 
      toggleMAOption(); 
      toggleCommandOption(); // ★追加
      saveSettings(); 
      return; 
    }

    const config = {
      'outputAllSkills': true, 'useVariable': true, 'includeStatx5': true, 'includeStatRes': true,
      'includeCombination': true, 'includeCommands': true, 'includeDB': true,
      'includeWeaponsPalette': true, 'useSkillCap': true,
    };
    if (type === 'tekey') { 
      config['useFolding'] = true; 
      config['includeStatVariables'] = true; 
      if(insanityCalc) insanityCalc.checked = true; // ★Tekey時はON
    } 
    else if (type === 'ccfolia') { 
      config['useFolding'] = false; 
      config['includeStatVariables'] = false; 
      if(insanityCalc) insanityCalc.checked = false; // ★ココフォリア時はOFF
    }

    for (const [id, value] of Object.entries(config)) { const el = document.getElementById(id); if(el) el.checked = value; }
    
    const statVarEl = document.getElementById('includeStatVariables');
    if(statVarEl) statVarEl.checked = (config['includeStatVariables'] !== undefined) ? config['includeStatVariables'] : false;
    
    toggleMAOption();
    toggleCommandOption(); // ★追加: プリセット適用時にサブオプションの表示を更新
    saveSettings();
  }

  // カラープレビュー・モーダル
  function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt("0x" + hex[1] + hex[1]); g = parseInt("0x" + hex[2] + hex[2]); b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
      r = parseInt("0x" + hex[1] + hex[2]); g = parseInt("0x" + hex[3] + hex[4]); b = parseInt("0x" + hex[5] + hex[6]);
    }
    return {r, g, b};
  }
  function rgbToHsv(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max; var d = max - min;
    s = max == 0 ? 0 : d / max;
    if (max == min) h = 0;
    else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, v];
  }
  function findClosestColorName(hexColor) {
    const target = hexToRgb(hexColor);
    let minDiff = Infinity; let closest = null;
    colorNames.forEach(c => {
      const current = hexToRgb(c.hex);
      const diff = Math.pow(current.r - target.r, 2) + Math.pow(current.g - target.g, 2) + Math.pow(current.b - target.b, 2);
      if (diff < minDiff) { minDiff = diff; closest = c; }
    });
    return closest ? closest.name : "";
  }
  function initColorPreview() {
    const picker = document.getElementById('previewColorPicker');
    const textInput = document.getElementById('previewColorText');
    const nameDisplay = document.getElementById('colorNameDisplay');
    if (!picker || !textInput) return;

    const updatePreview = (color) => {
      document.querySelectorAll('.preview-box').forEach(box => {
        box.style.color = color;
        const span = box.querySelector('.preview-text');
        if(span) span.textContent = `サンプルテキスト ${color}`;
      });
      if(nameDisplay) {
        const name = findClosestColorName(color);
        nameDisplay.textContent = name ? `近しい色の名前：${name}` : "";
      }
    };
    picker.addEventListener('input', (e) => {
      const color = e.target.value.toUpperCase(); textInput.value = color; updatePreview(color);
    });
    textInput.addEventListener('input', (e) => {
      let color = e.target.value;
      if (!color.startsWith('#') && /^[0-9A-Fa-f]{3,6}$/.test(color)) color = '#' + color;
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) { picker.value = color; updatePreview(color); }
    });
    updatePreview(picker.value);
  }
  function setRandomColor() {
    const randomColor = "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
    const picker = document.getElementById('previewColorPicker');
    picker.value = randomColor; 
    document.getElementById('previewColorText').value = randomColor;
    picker.dispatchEvent(new Event('input'));
  }
  function copyColorCode() {
    const code = document.getElementById('previewColorText').value;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.querySelector('.color-action-btn[title="カラーコードをコピー"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>OK!`;
      setTimeout(() => { btn.innerHTML = originalText; }, 1500);
    });
  }
  function openColorPalette(type) {
    let colors = [];
    let title = "";
    if (type === 'web') { colors = [...webColors]; title = "Web原色"; }
    else if (type === 'wa') { colors = [...waColors]; title = "和色"; }
    else if (type === 'yo') { colors = [...yoColors]; title = "洋色"; }
    
    colors.sort((a, b) => {
      const rgbA = hexToRgb(a.hex); const hsvA = rgbToHsv(rgbA.r, rgbA.g, rgbA.b);
      const rgbB = hexToRgb(b.hex); const hsvB = rgbToHsv(rgbB.r, rgbB.g, rgbB.b);
      return (hsvA[0] - hsvB[0]) || (hsvA[1] - hsvB[1]) || (hsvB[2] - hsvA[2]);
    });

    document.getElementById('colorModalTitle').textContent = title + "一覧";
    const grid = document.getElementById('colorGrid');
    grid.innerHTML = "";
    
    colors.forEach(c => {
      const item = document.createElement('div');
      item.className = 'color-item';
      item.onclick = () => applyColor(c.hex);
      
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch-box';
      swatch.style.backgroundColor = c.hex;
      
      const name = document.createElement('div');
      name.className = 'color-item-name';
      if (c.name.includes(' ')) {
        const parts = c.name.split(' ');
        name.innerHTML = `${parts[0]}<br><span style="font-size:9px; font-weight:normal;">${parts[1]}</span>`;
      } else { name.textContent = c.name; }
      
      const hex = document.createElement('div');
      hex.className = 'color-item-hex';
      hex.textContent = c.hex;
      
      item.appendChild(swatch); item.appendChild(name); item.appendChild(hex);
      grid.appendChild(item);
    });
    openModal('colorListModal');
  }
  function applyColor(hex) {
    const picker = document.getElementById('previewColorPicker');
    picker.value = hex; 
    document.getElementById('previewColorText').value = hex;
    picker.dispatchEvent(new Event('input'));
    closeModal('colorListModal');
  }

  // 共通UI操作
  function toggleShareMenu(event) {
    event.stopPropagation();
    document.getElementById('shareMenu').classList.toggle('active');
  }
  function openModal(modalId) { document.getElementById(modalId).classList.add('active'); }
  function closeModal(modalId) {
    if(modalId && typeof modalId === 'string') document.getElementById(modalId).classList.remove('active');
    else document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
  function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
  }
  function updateThemeIcon(theme) {
    const iconSvg = document.getElementById('themeIcon');
    if (theme === 'dark') {
      // 修正版：シンプルで見やすい太陽のアイコン（Wb Sunny）
      iconSvg.innerHTML = '<path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.79 1.41-1.41-1.79-1.79-1.41 1.41zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/>';
    } else {
      // 月のアイコン（変更なし）
      iconSvg.innerHTML = '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>';
    }
  }
  function copyToClipboard(elementId, buttonId) {
    const copyText = document.getElementById(elementId);
    if (!copyText.value) return;
    navigator.clipboard.writeText(copyText.value).then(() => {
      const btn = document.getElementById(buttonId);
      const originalText = btn.innerText;
      btn.innerText = "コピーしました！";
      btn.classList.add('btn-copied');
      setTimeout(() => { btn.innerText = originalText; btn.classList.remove('btn-copied'); }, 2000);
    });
  }

  // ===============================================
  // ▼▼▼ シェア機能（ここだけ安全に修正！） ▼▼▼
  // ===============================================

  function shareCopyLink() {
    // 確実に文字列としてURLを指定
    var url = "https://nununu-tatata.github.io/404-tool/";
    navigator.clipboard.writeText(url).then(() => {
      document.getElementById('shareMenu').classList.remove('active'); 
      const tooltip = document.getElementById('shareTooltip');
      if(tooltip) {
        tooltip.classList.add('show');
        setTimeout(() => { tooltip.classList.remove('show'); }, 2000);
      }
    });
  }

  function shareToX() {
    var url = "https://nununu-tatata.github.io/404-tool/";
    var text = "CoCチャパレ＆コマ作成ツール";
    var hashtags = "nukonuko_4";
    // 文字列結合(+)を使ってエラーを防ぐ
    var shareUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + 
                   "&url=" + encodeURIComponent(url) + 
                   "&hashtags=" + encodeURIComponent(hashtags);
    window.open(shareUrl, '_blank');
    document.getElementById('shareMenu').classList.remove('active'); 
  }

  function shareToMisskey() {
    var url = "https://nununu-tatata.github.io/404-tool/";
    var text = "CoCチャパレ＆コマ作成ツール";
    var shareUrl = "https://misskey-hub.net/share/?text=" + encodeURIComponent(text) + 
                   "&url=" + encodeURIComponent(url);
    window.open(shareUrl, '_blank');
    document.getElementById('shareMenu').classList.remove('active'); 
  }

  function shareToBluesky() {
    var url = "https://nununu-tatata.github.io/404-tool/";
    var text = "CoCチャパレ＆コマ作成ツール";
    var shareUrl = "https://bsky.app/intent/compose?text=" + encodeURIComponent(text + " " + url);
    window.open(shareUrl, '_blank');
    document.getElementById('shareMenu').classList.remove('active');
  }

  function shareToDiscord() {
    var url = "https://nununu-tatata.github.io/404-tool/";
    var text = "CoCチャパレ＆コマ作成ツール\n" + url;
    navigator.clipboard.writeText(text).then(() => {
      const confirmed = confirm("紹介用テキストとURLをコピーしました！\n\nDiscordを開いて貼り付けますか？\n（OKを押すとDiscordのブラウザ版が開きます）");
      if (confirmed) window.open("https://discord.com/channels/@me", '_blank');
    });
    document.getElementById('shareMenu').classList.remove('active');
  }

  // ★追加: MAオプションの表示切り替え
  function toggleMAOption() {
    const mainCb = document.getElementById('includeCombination');
    const subArea = document.getElementById('maOptionContainer');
    if (mainCb && subArea) {
      subArea.style.display = mainCb.checked ? 'flex' : 'none';
    }
    // 設定保存も兼ねる
    if (typeof saveSettings === 'function') saveSettings();
  }

  // ★追加: コマンドオプションの表示切り替え
  function toggleCommandOption() {
    const mainCb = document.getElementById('includeCommands');
    const subArea = document.getElementById('commandOptionContainer');
    if (mainCb && subArea) {
      subArea.style.display = mainCb.checked ? 'flex' : 'none';
    }
    if (typeof saveSettings === 'function') saveSettings();
  }