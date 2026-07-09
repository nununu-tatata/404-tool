// --- 設定管理・初期化 ---

  window.onload = function() {
    initSkillCheckboxes();
    initSecretProfileCheckboxes();
    initColorPreview(); 
    
    loadSettings();
    initAutoSave();

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      updateThemeIcon('dark');
    }

    // シェアメニュー外クリックで閉じる処理
    window.addEventListener('click', function(e) {
      const shareMenu = document.getElementById('shareMenu');
      const shareBtn = document.querySelector('.share-main-btn');
      if (!shareBtn.contains(e.target) && !shareMenu.contains(e.target)) {
        shareMenu.classList.remove('active');
      }
    });
  };

  function initAutoSave() {
    const inputs = document.querySelectorAll('.left-column input, .left-column select');
    inputs.forEach(el => {
      el.addEventListener('change', saveSettings);
    });
  }

  function saveSettings() {
    const savedSkillList = Array.from(document.querySelectorAll('#skillCheckboxes input:checked')).map(cb => cb.value);
    const savedSecretList = Array.from(document.querySelectorAll('#secretProfileCheckboxes input:checked')).map(cb => cb.value);

    const settings = {
      outputAllSkills: document.getElementById('outputAllSkills').checked,
      addBrackets: document.getElementById('addBrackets').checked,
      useFolding: document.getElementById('useFolding').checked,
      useVariable: document.getElementById('useVariable').checked,
      includeStatVariables: document.getElementById('includeStatVariables').checked,
      includeStatx5: document.getElementById('includeStatx5').checked,
      includeStatRes: document.getElementById('includeStatRes').checked,
      includeCombination: document.getElementById('includeCombination').checked,
      forceMACombination: document.getElementById('forceMACombination').checked,
      includeCommands: document.getElementById('includeCommands').checked,
      includeInsanityCalc: document.getElementById('includeInsanityCalc') ? document.getElementById('includeInsanityCalc').checked : false, // ★追加
      includeDB: document.getElementById('includeDB').checked,
      includeWeaponsPalette: document.getElementById('includeWeaponsPalette').checked,
      useSkillCap: document.getElementById('useSkillCap').checked,
      isSecret: document.getElementById('isSecret').checked,
      always1d100Sanc: document.getElementById('always1d100Sanc') ? document.getElementById('always1d100Sanc').checked : false,
      includeStatusProfile: document.getElementById('includeStatusProfile').checked,
      includeSkillListProfile: document.getElementById('includeSkillListProfile').checked,
      includeTraits: document.getElementById('includeTraits').checked,
      includeWeaponsProfile: document.getElementById('includeWeaponsProfile').checked,
      includeItems: document.getElementById('includeItems').checked,
      includePersonalData: document.getElementById('includePersonalData').checked,
      isSecretProfile: document.getElementById('isSecretProfile').checked,
      updateColumns: document.getElementById('updateColumns').checked, 

      diceCommand: document.querySelector('input[name="diceCommand"]:checked').value,
      statRef: document.querySelector('input[name="statRef"]:checked').value,

      statMultiplierValue: document.getElementById('statMultiplierValue').value,
      skillCapValue: document.getElementById('skillCapValue').value,

      savedSkillList: savedSkillList,
      savedSecretList: savedSecretList
    };
    localStorage.setItem('cocToolSettings', JSON.stringify(settings));
  }

  function loadSettings() {
    const saved = localStorage.getItem('cocToolSettings');
    if (!saved) return;
    
    try {
      const s = JSON.parse(saved);
      const setCb = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
      
      setCb('outputAllSkills', s.outputAllSkills);
      setCb('addBrackets', s.addBrackets);
      setCb('useFolding', s.useFolding);
      setCb('useVariable', s.useVariable);
      setCb('includeStatVariables', s.includeStatVariables);
      setCb('includeStatx5', s.includeStatx5);
      setCb('includeStatRes', s.includeStatRes);
      setCb('includeCombination', s.includeCombination);
      setCb('forceMACombination', s.forceMACombination);
      setCb('includeCommands', s.includeCommands);
      setCb('includeInsanityCalc', s.includeInsanityCalc); // ★追加
      setCb('includeDB', s.includeDB);
      setCb('includeWeaponsPalette', s.includeWeaponsPalette);
      setCb('useSkillCap', s.useSkillCap);
      setCb('isSecret', s.isSecret);
      setCb('always1d100Sanc', s.always1d100Sanc);
      setCb('includeStatusProfile', s.includeStatusProfile);
      setCb('includeSkillListProfile', s.includeSkillListProfile);
      setCb('includeTraits', s.includeTraits);
      setCb('includeWeaponsProfile', s.includeWeaponsProfile);
      setCb('includeItems', s.includeItems);
      setCb('includePersonalData', s.includePersonalData);
      setCb('isSecretProfile', s.isSecretProfile);
      setCb('updateColumns', s.updateColumns);

      const setRadio = (name, val) => {
        const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
        if(el) el.checked = true;
      }
      if(s.diceCommand) setRadio('diceCommand', s.diceCommand);
      if(s.statRef) setRadio('statRef', s.statRef);

      if(s.statMultiplierValue) document.getElementById('statMultiplierValue').value = s.statMultiplierValue;
      if(s.skillCapValue) document.getElementById('skillCapValue').value = s.skillCapValue;
      
      if (s.savedSkillList) {
        const skillBoxes = document.querySelectorAll('#skillCheckboxes input');
        skillBoxes.forEach(cb => { cb.checked = s.savedSkillList.includes(cb.value); });
      }
      if (s.savedSecretList) {
        const secretBoxes = document.querySelectorAll('#secretProfileCheckboxes input');
        secretBoxes.forEach(cb => { cb.checked = s.savedSecretList.includes(cb.value); });
      }
      
      toggleColumnInput();
      toggleMAOption(); 
      toggleCommandOption(); // ★追加: 読み込み時にサブオプションの表示を更新
      
      if (s.isSecretProfile) toggleSecretMode();
      else toggleNormalMode();
      
    } catch(e) {
      console.error("設定の読み込みに失敗しました", e);
    }
  }

  function getParams() {
    const secretCheckedBoxes = document.querySelectorAll('#secretProfileCheckboxes input:checked');
    const secretProfileList = Array.from(secretCheckedBoxes).map(cb => cb.value);
    const checkedBoxes = document.querySelectorAll('#skillCheckboxes input:checked');
    const forceList = Array.from(checkedBoxes).map(cb => cb.value);

    const correctionTargets = [];
    const correctionOps = [];
    const correctionVals = [];
    for(let i=1; i<=5; i++) {
      correctionTargets.push(document.getElementById('correctionTarget'+i).value);
      correctionOps.push(document.getElementById('correctionOp'+i).value);
      correctionVals.push(document.getElementById('correctionVal'+i).value);
    }

    return {
      url: document.getElementById('urlInput').value,
      diceCommand: document.querySelector('input[name="diceCommand"]:checked').value,
      isOutputAll: document.getElementById('outputAllSkills').checked,
      statReference: document.querySelector('input[name="statRef"]:checked').value,
      isAddBrackets: document.getElementById('addBrackets').checked,
      isUseFolding: document.getElementById('useFolding').checked,
      isUseVariable: document.getElementById('useVariable').checked,
      includeStatx5: document.getElementById('includeStatx5').checked,
      statMultiplierValue: document.getElementById('statMultiplierValue').value,
      includeStatRes: document.getElementById('includeStatRes').checked,
      includeCombination: document.getElementById('includeCombination').checked,
      forceMACombination: document.getElementById('forceMACombination').checked,
      includeCommands: document.getElementById('includeCommands').checked,
      includeInsanityCalc: document.getElementById('includeInsanityCalc') ? document.getElementById('includeInsanityCalc').checked : false, // ★追加
      isSecret: document.getElementById('isSecret').checked,
      always1d100Sanc: document.getElementById('always1d100Sanc') ? document.getElementById('always1d100Sanc').checked : false,
      includeDB: document.getElementById('includeDB').checked,
      useSkillCap: document.getElementById('useSkillCap').checked,
      skillCapValue: document.getElementById('skillCapValue').value,
      correctionTargets: correctionTargets,
      correctionOps: correctionOps,
      correctionVals: correctionVals,
      includeTraits: document.getElementById('includeTraits').checked,
      includePersonalData: document.getElementById('includePersonalData').checked,
      isSecretProfile: document.getElementById('isSecretProfile').checked,
      includeWeaponsPalette: document.getElementById('includeWeaponsPalette').checked,
      includeWeaponsProfile: document.getElementById('includeWeaponsProfile').checked,
      includeItems: document.getElementById('includeItems').checked,
      includeStatVariables: document.getElementById('includeStatVariables').checked,
      includeStatusProfile: document.getElementById('includeStatusProfile').checked,
      includeSkillListProfile: document.getElementById('includeSkillListProfile').checked,
      secretProfileList: secretProfileList,
      forceList: forceList
    };
  }