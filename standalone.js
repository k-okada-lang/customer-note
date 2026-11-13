/*
 * GitHub Pages などで単体のデモとして動かすための仮の保存先です。
 * Claude の Artifact 上（window.claude があるとき）は何もしません。
 * データはこのブラウザの localStorage にだけ保存され、ほかの人や端末とは共有されません。
 */
(() => {
  if (window.claude) return;
  window.__standalone = true;
  const KEY = 'customer-note-demo-db', AKEY = 'customer-note-demo-asset-';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
  let store = read();
  const subs = new Set();
  const cp = o => JSON.parse(JSON.stringify(o));
  const fire = () => { for (const s of [...subs]) s(); };
  const write = fn => {
    fn();
    try { localStorage.setItem(KEY, JSON.stringify(store)); }
    catch { store = read(); throw Object.assign(new Error('quota'), { code: 'quota_exceeded' }); }
    fire();
  };
  const docSnap = p => ({ id: p.split('/').pop(), exists: p in store, data: () => (p in store ? cp(store[p]) : undefined) });
  const colSnap = c => {
    const pre = c + '/';
    const docs = Object.keys(store).filter(k => k.startsWith(pre) && !k.slice(pre.length).includes('/')).sort().map(docSnap);
    return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false } };
  };
  const listen = make => next => { const s = () => next(make()); subs.add(s); setTimeout(s, 0); return () => subs.delete(s); };
  const doc = p => ({
    id: p.split('/').pop(), path: p,
    get: async () => docSnap(p),
    set: async d => write(() => { store[p] = cp(d); }),
    update: async d => {
      if (!(p in store)) throw Object.assign(new Error('not found'), { code: 'not_found' });
      write(() => { Object.assign(store[p], cp(d)); });
    },
    delete: async () => write(() => { delete store[p]; }),
    onSnapshot: listen(() => docSnap(p)),
  });
  const collection = c => ({ doc: id => doc(c + '/' + id), get: async () => colSnap(c), onSnapshot: listen(() => colSnap(c)) });
  window.addEventListener('storage', e => { if (e.key === KEY) { store = read(); fire(); } });

  /* 写真は小さくしてこのブラウザに保存します */
  const toDataUrl = async blob => {
    const img = await createImageBitmap(blob), s = Math.min(1, 640 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
    cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.75);
  };
  const assets = {
    upload: async blob => {
      const id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, ''), url = await toDataUrl(blob);
      localStorage.setItem(AKEY + id, url);
      return { id, url, sizeBytes: url.length, contentType: 'image/jpeg' };
    },
    delete: async id => { try { localStorage.removeItem(AKEY + id); } catch {} },
  };
  window.__blobUrl = id => { try { return localStorage.getItem(AKEY + id) || ''; } catch { return ''; } };

  const TYPES = { csv: 'text/csv;charset=utf-8', html: 'text/html;charset=utf-8', png: 'image/png', svg: 'image/svg+xml' };
  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data], { type: TYPES[filename.split('.').pop()] || 'text/plain;charset=utf-8' });
      const a = document.createElement('a'), u = URL.createObjectURL(blob);
      a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 3000);
    },
  };

  /* 初回だけ、架空のお客様10名を入れます */
  const seed = () => {
    try { if (Object.keys(store).length || localStorage.getItem(KEY + '-seeded')) return; } catch { return; }
    const now = Date.now(), pad = n => String(n).padStart(2, '0'), d = new Date(), m = pad(d.getMonth() + 1);
    const ago = days => { const t = new Date(now - days * 864e5); t.setHours(21, 0, 0, 0); return t.toISOString(); };
    const mins = n => new Date(now - n * 60000).toISOString(), stamp = new Date(now).toISOString();
    const P = [
      ['佐藤 健一', 'さとう けんいち', '株式会社ミナト商事', '営業部 部長', '喫煙', 'アイコス', '1978-' + m + '-20', '背が高く、紺のスーツが多い。声が低くて穏やか。', 'ハイボールは濃いめ。接待での利用が多い。', true, -1,
        [[ago(34), 48000, 'セット 3名、ハイボール、延長 1回', '3', 3], [ago(16), 62000, 'セット 2名、ボトル（ウイスキー）1本', '3', 2], [mins(25), null, '', '3', 2]]],
      ['鈴木 大輔', 'すずき だいすけ', '鈴木建設株式会社', '代表取締役', '禁煙', '', '1970-03-05', 'がっしりした体格。日焼けしていて、笑い声が大きい。', 'シャンパンがお好き。禁煙席を希望。', true, -1,
        [[ago(54), 120000, 'セット 4名、シャンパン 2本', '1', 4], [ago(8), 95000, 'セット 2名、シャンパン 1本、フルーツ盛り', '1', 2]]],
      ['高橋 翔太', 'たかはし しょうた', '株式会社ブルーリンク', '開発部 エンジニア', '未確認', '', '1992-' + m + '-' + pad(d.getDate()), '細身で眼鏡。物静かだが、お酒が入るとよく話す。', '佐藤様のご紹介。ビールから始める。', false, 0,
        [[mins(130), 25000, 'セット 1名、ビール 2杯', '5', 1]]],
      ['田中 誠', 'たなか まこと', '田中法律事務所', '弁護士', '喫煙', 'メビウス 10mg', '1965-07-22', '白髪まじりの短髪。丁寧な話し方。', 'ウイスキーはロック。静かな席を希望。', false, -1,
        [[ago(75), 38000, 'セット 2名、ウイスキー ロック', '7', 2]]],
      ['伊藤 雅人', 'いとう まさと', '伊藤不動産株式会社', '専務取締役', '禁煙', '', '1980-12-02', 'おしゃれなジャケットが多い。腕時計の話が好き。', '鈴木様のご紹介。ワインがお好き。', false, 1,
        [[ago(13), null, '', '2', 2]]],
      ['渡辺 浩二', 'わたなべ こうじ', '渡辺運輸株式会社', '営業所長', '喫煙', 'セブンスター', '1973-' + m + '-28', '坊主頭で体が大きい。気さくな関西弁。', '名刺交換のみ。来店はこれから。', false, -1, []],
      ['山本 隆', 'やまもと たかし', 'フリーランス', 'カメラマン', '未確認', '', '1988-01-15', '長髪を後ろで結んでいる。カメラバッグを持っていることが多い。', '一人での来店が多い。焼酎の水割り。', false, -1,
        [[ago(5), 18000, 'セット 1名、焼酎 水割り', '4', 1]]],
      ['中村 悠斗', 'なかむら ゆうと', '中村歯科クリニック', '院長', '禁煙', '', '1976-09-09', '色白で清潔感がある。歯がきれい。', 'ボトルはシャンパン。記念日の利用が多い。', true, -1,
        [[ago(42), 150000, 'セット 3名、シャンパン 3本', '1', 3], [ago(3), 88000, 'セット 2名、シャンパン 1本', '1', 2]]],
      ['小林 直樹', 'こばやし なおき', '株式会社コバヤシ食品', '商品部 課長', '喫煙', 'プルーム', '1985-05-30', '小柄で丸顔。食べ物の話に詳しい。', '中村様のご紹介。レモンサワー。', false, 7,
        [[ago(59), 30000, 'セット 2名、レモンサワー', '6', 2]]],
      ['加藤 亮', 'かとう りょう', '加藤デザイン事務所', '代表', '未確認', '', '1990-' + m + '-03', '黒縁の丸眼鏡。派手な柄シャツ。', 'イベントで名刺交換。来店はこれから。', false, -1, []],
    ];
    const next = {};
    P.forEach((p, i) => {
      const id = 'demo-' + pad(i + 1), vs = p[11], last = vs.slice().sort((a, b) => a[0].localeCompare(b[0])).pop();
      next['customers/' + id] = {
        name: p[0], kana: p[1], company: p[2], title: p[3], postal: '', address: '', phone: '090-0000-01' + pad(i + 1), email: 'demo' + pad(i + 1) + '@example.com',
        status: p[4], tobacco: p[5], birthday: p[6], features: p[7], memo: p[8] + '（デモ用サンプル）', vip: p[9],
        referrerId: p[10] < 0 ? '' : 'demo-' + pad(p[10] + 1), referrerName: p[10] < 0 ? '' : P[p[10]][0], updatedAt: stamp,
        visitCount: vs.length, pending: vs.filter(v => v[1] == null || !v[2]).length, lastVisit: last ? last[0] : '', lastPaid: !!last && last[1] != null, lastTable: last ? last[3] : '',
      };
      vs.forEach((v, j) => { next['customers/' + id + '/visits/v' + (j + 1)] = { at: v[0], amount: v[1], order: v[2], kuro: [], cast: [], memo: '', table: v[3], guests: v[4], updatedAt: stamp }; });
    });
    [['あい', 'cast'], ['みく', 'cast'], ['れな', 'cast'], ['けん', 'kuro'], ['たくや', 'kuro']].forEach((s, i) => { next['staff/demo-s' + (i + 1)] = { name: s[0], role: s[1], createdAt: stamp }; });
    try { store = next; localStorage.setItem(KEY, JSON.stringify(store)); localStorage.setItem(KEY + '-seeded', '1'); } catch { store = next; }
  };
  seed();

  const caps = { db: { doc, collection }, user: { can: async () => true }, assets, downloads };
  window.claude = { use: async n => caps[n] || null };
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.querySelector('.bottom span:last-child');
    if (s) s.textContent = 'デモ版：データはこのブラウザの中だけに保存されます。';
  });
})();
