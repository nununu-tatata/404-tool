// --- API連携・出力処理 (API版) ---

const GAS_URL = "https://script.google.com/macros/s/AKfycbyJMXP7cTgB3pPolonW3DERVkYZjfb7OyraV_6DWj7clVcgyLMbMOrVxMaOFDE4N8U4Vg/exec";

function callGasApi(action, params, onSuccess, onFailure) {
  fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({ action: action, params: params })
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

function runScript() {
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
  if(tekeyBtn) tekeyBtn.disabled = true;

  // 2. ココフォリアボタンを「無効」で再描画（IDを修正済み）
  var container = document.getElementById('ccfolia-btn-container');
  if(container) {
    container.innerHTML = `
      <button id="btn-output-ccfolia" class="ccfolia-btn" disabled style="opacity: 0.6; cursor: not-allowed;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z"/></svg>
        ココフォリアのコマを出力
      </button>`;
  }
  
  // 3. エリアリセット
  paletteArea.value = ""; 
  profileArea.value = "";
  ccfoliaJsonArea.value = "";
  if(nameInput) nameInput.value = "";

  var functionParams = [
    params.url, params.isOutputAll, params.forceList, params.isAddBrackets, params.isUseFolding, 
    params.isUseVariable, params.includeStatx5, params.includeStatRes, params.includeCommands, 
    params.includeInsanityCalc, 
    params.diceCommand, params.isSecret, params.always1d100Sanc, params.statMultiplierValue, params.includeDB, 
    params.useSkillCap, params.skillCapValue, params.includeCombination, 
    params.forceMACombination, 
    params.statReference, 
    params.correctionTargets, params.correctionOps, params.correctionVals, params.includeTraits, 
    params.includePersonalData, params.isSecretProfile, params.secretProfileList, 
    params.includeWeaponsPalette, params.includeWeaponsProfile,
    params.includeStatVariables, params.includeStatusProfile, params.includeSkillListProfile,
    params.includeItems
  ];

  callGasApi('generateTekeyPalette', functionParams, 
    function(data) { // success
      if (typeof data === 'object') {
        paletteArea.value = data.palette;
        profileArea.value = data.profile;
        ccfoliaJsonArea.value = data.ccfoliaJson;
        
        try {
          var json = JSON.parse(data.ccfoliaJson);
          if(json && json.data && json.data.name && nameInput) {
            nameInput.value = json.data.name;
          }
        } catch(e) { console.error(e); }

        // ★★★ 4. ボタンを「有効」に交換（IDを修正済み） ★★★
        if(container) {
          container.innerHTML = `
            <button id="btn-output-ccfolia" class="ccfolia-btn" onclick="outputCCFolia()" style="opacity: 1; cursor: pointer; pointer-events: auto;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z"/></svg>
              ココフォリアのコマを出力
            </button>`;
        }

        if(tekeyBtn) tekeyBtn.disabled = false;
      } else {
        paletteArea.value = data;
      }
      
      btn.disabled = false;
      btn.textContent = "チャットパレットを作成";
    }, 
    function(error) { // failure
      paletteArea.value = "通信エラー: " + error;
      btn.disabled = false;
      btn.textContent = "チャットパレットを作成";
      
      // エラー時もクリック確認用に有効化
      if(container) {
          container.innerHTML = `
            <button id="btn-output-ccfolia" class="ccfolia-btn" onclick="outputCCFolia()" style="opacity: 1; cursor: pointer; pointer-events: auto;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z"/></svg>
              ココフォリアのコマを出力
            </button>`;
      }
    }
  );
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

  var tekeyBtn = document.getElementById('sendTekeyBtn');
  var originalText = tekeyBtn.textContent;
  tekeyBtn.disabled = true; 
  tekeyBtn.textContent = "送信中...";

  var params = typeof getParams === 'function' ? getParams() : {};
  
  var editedPalette = document.getElementById('resultArea').value;
  var editedProfile = document.getElementById('profileArea').value;
  var manualName = document.getElementById('characterNameInput').value;

  var functionParams = [
    params.url, params.isOutputAll, params.forceList, params.isAddBrackets, params.isUseFolding, 
    params.isUseVariable, params.includeStatx5, params.includeStatRes, params.includeCommands, 
    params.includeInsanityCalc,
    params.diceCommand, params.isSecret, params.always1d100Sanc, params.statMultiplierValue, params.includeDB, 
    params.useSkillCap, params.skillCapValue, params.includeCombination, 
    params.forceMACombination, 
    params.statReference, 
    params.correctionTargets, params.correctionOps, params.correctionVals, params.includeTraits, 
    params.includePersonalData, params.isSecretProfile, params.secretProfileList, 
    params.includeWeaponsPalette, params.includeWeaponsProfile, 
    roomId, roomPass, updateColumns, columnList,
    params.includeStatVariables, params.includeStatusProfile, params.includeSkillListProfile,
    params.includeItems,
    editedPalette, editedProfile,
    manualName
  ];

  callGasApi('sendToTekey', functionParams, 
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
