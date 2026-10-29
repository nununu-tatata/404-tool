// --- チャットパレット・プロフィール生成 ---
// sources.js でそろえた chara から、チャパレ・プロフィール・ココフォリア用データを作ります。

  // ==========================================
  // メモ欄解析・抽出ロジック
  // ==========================================
  function extractTraitsFromMemo(rawMemo) {
    const memoLines = rawMemo.split(/\r\n|\r|\n/);

    const traitKeywords = [
      "君は風邪を引かない","大きな体","素早い","オシャレ","天才","強固な意志","勉強家","幸運のお守り",
      "一族伝来の宝物","予期せぬ協力者","手先が器用","影が薄い","親の七光り","愛書家","鋭い洞察力",
      "アウトドア派","珍しい技能","芸術的才能","バイリンガル","前職","天気予報士","プロ・ドライバー",
      "飛ばし屋","戦士","銃火器の達人","格闘センスの持ち主","俊敏","信頼のおける人","スポーツ万能",
      "平凡な容姿","目つきが悪い","方向音痴","異性が苦手","動物に嫌われる","不思議ちゃん","寄せ餌",
      "眼鏡をかけている","大切なもの","暗黒の祖先","夜に弱い","動物に好かれる","斜め上からの発想",
      "失敗は発明の母","ペット","おおらか","異物への耐性","潜水の名人","大酒飲み","ド根性","受け身",
      "奇妙な幸運","投擲の才能","鋼の筋力","実は生きていた","急所を見抜く","急速な回復力",
      "不屈の精神力","マニア・コレクター","行方不明の家族","好意を寄せられている"
    ];

    let extractedTraits = [];
    let extractedTokki = [];

    let isTraitMode = false;
    let isTokkiMode = false;

    let linesSinceTraitHeader = 0;
    const TRAIT_SEARCH_LIMIT = 6;  // 特徴は6行まで

    let linesSinceTokkiHeader = 0;
    const TOKKI_SEARCH_LIMIT = 3;  // 特記は3行まで

    let wasPrevEmpty = false;

    for (let i = 0; i < memoLines.length; i++) {
      const rawLine = memoLines[i];
      const tLine = rawLine.trim();

      // 1. 空行判定
      if (!tLine) {
        isTraitMode = false;
        isTokkiMode = false;
        wasPrevEmpty = true;
        continue;
      }

      // 2. 区切り線判定
      if (tLine.match(/^(.)\1{4,}$/)) {
        isTraitMode = false;
        isTokkiMode = false;
        wasPrevEmpty = false;
        continue;
      }

      // 3. 別の見出し判定 (記号があっても特徴キーワードが含まれていればスルーしない)
      if (tLine.match(/^[◆■▼●【\[]/) && !tLine.includes("特徴") && !tLine.includes("特記")) {
        const containsKeyword = traitKeywords.some(key => tLine.includes(key));
        if (!containsKeyword) {
          isTraitMode = false;
          isTokkiMode = false;
          wasPrevEmpty = false;
          continue;
        }
      }

      // 4. 短い単語判定
      if ((isTraitMode || isTokkiMode) && wasPrevEmpty) {
        if (tLine.length <= 5 && !tLine.match(/[、。,.]$/)) {
          isTraitMode = false;
          isTokkiMode = false;
          wasPrevEmpty = false;
          continue;
        }
      }

      // 5. モード開始判定
      if (tLine.match(/^[【\[(（<《■◆▼●・\s]*特記/)) {
        isTraitMode = false;
        isTokkiMode = true;
        linesSinceTokkiHeader = 0;
        if (tLine.replace(/[【】:：\s]/g, "").length > "特記".length) {
          extractedTokki.push(rawLine);
        }
        wasPrevEmpty = false;
        continue;
      }

      if (tLine.match(/^[【\[(（<《■◆▼●・\s]*特徴/)) {
        isTokkiMode = false;
        isTraitMode = true;
        linesSinceTraitHeader = 0;
        if (tLine.replace(/[◆■▼●【】:：\s]/g, "").length > "特徴".length) {
          extractedTraits.push(rawLine);
        }
        wasPrevEmpty = false;
        continue;
      }

      // キーワードによる開始判定
      if (!isTraitMode && !isTokkiMode) {
        for (const key of traitKeywords) {
          if (tLine.includes(key)) {
            isTraitMode = true;
            linesSinceTraitHeader = 0;
            extractedTraits.push(rawLine);
            break;
          }
        }
        if (isTraitMode) {
          wasPrevEmpty = false;
          continue;
        }
      }

      // 6. 抽出実行
      if (isTraitMode) {
        if (linesSinceTraitHeader > TRAIT_SEARCH_LIMIT) {
          isTraitMode = false;
          wasPrevEmpty = false;
          continue;
        }
        if (!extractedTraits.includes(rawLine)) extractedTraits.push(rawLine);
        linesSinceTraitHeader++;
      } else if (isTokkiMode) {
        if (linesSinceTokkiHeader > TOKKI_SEARCH_LIMIT) {
          isTokkiMode = false;
          wasPrevEmpty = false;
          continue;
        }
        extractedTokki.push(rawLine);
        linesSinceTokkiHeader++;
      }
      wasPrevEmpty = false;
    }

    return { traits: extractedTraits, tokki: extractedTokki };
  }

  // ==========================================
  // 共通ヘルパー
  // ==========================================
  function chunkArray(arr, size) {
    const results = [];
    for (let i = 0; i < arr.length; i += size) results.push(arr.slice(i, i + size));
    return results;
  }

  // 技能の種類 (組み合わせロール用)
  function getSkillKind(baseName, displayName) {
    if (baseName.includes("マーシャルアーツ")) return "MA";
    if (baseName.includes("武道") || displayName.includes("武道")) return "Budo";
    if (baseName.includes("キック")) return "Kick";
    if (baseName.includes("こぶし") || baseName.includes("パンチ")) return "Punch";
    if (baseName.includes("頭突き")) return "Headbutt";
    if (/組み付き|組みつき|組付き/.test(baseName)) return "Grapple";
    if (baseName.includes("医学")) return "Medicine";
    if (baseName.includes("応急手当")) return "FirstAid";
    return null;
  }

  function getDamageRoll(name, dbSuffix, isAddBrackets, prefix) {
    let dice = "";
    if (name.includes("こぶし") || name.includes("パンチ")) dice = "1d3";
    else if (name.includes("キック")) dice = "1d6";
    else if (name.includes("頭突き")) dice = "1d4";

    if (dice) {
      const dName = isAddBrackets ? `【${name}ダメージ】` : `${name}ダメージ`;
      return `${prefix}${dice}${dbSuffix} ${dName}`;
    }
    return null;
  }

  // ==========================================
  // チャットパレット生成
  // ==========================================
  function generateOutputs(chara, p) {
    const forcedSkills = p.forceList || [];
    const baseCommand = p.diceCommand || "CCB";
    const capVal = parseInt(p.skillCapValue) || 100;
    const isAddBrackets = p.isAddBrackets;
    const isUseFolding = p.isUseFolding;

    function statValue(pair) {
      if (!pair) return 0;
      if (p.statReference === 'creation') return pair.init;
      return pair.cur || pair.init;
    }

    // DB (「+1D4」の先頭の + は外して {DB} に入れる)
    const dbValue = (chara.db || "").trim().replace(/^\+/, "");
    const isValidDB = (p.includeDB && dbValue && !["0", "-0", "なし", "-", "―"].includes(dbValue));
    const dbSuffixForUnarmed = isValidDB ? (dbValue.startsWith("-") ? "{DB}" : "+{DB}") : "";

    // メモ抽出
    const extractedData = extractTraitsFromMemo(chara.memo || "");
    if (extractedData.traits.length === 0 && chara.traitsText) {
      extractedData.traits = chara.traitsText.split(/\r\n|\r|\n|／/).map(t => t.trim()).filter(t => t);
    }

    let palette = [];
    // シークレットダイス：ダイスロールの先頭に S を付ける（:SAN+ などのコマンドには付けない）
    const prefix = p.isSecret ? "S" : "";
    const command = `${prefix}${baseCommand}`;
    const cbrBase = (baseCommand === "CC") ? "CBR" : "CBRB";
    const resBase = (baseCommand === "CC") ? "RES" : "RESB";
    const cbrCommand = `${prefix}${cbrBase}`;
    const resCommand = `${prefix}${resBase}`;

    function correctionFor(catKey) {
      let suffix = "";
      for (let k = 0; k < 5; k++) {
        const target = p.correctionTargets[k];
        const op = p.correctionOps[k];
        const cVal = parseInt(p.correctionVals[k]);
        if (target === "none" || isNaN(cVal)) continue;
        if (target === "all" || target === catKey) suffix += `${op}${cVal}`;
      }
      return suffix;
    }

    // コマンド
    if (p.includeCommands) {
      if (isUseFolding) palette.push("###コマンド");
      palette.push(":SAN+", ":SAN-", ":HP+", ":HP-", ":MP+", ":MP-", ":不定=");
      if (p.includeInsanityCalc) {
        palette.push("c{SAN}-{SAN}/5U 不定計算");
      }
      if (isUseFolding) palette.push("###");
    }

    // 空のダイスロール式 (SANの前)
    const emptyBracket = isAddBrackets ? " 【】" : "";
    palette.push(`${command}<= ${emptyBracket}`);

    // SAN
    if (chara.sanCur) {
      const sanName = isAddBrackets ? "【SAN値チェック】" : "SAN値チェック";
      const sanCommand = p.always1d100Sanc ? `${prefix}1d100` : command;
      palette.push(`${sanCommand}<={SAN} ${sanName}`);
    }

    // 能力値
    const stats = STAT_NAMES.map(name => ({ val: statValue(chara.stats[name]), name: name }));
    const specStats = [
      { val: statValue(chara.idea), name: "アイデア" },
      { val: statValue(chara.luck), name: "幸運" },
      { val: statValue(chara.know), name: "知識" }
    ];

    specStats.forEach(stat => {
      if (stat.val > 0) {
        let finalVal = stat.val;
        if (p.useSkillCap && finalVal > capVal) finalVal = capVal;
        let correctionSuffix = "";
        for (let k = 0; k < 5; k++) {
          const cVal = parseInt(p.correctionVals[k]);
          if (p.correctionTargets[k] === "all" && !isNaN(cVal)) correctionSuffix += `${p.correctionOps[k]}${cVal}`;
        }
        const outputName = `${stat.name}${correctionSuffix}`;
        const sName = isAddBrackets ? `【${outputName}】` : outputName;
        palette.push(`${command}<=${finalVal}${correctionSuffix} ${sName}`);
      }
    });

    palette.push('----------');

    // 技能
    let comboData = { MA: null, Budo: null, Kick: null, Punch: null, Headbutt: null, Grapple: null, Medicine: null, FirstAid: null };
    let profileSkills = [];

    SKILL_CATEGORIES.forEach(cat => {
      let categoryLines = [];

      chara.skills.filter(s => s.category === cat.key).forEach(skill => {
        let val = skill.value;
        if (p.useSkillCap && val > capVal) val = capVal;
        const { baseName, displayName, learned } = skill;

        if (learned) profileSkills.push(`${displayName}(${val})`);

        const kind = getSkillKind(baseName, displayName);
        if (kind) comboData[kind] = { name: displayName, val: val, isLearned: learned };

        if (p.isOutputAll || forcedSkills.includes(skill.key) || learned) {
          const correctionSuffix = correctionFor(cat.key);
          const outputName = `${displayName}${correctionSuffix}`;
          const finalName = isAddBrackets ? `【${outputName}】` : outputName;
          categoryLines.push(`${command}<=${val}${correctionSuffix} ${finalName}`);

          const damageLine = getDamageRoll(baseName, dbSuffixForUnarmed, isAddBrackets, prefix);
          if (damageLine) categoryLines.push(damageLine);

          if (baseName.includes("応急手当")) {
            const recoverLabel = isAddBrackets ? "【応急手当回復値】" : "応急手当回復値";
            categoryLines.push(`${prefix}1d3 ${recoverLabel}`);
          }
        }
      });

      // 武器 (戦闘技能の後ろに追加)
      if (p.includeWeaponsPalette && cat.key === "combat") {
        chara.weapons.forEach(w => {
          const dName = isAddBrackets ? `【${w.name}ダメージ】` : `${w.name}ダメージ`;
          let acc = parseInt(w.hit);
          if (!isNaN(acc)) {
            if (p.useSkillCap && acc > capVal) acc = capVal;
            let correctionSuffix = "";
            for (let k = 0; k < 5; k++) {
              const cVal = parseInt(p.correctionVals[k]);
              const target = p.correctionTargets[k];
              if ((target === "all" || target === "combat") && !isNaN(cVal)) correctionSuffix += `${p.correctionOps[k]}${cVal}`;
            }
            const outputName = `${w.name}${correctionSuffix}`;
            const wNameLabel = isAddBrackets ? `【${outputName}】` : outputName;
            categoryLines.push(`${command}<=${acc}${correctionSuffix} ${wNameLabel}`);
          }
          if (w.damage) {
            const dmgStr = w.damage.replace(/DB/gi, "{DB}");
            categoryLines.push(`${prefix}${dmgStr} ${dName}`);
          }
        });
      }

      if (categoryLines.length > 0) {
        if (isUseFolding) { palette.push(`###${cat.name}`); palette = palette.concat(categoryLines); palette.push(`###`); }
        else { palette = palette.concat(categoryLines); }
      }
    });

    // 組み合わせロール
    if (p.includeCombination) {
      let comboLines = [];
      const forceMA = p.forceMACombination;

      comboLines.push(`${cbrCommand}(,) +`);

      if (comboData.Medicine && comboData.FirstAid) {
        const m = comboData.Medicine, f = comboData.FirstAid;
        const comboName = isAddBrackets ? `【${m.name}+${f.name}】` : `${m.name}+${f.name}`;
        comboLines.push(`// --- 医学+応急手当 ---`);
        comboLines.push(`${cbrCommand}(${m.val},${f.val}) ${comboName}`);
        comboLines.push(`${prefix}(回復量) ` + (isAddBrackets ? `【医学+応急手当 回復】` : `医学+応急手当 回復`));
        comboLines.push(``);
      }

      // 武道・MA
      const artData = comboData.Budo || comboData.MA;

      if (artData && (artData.isLearned || forceMA)) {
        const artName = artData.name;
        const artVal = artData.val;
        const artLabel = artName.includes("マーシャルアーツ") ? "MA" : artName;
        const label = (name) => isAddBrackets ? `【${name}】` : name;

        const grappleKeywords = ["柔道", "合気道", "相撲", "レスリング", "組み技", "組技"];
        const strikeKeywords = ["空手", "ボクシング", "キック", "テコンドー", "ムエタイ", "拳法", "カポエイラ", "立ち技", "立技"];
        let isGrappleArt = false, isStrikeArt = false;

        if (forceMA) {
          isGrappleArt = true;
          isStrikeArt = true;
        } else {
          if (grappleKeywords.some(k => artName.includes(k))) isGrappleArt = true;
          else if (strikeKeywords.some(k => artName.includes(k))) isStrikeArt = true;
          else {
            if (comboData.Grapple && !comboData.Kick && !comboData.Punch) isGrappleArt = true;
            else isStrikeArt = true;
          }
        }

        const usable = (s) => s && (s.isLearned || forceMA);
        comboLines.push(`// --- ${artName} ---`);

        // 立ち技系
        if (isStrikeArt) {
          [[comboData.Kick, "2d6"], [comboData.Punch, "2d3"], [comboData.Headbutt, "2d4"]].forEach(([s, dice]) => {
            if (!usable(s)) return;
            comboLines.push(`${cbrCommand}(${artVal},${s.val}) ${label(`${artLabel}+${s.name}`)}`);
            comboLines.push(`${prefix}${dice}${dbSuffixForUnarmed} ${label(`${artLabel}+${s.name} ダメージ`)}`);
          });

          if (artVal >= 60 && artName.includes("武道")) {
            comboLines.push(`// --- 特殊攻撃（立ち技） ---`);
            comboLines.push(`// ${label('特殊攻撃：ラッシュ')}`);
            comboLines.push(`// 命中時相手スタン。ラウンド末に追加攻撃が1回できる（以下を使用）`);
            if (usable(comboData.Kick)) comboLines.push(`${cbrCommand}(${artVal},${comboData.Kick.val}) ${label(`ラッシュ追加攻撃：${comboData.Kick.name}`)}`);
            if (usable(comboData.Punch)) comboLines.push(`${cbrCommand}(${artVal},${comboData.Punch.val}) ${label(`ラッシュ追加攻撃：${comboData.Punch.name}`)}`);
            comboLines.push(`// ${label('特殊攻撃：フェイント')}`);
            comboLines.push(`// フェイント成功時: 2回攻撃を行う。1回目は自動ミス(敵は回避/受け流し強制)、2回目は必中。`);
          }
        }

        // 組み技系
        if (isGrappleArt) {
          if (usable(comboData.Grapple)) {
            const g = comboData.Grapple;
            comboLines.push(`${cbrCommand}(${artVal},${g.val}) ${label(`${artLabel}+${g.name}`)}`);
            comboLines.push(`${prefix}(効果) ${label(`${artLabel}+${g.name}`)}`);
          }
          if (!isStrikeArt && usable(comboData.Headbutt)) {
            const h = comboData.Headbutt;
            comboLines.push(`${cbrCommand}(${artVal},${h.val}) ${label(`${artLabel}+${h.name}`)}`);
            comboLines.push(`${prefix}2d4${dbSuffixForUnarmed} ${label(`${artLabel}+${h.name} ダメージ`)}`);
          }

          if (artVal >= 60 && artName.includes("武道")) {
            comboLines.push(`// --- 特殊攻撃（組み技） ---`);
            if (usable(comboData.Grapple)) {
              comboLines.push(`${cbrCommand}(${artVal},${comboData.Grapple.val}) ${label('特殊攻撃：サルト')}`);
              comboLines.push(`${prefix}1d6${dbSuffixForUnarmed} ${label('サルト ダメージ')}`);
              comboLines.push(`// サルト命中時: 対象はCON*5失敗でノックアウト`);
            }
            if (usable(comboData.Headbutt)) {
              comboLines.push(`${cbrCommand}(${artVal},${comboData.Headbutt.val}) ${label('特殊攻撃：タックル')}`);
              comboLines.push(`${prefix}1d4${dbSuffixForUnarmed} ${label('タックル ダメージ')}`);
              comboLines.push(`// タックル命中時: 3mノックバック(壁際+1d4) / 対象DEX*5失敗で転倒 / 対象CON*5失敗でノックアウト`);
            }
          }
        }
      }
      if (comboLines.length > 0) {
        if (isUseFolding) palette.push("###組み合わせロール"); else palette.push('----------');
        palette = palette.concat(comboLines);
        if (isUseFolding) palette.push("###");
      }
    }

    // 倍数ロール
    if (p.includeStatx5) {
      if (isUseFolding) palette.push("###倍数ロール"); else palette.push('----------');
      const mVal = parseFloat(p.statMultiplierValue);
      const multiStr = (mVal === 0.5) ? "/2" : `*${mVal}`;
      const labelStr = (mVal === 0.5) ? "/2" : "倍数";
      stats.forEach(stat => {
        const sName = isAddBrackets ? `【${stat.name}${labelStr}】` : `${stat.name}${labelStr}`;
        if (p.isUseVariable) palette.push(`${command}<=({${stat.name}}${multiStr}) ${sName}`);
        else if (stat.val) palette.push(`${command}<=(${stat.val}${multiStr}) ${sName}`);
      });
      if (isUseFolding) palette.push("###");
    }

    // 対抗ロール
    if (p.includeStatRes) {
      if (isUseFolding) palette.push("###対抗ロール"); else palette.push('----------');
      stats.forEach(stat => {
        const sName = isAddBrackets ? `【${stat.name}対抗】` : `${stat.name}対抗`;
        const targetVal = p.isUseVariable ? `{${stat.name}}` : stat.val;
        if (targetVal) palette.push(`${resCommand}(${targetVal}-対抗値) ${sName}`);
      });
      if (isUseFolding) palette.push("###");
    }

    // 能力値変数
    if (p.includeStatVariables) {
      if (isUseFolding) palette.push("###能力値変数"); else palette.push('----------');
      stats.forEach(stat => { if (stat.val) palette.push(`//${stat.name}=${stat.val}`); });
      if (isValidDB) palette.push(`//DB=${dbValue}`);
      if (isUseFolding) palette.push("###");
    }

    // プロフィール
    let skillListString = "なし";
    if (profileSkills.length > 0) {
      skillListString = chunkArray(profileSkills, 4).map(chunk => chunk.join("　")).join('\n');
    }
    let profileString = generateProfileText(chara, stats, specStats, extractedData, dbValue, statValue, p);
    profileString = profileString.replace("{{SKILL_LIST_PLACEHOLDER}}", skillListString);

    // ココフォリア用データ
    const paramsList = stats.map(s => ({ label: s.name, value: String(s.val) }));
    if (p.includeDB && dbValue) paramsList.push({ label: "DB", value: dbValue });

    const status = [
      { label: "HP", value: statValue(chara.hp), max: chara.hp.cur || chara.hp.init },
      { label: "MP", value: statValue(chara.mp), max: chara.mp.cur || chara.mp.init },
      { label: "SAN", value: chara.sanCur, max: chara.sanCur }
    ];

    const ccfoliaData = {
      kind: "character",
      data: {
        name: chara.name || "名称未設定",
        memo: profileString,
        initiative: statValue(chara.stats.DEX),
        externalUrl: chara.url,
        status: status,
        params: paramsList,
        commands: palette.join('\n')
      }
    };

    return {
      palette: palette.join('\n'),
      profile: profileString,
      ccfoliaJson: JSON.stringify(ccfoliaData),
      futeiVal: chara.futei || 0
    };
  }

  // ==========================================
  // プロフィール生成
  // ==========================================
  function generateProfileText(chara, stats, specStats, extractedData, dbValue, statValue, p) {
    const extractedTraits = extractedData.traits;
    const extractedTokki = extractedData.tokki;
    const name = chara.name || "名称未設定";

    // 武器行 (空の項目は詰める)
    function createWeaponLine(w) {
      let parts = [w.name];
      if (w.hit) parts.push(w.hit + "%");
      if (w.damage) parts.push(w.damage);
      if (w.range) parts.push("射程:" + w.range);
      if (w.attacks) parts.push("攻撃回数:" + w.attacks);
      if (w.ammo) parts.push("装弾数:" + w.ammo);
      if (w.durability) parts.push("耐久力:" + w.durability);
      if (w.note) parts.push(w.note);
      return parts.join("｜");
    }
    function weaponLines() {
      const lines = chara.weapons.map(createWeaponLine);
      return lines.length > 0 ? lines : ["なし"];
    }
    function itemLines() {
      return chara.items.length > 0 ? chunkArray(chara.items, 3).map(chunk => chunk.join("/")) : ["なし"];
    }
    function tokkiList() {
      let tokkiOut = [];
      if (chara.tokki) tokkiOut.push(chara.tokki);
      return tokkiOut.concat(extractedTokki);
    }

    if (p.isSecretProfile) {
      // --- 秘匿プロフ ---
      let secretLines = [];
      const has = (key) => p.secretProfileList.includes(key);

      if (has("名前")) secretLines.push(name);

      let line2 = [];
      if (has("年齢")) line2.push(`年齢：${chara.age}`);
      if (has("職業")) line2.push(`職業：${chara.occupation}`);
      if (has("性別")) line2.push(`性別：${chara.sex}`);
      if (line2.length) secretLines.push(line2.join("　"));

      let line3 = [];
      if (has("APP")) line3.push(`APP:${statValue(chara.stats.APP)}`);
      if (has("SIZ")) line3.push(`SIZ:${statValue(chara.stats.SIZ)}`);
      if (line3.length) secretLines.push(line3.join(" "));

      let line4 = [];
      if (has("身長")) line4.push(`身長:${chara.height}`);
      if (has("体重")) line4.push(`体重:${chara.weight}`);
      if (line4.length) secretLines.push(line4.join(" "));

      let line5 = [];
      if (has("髪の色")) line5.push(`髪の色:${chara.hairColor}`);
      if (has("瞳の色")) line5.push(`瞳の色:${chara.eyeColor}`);
      if (has("肌の色")) line5.push(`肌の色:${chara.skinColor}`);
      if (line5.length) secretLines.push(line5.join(" "));

      // 特徴・特記 (秘匿)
      if (has("特徴") || has("特記")) {
        let traitLines = [];
        if (has("特徴") && extractedTraits.length > 0) {
          traitLines.push("【特徴表】");
          extractedTraits.forEach(t => traitLines.push(t));
        }
        if (has("特記")) {
          const tokkiOut = tokkiList();
          if (tokkiOut.length > 0) {
            if (traitLines.length > 0) traitLines.push("");
            traitLines.push("【特記】");
            tokkiOut.forEach(t => traitLines.push(t));
          }
        }
        if (traitLines.length > 0) {
          secretLines.push("------------------------------");
          secretLines = secretLines.concat(traitLines);
        }
      }

      // 武器 (秘匿)
      if (has("武器・防具")) {
        secretLines.push("------------------------------");
        secretLines.push("【武器】");
        secretLines = secretLines.concat(weaponLines());
      }

      // 持ち物 (秘匿)
      if (has("持ち物")) {
        secretLines.push("------------------------------");
        secretLines.push("【持ち物】");
        secretLines = secretLines.concat(itemLines());
      }

      return secretLines.join('\n');
    }

    // --- 通常プロフ ---
    let profile = [];
    profile.push(name);
    profile.push(`年齢：${chara.age}　職業：${chara.occupation}　性別：${chara.sex}`);

    if (p.includeStatusProfile) {
      let statStrList = stats.map(s => `${s.name}:${s.val}`);
      statStrList.push(`HP:${statValue(chara.hp)}`);
      statStrList.push(`MP:${statValue(chara.mp)}`);
      statStrList.push(`SAN:${chara.sanCur || "0"}`);
      statStrList.push(`DB:${chara.db || "0"}`);
      chunkArray(statStrList, 4).forEach(chunk => { profile.push(chunk.join(" ")); });
    }

    if (p.includePersonalData) {
      profile.push(`身長:${chara.height} 体重:${chara.weight} 出身:${chara.birthplace}`);
      profile.push(`髪の色:${chara.hairColor} 瞳の色:${chara.eyeColor} 肌の色:${chara.skinColor}`);
    }

    if (p.includeSkillListProfile) {
      profile.push("------------------------------");
      profile.push("【技能】");
      const specLineItems = specStats.filter(s => s.val).map(s => `${s.name}(${s.val})`);
      if (specLineItems.length > 0) profile.push(specLineItems.join("　"));
      profile.push("{{SKILL_LIST_PLACEHOLDER}}");
    }

    profile.push("------------------------------");

    if (p.includeTraits) {
      profile.push("【特徴表】");
      if (extractedTraits.length > 0) extractedTraits.forEach(t => profile.push(t));
      else profile.push("");

      profile.push("【特記】");
      const tokkiOut = tokkiList();
      if (tokkiOut.length > 0) tokkiOut.forEach(t => profile.push(t));
      else profile.push("");
      profile.push("------------------------------");
    }

    // 武器 (通常)
    if (p.includeWeaponsProfile) {
      profile.push("【武器】");
      profile = profile.concat(weaponLines());
      profile.push("------------------------------");
    }

    // 持ち物 (通常)
    if (p.includeItems) {
      profile.push("【持ち物】");
      profile = profile.concat(itemLines());
    }

    return profile.join('\n');
  }
