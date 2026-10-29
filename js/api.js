// --- API連携・出力処理 (API版) ---
// チャパレの作成はページ内 (sources.js / generator.js) で行い、
// Tekeyへの送信だけGAS (APIキーを隠すため) を通します。

const GAS_URL = "https://script.google.com/macros/s/AKfycbyJMXP7cTgB3pPolonW3DERVkYZjfb7OyraV_6DWj7clVcgyLMbMOrVxMaOFDE4N8U4Vg/exec";

function callGasApi(action, params, onSuccess, onFailure) {
  // GASのCORSやPOSTリダイレクト問題を回避するため、フォームデータ形式で送信します
  var formData = new URLSearchParams();
  formData.append('action', action);
  formData.append('params', JSON.stringify(params));

  fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
    },
    body: formData.toString()
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      if (onSuccess) onSuccess(result.data);
    } else {
      if (onFailure) onFailure(result.error);
    }
  })
  .catch(error => {
    if (onFailure) onFailure(error.toString());
  });
}

// 最後に作成した結果 (Tekey送信で使う)
var lastResult = null;

var CCFOLIA_BTN_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z"/></svg>';

function setCcfoliaButton(enabled) {
  var container = document.getElementById('ccfolia-btn-container');
  if (!container) return;
  if (enabled) {
    container.innerHTML = '<button id="btn-output-ccfolia" class="ccfolia-btn" onclick="outputCCFolia()" style="opacity: 1; cursor: pointer; pointer-events: auto;">' + CCFOLIA_BTN_ICON + ' ココフォリアのコマを出力</button>';
  } else {
    container.innerHTML = '<button id="btn-output-ccfolia" class="ccfolia-btn" disabled style="opacity: 0.6; cursor: not-allowed;">' + CCFOLIA_BTN_ICON + ' ココフォリアのコマを出力</button>';
  }
}

async function runScript() {
  var params = typeof getParams === 'function' ? getParams() : {};
  if (typeof saveSettings === 'function') saveSettings();

  var btn = document.querySelector('.create-btn');
  var tekeyBtn = document.getElementById('sendTekeyBtn');

  var paletteArea = document.getElementById('resultArea');
  var profileArea = document.getElementById('profileArea');
  var ccfoliaJsonArea = document.getElementById('ccfoliaJsonArea');
  var nameInput = document.getElementById('characterNameInput');

  // 1. 作成ボタンロック
  btn.disabled = true;
  btn.textContent = "作成中...";
  if (tekeyBtn) tekeyBtn.disabled = true;
  setCcfoliaButton(false);

  // 2. エリアリセット
  paletteArea.value = "";
  profileArea.value = "";
  ccfoliaJsonArea.value = "";
  if (nameInput) nameInput.value = "";
  lastResult = null;

  // 3. キャラシを読み込んで作成
  try {
    var chara = await loadCharacter(params.url);
    var data = generateOutputs(chara, params);

    paletteArea.value = data.palette;
    profileArea.value = data.profile;
    ccfoliaJsonArea.value = data.ccfoliaJson;
    if (nameInput) nameInput.value = chara.name || "";
    lastResult = data;

    setCcfoliaButton(true);
    if (tekeyBtn) tekeyBtn.disabled = false;
  } catch (e) {
    console.error(e);
    paletteArea.value = (e && e.message) ? e.message : ("エラー:\n" + e);
  }

  btn.disabled = false;
  btn.textContent = "チャットパレットを作成";
}

function outputCCFolia() {
  var jsonRaw = document.getElementById("ccfoliaJsonArea").value;
  if (!jsonRaw) { alert("データがありません"); return; }

  var editedPalette = document.getElementById('resultArea').value;
  var editedProfile = document.getElementById('profileArea').value;
  var manualName = document.getElementById('characterNameInput').value;

  try {
    var jsonObj = JSON.parse(jsonRaw);
    if(jsonObj.data) {
      jsonObj.data.commands = editedPalette;
      jsonObj.data.memo = editedProfile;
      if(manualName) {
        jsonObj.data.name = manualName;
      }
    }

    var newJsonText = JSON.stringify(jsonObj);
    navigator.clipboard.writeText(newJsonText).then(function() {

      var btn = document.getElementById("btn-output-ccfolia");
      var originalHTML = btn.innerHTML;

      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16" fill="currentColor"><path d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"/></svg> コピーしました！';
      btn.style.backgroundColor = "#555";

      setTimeout(function() {
        btn.innerHTML = originalHTML;
        btn.style.backgroundColor = "";
      }, 2000);
    });
  } catch(e) {
    alert("JSONデータの作成に失敗しました: " + e);
  }
}

function sendToTekey() {
  var roomId = document.getElementById('tekeyRoomId').value;
  var roomPass = document.getElementById('tekeyPassword').value;
  var updateColumns = document.getElementById('updateColumns').checked;
  var columnList = document.getElementById('tekeyColumnList').value;

  if (!roomId) { alert('ルームIDは必須です！'); return; }

  var jsonRaw = document.getElementById('ccfoliaJsonArea').value;
  if (!jsonRaw || !lastResult) { alert('先に「チャットパレットを作成」ボタンを押してください。'); return; }

  var tekeyBtn = document.getElementById('sendTekeyBtn');
  var originalText = tekeyBtn.textContent;
  tekeyBtn.disabled = true;
  tekeyBtn.textContent = "送信中...";

  // 画面で編集した後の内容を送る
  var editedPalette = document.getElementById('resultArea').value;
  var editedProfile = document.getElementById('profileArea').value;
  var manualName = document.getElementById('characterNameInput').value;

  var cdata = JSON.parse(jsonRaw).data;
  var values = cdata.status.map(function(s) { return s.label + ':' + s.value; }).join(',');
  values += ',不定:' + lastResult.futeiVal;

  var functionParams = [
    roomId, roomPass, updateColumns, columnList,
    manualName || cdata.name, cdata.externalUrl || "", editedProfile, cdata.initiative, values, editedPalette
  ];

  callGasApi('sendTekeyCharacter', functionParams,
    function(msg) { // success
      alert(msg);
      tekeyBtn.disabled = false;
      tekeyBtn.textContent = originalText;

      if (msg && msg.includes('完了')) {
        var updateColsCheckbox = document.getElementById('updateColumns');
        if (updateColsCheckbox && updateColsCheckbox.checked) {
          updateColsCheckbox.checked = false;
          if (typeof toggleColumnInput === 'function') {
            toggleColumnInput();
          }
        }
      }
    },
    function(error) { // failure
      alert("送信エラー: " + error);
      tekeyBtn.disabled = false;
      tekeyBtn.textContent = originalText;
    }
  );
}

function sendColumnsOnly() {
  var roomId = document.getElementById('tekeyRoomId').value;
  var roomPass = document.getElementById('tekeyPassword').value;
  var columnList = document.getElementById('tekeyColumnList').value;

  if (!roomId) { alert('ルームIDは必須です！'); return; }
  if (!columnList) { alert('カラム項目が入力されていません！'); return; }

  var colBtn = document.getElementById('sendColumnsBtn');
  var originalText = colBtn.textContent;
  colBtn.disabled = true;
  colBtn.textContent = "設定中...";

  var functionParams = [roomId, roomPass, columnList];

  callGasApi('updateTekeyColumnsOnly', functionParams,
    function(msg) { // success
      alert(msg);
      colBtn.disabled = false;
      colBtn.textContent = originalText;
    },
    function(error) { // failure
      alert("設定エラー: " + error);
      colBtn.disabled = false;
      colBtn.textContent = originalText;
    }
  );
}
