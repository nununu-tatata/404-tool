// --- キャラシ読み込み (キャラクター保管所 / Charaeno / キャラッシュ) ---
// 各サイトのデータを、ツール共通の形 (chara) にそろえて返します。
//
// chara = {
//   source, sourceLabel, url,
//   name, nameKana (ふりがな。キャラッシュのみ), occupation, age, sex, height, weight, birthplace, hairColor, eyeColor, skinColor,
//   memo, traitsText, tokki,
//   stats: { STR: {cur, init}, ... EDU },
//   hp: {cur, init}, mp: {cur, init}, idea: {cur, init}, luck: {cur, init}, know: {cur, init},
//   sanCur, futei, db,
//   skills: [{ key, baseName, displayName, category, value, learned }],
//   weapons: [{ name, hit, damage, range, attacks, ammo, durability, note }],
//   items: [名前, ...]
// }

  const STAT_NAMES = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];

  // 技能の分類 (保管所の並び順)
  const SKILL_CATEGORIES = [
    { name: "戦闘技能", key: "combat", prefix: "TB", defaults: ["回避", "キック", "組み付き", "こぶし（パンチ）", "頭突き", "投擲", "マーシャルアーツ", "拳銃", "サブマシンガン", "ショットガン", "マシンガン", "ライフル"] },
    { name: "探索技能", key: "search", prefix: "TF", defaults: ["応急手当", "鍵開け", "隠す", "隠れる", "聞き耳", "忍び歩き", "写真術", "精神分析", "追跡", "登攀", "図書館", "目星"] },
    { name: "行動技能", key: "action", prefix: "TA", defaults: ["運転", "機械修理", "重機械操作", "乗馬", "水泳", "製作", "操縦", "跳躍", "電気修理", "ナビゲート", "変装"] },
    { name: "交渉技能", key: "negotiation", prefix: "TC", defaults: ["言いくるめ", "信用", "説得", "値切り", "母国語"] },
    { name: "知識技能", key: "knowledge", prefix: "TK", defaults: ["医学", "オカルト", "化学", "クトゥルフ神話", "芸術", "経理", "考古学", "コンピューター", "心理学", "人類学", "生物学", "地質学", "電子工学", "天文学", "博物学", "物理学", "法律", "薬学", "歴史"] },
    { name: "その他の技能", key: "other", prefix: "", defaults: [] }
  ];

  // サイトごとの表記ゆれを、保管所の技能名にそろえる
  const SKILL_ALIASES = {
    "こぶし": "こぶし（パンチ）", "パンチ": "こぶし（パンチ）", "こぶし／パンチ": "こぶし（パンチ）", "こぶし/パンチ": "こぶし（パンチ）",
    "組みつき": "組み付き", "組付き": "組み付き",
    "制作": "製作"
  };

  // 分類が分からない技能を、名前から推測するためのキーワード
  const CATEGORY_KEYWORDS = [
    { key: "combat", words: ["武道", "格闘", "近接", "射撃", "刀", "剣", "ナイフ", "盾", "槍", "斧", "棍", "棒", "鞭", "ムチ", "弓", "鎌", "杖", "銃", "薙刀", "投げ"] },
    { key: "negotiation", words: ["言語", "語）", "語)"] }
  ];

  function safeArray(val) {
    if (val === undefined || val === null || val === "") return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return Object.values(val);
    return [val];
  }

  function toInt(val) {
    const n = parseInt(val);
    return isNaN(n) ? 0 : n;
  }

  function str(val) {
    return (val === undefined || val === null) ? "" : String(val);
  }

  // 「運転（自動車）」→ 基本名「運転」、分野「自動車」
  function splitSkillName(name) {
    const m = str(name).trim().match(/^(.*?)\s*[（(]([^（()）]*)[)）]\s*$/);
    if (m) return { base: m[1].trim(), specialty: m[2].trim() };
    return { base: str(name).trim(), specialty: "" };
  }

  // 技能名から保管所の技能名 (初期値でも出力する技能のチェックや分類に使う) を求める
  function canonicalSkillKey(name) {
    const whole = str(name).trim();
    if (SKILL_ALIASES[whole]) return SKILL_ALIASES[whole];
    const base = splitSkillName(whole).base;
    return SKILL_ALIASES[base] || base;
  }

  function guessCategory(key, displayName) {
    for (const cat of SKILL_CATEGORIES) {
      if (cat.defaults.includes(key)) return cat.key;
    }
    if (key === "ほかの言語") return "negotiation";
    for (const rule of CATEGORY_KEYWORDS) {
      if (rule.words.some(w => displayName.includes(w))) return rule.key;
    }
    return "other";
  }

  // 分類の中を保管所と同じ並び順にする (追加技能は後ろ)
  function sortSkillsByStandardOrder(skills) {
    const orderOf = (s) => {
      const cat = SKILL_CATEGORIES.find(c => c.key === s.category);
      const idx = cat ? cat.defaults.indexOf(s.key) : -1;
      return idx === -1 ? 999 : idx;
    };
    return skills
      .map((s, i) => ({ s, i }))
      .sort((a, b) => (orderOf(a.s) - orderOf(b.s)) || (a.i - b.i))
      .map(x => x.s);
  }

  // 不定の狂気の目安 (チャパレの不定計算式と同じ「SAN - SAN/5(切り上げ)」)
  function calcFutei(san) {
    return san - Math.ceil(san / 5);
  }

  // 文章の中から「身長：180」「▽　身長：180」のような行を探す (先に見つかった文章を優先)
  function findLabeledValue(texts, labels) {
    for (const text of texts) {
      for (const label of labels) {
        const m = str(text).match(new RegExp('^[\\s【\\[▽▼△▲・■□◆◇●○★☆▍|｜-]*' + label + '[】\\]]*\\s*[：:]\\s*(.+)$', 'm'));
        if (m && m[1].trim()) return m[1].trim();
      }
    }
    return "";
  }

  // 「▽　手持ち」のような、持ち物欄の見出し行かどうか
  function isHeadingItem(name) {
    return /^[▽▼△▲■□◆◇●○★☆▍【\[]/.test(str(name).trim());
  }

  // ==========================================
  // URLの判定
  // ==========================================
  function parseSheetUrl(input) {
    let s = str(input).trim();
    if (!s) return { error: "エラー：URLが入力されていません。" };
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;

    let u;
    try { u = new URL(s); } catch (e) { return { error: "エラー：URLの形式が正しくありません。\nキャラシのページのURLをそのまま貼り付けてください。" }; }

    const host = u.hostname.toLowerCase();
    const segs = u.pathname.split('/').filter(Boolean);

    if (host === "charasheet.vampire-blood.net") {
      const id = (segs[0] || "").replace(/\.json$/i, "");
      if (!/^(\d+|m[0-9a-z]{32})$/i.test(id)) {
        return { error: "エラー：キャラクター保管所のURLからキャラシのIDを読み取れませんでした。\n例：https://charasheet.vampire-blood.net/1234567" };
      }
      return { site: "vampire", label: "キャラクター保管所", id: id,
        sheetUrl: `https://charasheet.vampire-blood.net/${id}`,
        apiUrl: `https://charasheet.vampire-blood.net/${id}.json` };
    }

    if (host === "charaeno.com" || host.endsWith(".charaeno.com") || host === "charaeno.sakasin.net") {
      const edition = segs[0] || "";
      const id = segs[1] || "";
      if (edition === "7th") {
        return { error: "エラー：これは新クトゥルフ神話TRPG（7版）のキャラシです。\nこのツールはクトゥルフ神話TRPG（6版）のみ対応しています。" };
      }
      if (edition !== "6th" || !/^[A-Za-z0-9_-]{21}$/.test(id)) {
        return { error: "エラー：CharaenoのURLからキャラシのIDを読み取れませんでした。\n例：https://charaeno.com/6th/（21文字のID）" };
      }
      return { site: "charaeno", label: "Charaeno", id: id,
        sheetUrl: `https://charaeno.com/6th/${id}`,
        apiUrl: `https://charaeno.com/api/v1/6th/${id}/summary` };
    }

    if (host === "charash.jp" || host === "www.charash.jp") {
      const id = segs[0] === "view" ? (segs[1] || "") : "";
      if (!/^[A-Za-z0-9_-]+$/.test(id)) {
        return { error: "エラー：キャラッシュのURLからキャラクターのIDを読み取れませんでした。\n例：https://charash.jp/view/（ID）/coc6" };
      }
      return { site: "charash", label: "キャラッシュ", id: id,
        sheetUrl: `https://charash.jp/view/${id}/coc6`,
        apiUrl: `https://charash.jp/api/v1/characters/${id}` };
    }

    return { error: "エラー：対応していないサイトのURLです。\n対応サイト：キャラクター保管所、Charaeno、キャラッシュ（いずれもクトゥルフ神話TRPG 6版）" };
  }

  // ==========================================
  // 取得
  // ==========================================
  async function fetchSheetJson(info) {
    let res;
    try {
      res = await fetch(info.apiUrl, { cache: "no-store" });
    } catch (e) {
      throw new Error(`エラー：${info.label}に接続できませんでした。\n時間をおいてもう一度お試しください。（サイトがメンテナンス中の場合もあります）`);
    }
    if (res.status === 404) {
      throw new Error(`エラー：キャラシが見つかりませんでした。\nURLが正しいか、キャラシが「非公開」になっていないかご確認ください。（非公開のキャラシは読み込めません）`);
    }
    if (res.status === 429) {
      throw new Error(`エラー：${info.label}への読み込みが混み合っています。\n1分ほど待ってからもう一度お試しください。`);
    }
    if (!res.ok) {
      throw new Error(`エラー：${info.label}からデータを読み込めませんでした。（コード ${res.status}）\n時間をおいてもう一度お試しください。（サイトがメンテナンス中の場合もあります）`);
    }
    try {
      return await res.json();
    } catch (e) {
      throw new Error(`エラー：${info.label}から正しいデータが返ってきませんでした。\n時間をおいてもう一度お試しください。（サイトがメンテナンス中の場合もあります）`);
    }
  }

  async function loadCharacter(input) {
    const info = parseSheetUrl(input);
    if (info.error) throw new Error(info.error);
    const json = await fetchSheetJson(info);
    let chara;
    if (info.site === "vampire") chara = convertVampire(json);
    else if (info.site === "charaeno") chara = convertCharaeno(json);
    else chara = convertCharash(json);
    chara.source = info.site;
    chara.sourceLabel = info.label;
    chara.url = info.sheetUrl;
    return chara;
  }

  // ==========================================
  // キャラクター保管所
  // ==========================================
  function convertVampire(data) {
    if (data.game && data.game !== "coc") {
      throw new Error("エラー：このキャラシはクトゥルフ神話TRPG（6版）のものではありません。\nこのツールは6版のキャラシのみ対応しています。");
    }

    const pair = (n) => ({ cur: toInt(data["NP" + n]) || toInt(data["NA" + n]), init: toInt(data["NA" + n]) });
    const stats = {};
    STAT_NAMES.forEach((name, i) => { stats[name] = pair(i + 1); });

    const subSkillMap = { "製作": "seisaku_bunya", "運転": "unten_bunya", "操縦": "main_souju_norimono", "母国語": "mylang_name", "芸術": "geijutu_bunya" };
    let skills = [];
    SKILL_CATEGORIES.filter(c => c.prefix).forEach(cat => {
      const arrTotal = safeArray(data[cat.prefix + "AP"]);
      const arrDefault = safeArray(data[cat.prefix + "AD"]);
      const arrJob = safeArray(data[cat.prefix + "AS"]);
      const arrInterest = safeArray(data[cat.prefix + "AK"]);
      const addedNames = safeArray(data[cat.prefix + "AName"]);

      for (let i = 0; i < arrTotal.length; i++) {
        const val = parseInt(arrTotal[i]);
        if (isNaN(val)) continue;

        let baseName, displayName;
        const isStandardSkill = i < cat.defaults.length;
        if (isStandardSkill) {
          baseName = cat.defaults[i];
          displayName = baseName;
          if (subSkillMap[baseName] && data[subSkillMap[baseName]]) displayName = `${baseName}（${data[subSkillMap[baseName]]}）`;
        } else {
          baseName = str(addedNames[i - cat.defaults.length]) || "不明な技能";
          displayName = baseName;
        }

        // 職業P・興味Pがある、または今の値が初期値と違う (マイナスも含む) なら取得済み
        const jobPoints = toInt(arrJob[i]);
        const interestPoints = toInt(arrInterest[i]);
        const defaultVal = parseInt(arrDefault[i]);
        let learned = false;
        if (jobPoints !== 0 || interestPoints !== 0) learned = true;
        else if (!isNaN(defaultVal)) learned = (val !== defaultVal);
        else if (!isStandardSkill) learned = (val !== 0);

        skills.push({ key: baseName, baseName: baseName, displayName: displayName, category: cat.key, value: val, learned: learned });
      }
    });

    const names = safeArray(data.arms_name), hits = safeArray(data.arms_hit), dmgs = safeArray(data.arms_damage);
    const rngs = safeArray(data.arms_range), cnts = safeArray(data.arms_attack_count), ammos = safeArray(data.arms_last_shot);
    const vitals = safeArray(data.arms_vitality), notes = safeArray(data.arms_sonota);
    const weapons = [];
    for (let i = 0; i < names.length; i++) {
      if (!names[i]) continue;
      weapons.push({ name: str(names[i]), hit: str(hits[i]), damage: str(dmgs[i]), range: str(rngs[i]),
        attacks: str(cnts[i]), ammo: str(ammos[i]), durability: str(vitals[i]), note: str(notes[i]) });
    }

    const sanCur = toInt(data.SAN_Left);
    return {
      name: str(data.pc_name),
      occupation: str(data.shokugyo || data.shuzoku),
      age: str(data.age), sex: str(data.sex),
      height: str(data.pc_height), weight: str(data.pc_weight), birthplace: str(data.pc_kigen),
      hairColor: str(data.color_hair), eyeColor: str(data.color_eye), skinColor: str(data.color_skin),
      memo: str(data.pc_making_memo), traitsText: "", tokki: str(data.tokki),
      stats: stats,
      hp: pair(9), mp: pair(10), idea: pair(12), luck: pair(13), know: pair(14),
      sanCur: sanCur,
      futei: data.SAN_Danger !== undefined && data.SAN_Danger !== "" ? toInt(data.SAN_Danger) : calcFutei(sanCur),
      db: str(data.dmg_bonus || data.db),
      skills: skills,
      weapons: weapons,
      items: safeArray(data.item_name).map(str).filter(n => n)
    };
  }

  // ==========================================
  // Charaeno
  // ==========================================
  function convertCharaeno(data) {
    const ch = data.characteristics || {};
    const at = data.attribute || {};
    const same = (v) => ({ cur: toInt(v), init: toInt(v) });

    const stats = {};
    STAT_NAMES.forEach(name => { stats[name] = same(ch[name.toLowerCase()]); });

    let skills = [];
    safeArray(data.skills).forEach(s => {
      const rawName = str(s.name).trim();
      if (!rawName || /^[↑↓※＊*]/.test(rawName)) return; // 技能欄に書かれたメモは除く
      const displayName = rawName.replace(/\s*[（(]\s*[)）]\s*$/, ""); // 「運転（）」→「運転」
      const key = canonicalSkillKey(displayName);
      skills.push({ key: key, baseName: displayName, displayName: displayName,
        category: guessCategory(key, displayName), value: toInt(s.value), learned: !!s.edited });
    });
    skills = sortSkillsByStandardOrder(skills);

    // Charaeno が自動で入れる素手の武器 (技能値なし) は、技能側のダメージと重なるので除く
    const weapons = safeArray(data.weapons)
      .filter(w => w && str(w.name))
      .filter(w => !(str(w.value) === "" && /^(キック|こぶし|パンチ|頭突き)$/.test(str(w.name).trim())))
      .map(w => ({ name: str(w.name), hit: str(w.value), damage: str(w.damage), range: str(w.range),
        attacks: str(w.attacks), ammo: str(w.ammo), durability: str(w.hp), note: "" }));

    // Charaeno には身長などの欄がないので、「描写」欄とメモ欄から「身長：〇〇」の形の行を探す
    const pd = data.personalData || {};
    const texts = [str(pd.description), str(data.note)];
    const sanCur = toInt(at.san && at.san.value);

    return {
      name: str(data.name), occupation: str(data.occupation), age: str(data.age), sex: str(data.sex),
      height: findLabeledValue(texts, ["身長"]), weight: findLabeledValue(texts, ["体重"]), birthplace: str(data.birthplace),
      hairColor: findLabeledValue(texts, ["髪の色", "髪色", "髪"]), eyeColor: findLabeledValue(texts, ["瞳の色", "瞳色", "目の色", "瞳"]),
      skinColor: findLabeledValue(texts, ["肌の色", "肌色", "肌"]),
      memo: str(data.note), traitsText: "", tokki: "",
      stats: stats,
      hp: same(at.hp), mp: same(at.mp),
      idea: same(at.idea !== undefined ? at.idea : toInt(ch.int) * 5),
      luck: same(at.luck !== undefined ? at.luck : toInt(ch.pow) * 5),
      know: same(at.know !== undefined ? at.know : Math.min(toInt(ch.edu) * 5, 99)),
      sanCur: sanCur, futei: calcFutei(sanCur),
      db: str(at.db),
      skills: skills,
      weapons: weapons,
      items: safeArray(data.possessions).map(p => str(p && p.name)).filter(n => n && !isHeadingItem(n))
    };
  }

  // ==========================================
  // キャラッシュ
  // ==========================================
  function convertCharash(data) {
    const c = data.systems && data.systems.coc6;
    if (!c) {
      throw new Error("エラー：このキャラクターには、クトゥルフ神話TRPG（6版）のシートがありません。\nキャラッシュで6版のシートを作成・公開してからお試しください。");
    }
    const p = data.profile || {};
    const ab = c.abilities || {};
    const dv = c.derived || {};

    const stats = {};
    STAT_NAMES.forEach(name => {
      const a = ab[name] || {};
      stats[name] = { cur: toInt(a.value), init: toInt(a.base) + toInt(a.ageBonus) };
    });
    const derivedPair = (d) => ({ cur: toInt(d && d.value), init: toInt(d && d.base) || toInt(d && d.value) });

    const categoryMap = { combat: "combat", search: "search", action: "action", negotiate: "negotiation", negotiation: "negotiation", knowledge: "knowledge" };
    let skills = [];
    safeArray(c.skills).forEach(s => {
      const name = str(s.name).trim();
      if (!name) return;
      const specialty = str(s.specialty).trim().replace(/^[（(]\s*/, "").replace(/\s*[)）]$/, "");
      const displayName = specialty ? `${name}（${specialty}）` : name;
      const key = canonicalSkillKey(name);
      const baseVal = toInt(s.base && s.base.value);
      const value = toInt(s.value);
      const learned = value !== baseVal || [s.occupation, s.interest, s.growth, s.other].some(v => toInt(v) !== 0);
      skills.push({ key: key, baseName: displayName, displayName: displayName,
        category: categoryMap[s.category] || guessCategory(key, displayName), value: value, learned: learned });
    });

    // 武器の成功率は「使う技能」で指定されているので、その技能の値を使う
    const weapons = safeArray(c.weapons).filter(w => w && str(w.name)).map(w => {
      let hit = "";
      if (w.skill) {
        const ref = safeArray(c.skills).find(s => (w.skill.id && s.id === w.skill.id) || (!w.skill.id && s.name === w.skill.name));
        if (ref) hit = str(ref.value);
      }
      return { name: str(w.name), hit: hit, damage: str(w.damage), range: str(w.range), attacks: str(w.attacks),
        ammo: str(w.ammo), durability: str(w.durability), note: str(w.note).replace(/\n/g, " ") };
    });

    const items = safeArray(p.belongings).concat(safeArray(c.items)).map(i => str(i && i.name)).filter(n => n && !isHeadingItem(n));
    const memoTexts = safeArray(p.memos).concat(safeArray(c.systemMemos)).map(m => str(m && m.body)).filter(t => t);
    if (p.background) memoTexts.push(str(p.background));
    const skinField = safeArray(p.customFields).find(f => f && /肌/.test(str(f.name)));
    const san = dv.san || {};
    const sanCur = toInt(san.value);

    return {
      name: str(p.name), nameKana: str(p.nameKana).trim(),
      occupation: str(p.occupation), age: str(p.age && typeof p.age === 'object' ? p.age.value : p.age),
      sex: str(p.gender), height: str(p.height), weight: str(p.weight), birthplace: str(p.origin),
      hairColor: str(p.hairColor), eyeColor: str(p.eyeColor), skinColor: skinField ? str(skinField.value) : "",
      memo: memoTexts.join("\n\n"),
      traitsText: str(c.ruleNotes && c.ruleNotes.investigators_traits),
      tokki: "",
      stats: stats,
      hp: derivedPair(dv.hp), mp: derivedPair(dv.mp),
      idea: derivedPair(dv.idea), luck: derivedPair(dv.luck), know: derivedPair(dv.knowledge),
      sanCur: sanCur, futei: calcFutei(sanCur),
      db: str(dv.damageBonus && dv.damageBonus.value),
      skills: skills,
      weapons: weapons,
      items: items
    };
  }
