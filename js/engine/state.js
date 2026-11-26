(function () {
  const EF = (window.EF = window.EF || {});

  EF.G = null;
  EF.R = {};
  EF.M = [];
  EF.BT = [];
  EF.BOMBS = [];
  EF.LG = [];
  EF.FX = [];
  EF.m_id_seq = 0;
  EF.bt_id = 0;
  EF.spy_id = 0;
  EF.ord_id = 0;
  EF.news_id = 0;

  EF.MEM = {};
  let storeOK = null;
  EF.store = function () {
    if (storeOK === null) {
      try {
        localStorage.setItem('ef1914_v12_t', '1');
        localStorage.removeItem('ef1914_v12_t');
        storeOK = true;
      } catch (e) { storeOK = false; }
    }
    return storeOK;
  };
  EF.sget = k => { try { if (EF.store()) return localStorage.getItem(k); } catch (e) {} return EF.MEM[k] || null; };
  EF.sset = (k, v) => { try { if (EF.store()) { localStorage.setItem(k, v); return true; } } catch (e) {} EF.MEM[k] = v; return false; };
  EF.sdel = k => { try { if (EF.store()) localStorage.removeItem(k); } catch (e) {} delete EF.MEM[k]; };
  EF.SK = n => 'ef1914_v12_' + n;
  EF.SLOTS = ['auto', 'prev', 's1', 's2', 's3'];
  EF.SLN = {
    auto: 'Autosave',
    prev: 'Before your last new game',
    s1: 'Slot 1',
    s2: 'Slot 2',
    s3: 'Slot 3'
  };
  EF.OPT = Object.assign({ roads: 'sub' }, (() => {
    try { return JSON.parse(EF.sget(EF.SK('opt')) || '{}'); } catch (e) { return {}; }
  })());

  EF.dayNum = t => Math.floor(t / EF.DAY_T);
  EF.dayStr = t => new Date(Date.UTC(1914, 7, 1) + Math.floor(t / EF.DAY_T) * 864e5)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  EF.newG = function (me, vc, df, almode = 'hist', mapId = 'europe1914') {
    const emptyU = () => new Array(EF.U_LEN).fill(0);
    return {
      mapId, me, t: 0, sp: 1,
      sel: null, tgt: null, sel_m: null, over: 0, dirty: 1,
      g: {}, rs: {}, at: {}, cd: {}, rel: {}, denounced: {}, aidCd: {},
      embargoes: {}, dh: '', tr: emptyU(),
      z: 1, vx: 0, vy: 0,
      vis: new Set(), vs: '', rt: null, pend: [], eco: {}, et: 0,
      fmOpen: false, ma: new Set(), spl: emptyU(),
      ph: {}, mkl: [], mktOrders: [], tgtA: null, ms: new Set(), mm: false,
      offers: [], px: { ...EF.BP },
      sync: true, half: true, vc, df, almode,
      mapMode: 'pol',
      spies: [], spyLog: [], intel: {},
      news: [], newsRead: 0, lastDay: -1, lastSurveyDay: -1,
      cas: {}, shortages: {},
      pht: 0, vt: 0
    };
  };

  EF.getRel = function (a, b) {
    const G = EF.G, R = EF.R;
    if (a === b) return 100;
    if (!G.rel) G.rel = {};
    if (!G.rel[a]) G.rel[a] = {};
    if (G.rel[a][b] == null) {
      const s = R[a] ? R[a][b] : 'peace';
      G.rel[a][b] = s === 'ally' ? 75 : s === 'pact' ? 40 : s === 'war' ? -60 : 0;
    }
    return G.rel[a][b];
  };

  EF.modRel = function (a, b, delta) {
    const G = EF.G;
    if (a === b) return;
    EF.getRel(a, b);
    G.rel[a][b] = Math.max(-100, Math.min(100, G.rel[a][b] + delta));
    if (!G.rel[b]) G.rel[b] = {};
    G.rel[b][a] = G.rel[a][b];
    G.dh = '';
  };

  EF.relDesc = function (score) {
    if (score >= 70) return { txt: `+${score} Devoted Ally`, col: '#22c55e' };
    if (score >= 40) return { txt: `+${score} Friendly`, col: '#10b981' };
    if (score >= 15) return { txt: `+${score} Cordial`, col: '#14b8a6' };
    if (score >= -14) return { txt: `${score >= 0 ? '+' : ''}${score} Neutral`, col: '#94a3b8' };
    if (score >= -49) return { txt: `${score} Strained`, col: '#f59e0b' };
    if (score >= -74) return { txt: `${score} Hostile`, col: '#f97316' };
    return { txt: `${score} Bitter Nemesis`, col: '#ef4444' };
  };

  EF.isEmbargoed = function (a, b) {
    const G = EF.G;
    if (!G || a === b) return false;
    if (EF.R[a] && EF.R[a][b] === 'war') return true;
    return !!(
      (G.embargoes && G.embargoes[a] && G.embargoes[a][b]) ||
      (G.embargoes && G.embargoes[b] && G.embargoes[b][a])
    );
  };

  EF.serialize = function () {
    const G = EF.G;
    return {
      v: 2, n: EF.SD.length, ulen: EF.U_LEN, at: Date.now(),
      G: {
        mapId: G.mapId || 'europe1914',
        me: G.me, t: G.t, sp: G.sp, df: G.df, vc: G.vc, almode: G.almode || 'hist',
        g: G.g, rs: G.rs, at: G.at, cd: G.cd, rel: G.rel,
        denounced: G.denounced || {}, aidCd: G.aidCd || {}, embargoes: G.embargoes || {},
        px: G.px, ph: G.ph, mkl: G.mkl, mktOrders: G.mktOrders || [],
        offers: G.offers, sync: G.sync, half: G.half, mapMode: G.mapMode || 'pol',
        spies: G.spies || [], spyLog: G.spyLog || [], intel: G.intel || {},
        news: G.news || [], newsRead: G.newsRead || 0,
        lastDay: G.lastDay ?? -1, lastSurveyDay: G.lastSurveyDay ?? -1,
        cas: G.cas || {},
        pht: G.pht || 0, et: G.et || 0, vt: G.vt || 0
      },
      R: EF.R,
      seq: EF.m_id_seq, bt: EF.bt_id, spySeq: EF.spy_id, ordSeq: EF.ord_id, newsSeq: EF.news_id,
      P: EF.SD.map(p => ({
        o: p.o, u: p.u, al: p.al, alq: p.alq, hp: p.hp, mo: p.mo, st: p.st,
        w: p.walls, i: p.ind, f: p.inf, b: p.bar, port: p.port || 0, aero: p.aero || 0,
        af: p.autoFire !== false, q: p.q, c: p.cons, bt: p.bt, ap: p.ap, cd: p.cd
      })),
      M: EF.M.map(m => ({
        id: m.id, f: m.f.id, t: m.t.id, u: m.u, o: m.o, k: m.k, d: m.d, s: m.s,
        h: m.halted, pa: m.path, wp: m.waypoints || [], st: m.stop, km: m.kmax,
        hp: m.hp, mo: m.mo, bt: m.bt || null, cd: m.cd || 0, pk: m.park || 0,
        fi: m.fight || null, re: !!m.resume, af: m.autoFire !== false,
        fm: !!m.forced, eb: m.embark || null, ck: m.coastK ?? null, es: m.embState || null
      })),
      B: EF.BT.map(b => b.kind === 'prov'
        ? {
            k: 'p', id: b.id, p: b.p.id, ao: b.ao, au: b.au, ah: b.ah, am: b.am,
            lead: b.lead ? { o: b.lead.o, pa: b.lead.path || [], st: b.lead.stop || null } : null,
            nt: b.nt, r: b.rounds, reb: b.reb || 0,
            ct: b.contrib || null, ls: b.losses || null, sk: b.stacks || null
          }
        : { k: 'f', id: b.id, m1: b.m1.id, m2: b.m2.id, nt: b.nt, r: b.rounds }
      ),
      BM: EF.BOMBS.map(b => ({
        fx: b.f.x, fy: b.f.y, fo: b.f.o, tx: b.t.x, ty: b.t.y,
        tp: b.tp ? b.tp.id : null, a: b.a, st: b.st, et: b.et, dmg: b.dmg, air: !!b.air
      })),
      PD: G.pend.map(q => ({
        at: q.at, o: q.o, from: q.from, u: q.u, army: q.army, de: q.de, to: q.to,
        rt: q.rt ? [...q.rt] : undefined, rts: q.rt && q.rt.stop ? q.rt.stop : undefined
      }))
    };
  };

  EF.validSave = function (d) {
    const arr = (a, n) => Array.isArray(a) && (n == null || a.length === n);
    const uN = a => arr(a, EF.U_LEN) && a.every(x => Number.isFinite(x) && x >= 0);
    const nat = o => o === 'NE' || o === 'SEA' || EF.NS.includes(o);
    if (!d || d.v !== 2 || d.n !== EF.SD.length || !d.G || !d.R || !arr(d.P, EF.SD.length) || !arr(d.M) || !arr(d.B) || !arr(d.PD)) return false;
    if (!EF.NS.includes(d.G.me) || !Number.isFinite(d.G.t) || !d.G.g || !d.G.rs || !d.G.px) return false;
    if (!d.P.every(q => q && nat(q.o) && uN(q.u) && q.al && typeof q.al === 'object' && arr(q.q))) return false;
    if (!d.M.every(m => m && EF.P[m.f] && EF.P[m.t] && nat(m.o) && uN(m.u) && arr(m.pa) && Number.isFinite(m.k) && m.d > 0)) return false;
    if (!d.B.every(b => b && (b.k === 'p' ? EF.P[b.p] && uN(b.au) && nat(b.ao) : d.M.some(m => m.id === b.m1) && d.M.some(m => m.id === b.m2)))) return false;
    return true;
  };

  EF.loadGame = function (d) {
    if (d && d.G && d.G.mapId && (!EF.CUR_MAP || EF.CUR_MAP.id !== d.G.mapId)) {
      if (EF.MAPS[d.G.mapId]) EF.buildMap(d.G.mapId);
    }
    if (!EF.validSave(d)) throw new Error('incompatible save');
    EF.FX.length = 0;
    EF.LG = [];
    if (EF.clearRenderCaches) EF.clearRenderCaches();
    EF.R = d.R;
    EF.m_id_seq = d.seq || 0;
    EF.bt_id = d.bt || 0;
    EF.spy_id = d.spySeq || 0;
    EF.ord_id = d.ordSeq || 0;
    EF.news_id = d.newsSeq || 0;

    EF.SD.forEach((p, k) => {
      const q = d.P[k];
      p.o = q.o; p.u = q.u; p.al = q.al; p.alq = q.alq || {};
      p.hp = q.hp; p.mo = q.mo; p.st = q.st;
      p.walls = q.w; p.ind = q.i; p.inf = q.f; p.bar = q.b;
      p.port = q.port || 0; p.aero = q.aero || 0;
      p.autoFire = q.af !== false;
      p.q = q.q; p.cons = q.c; p.bt = q.bt; p.ap = q.ap; p.cd = q.cd; p.hit = 0;
    });
    EF.rebuildMine();

    EF.M = d.M.map(m => ({
      id: m.id, f: EF.P[m.f], t: EF.P[m.t], u: m.u, o: m.o, k: m.k, d: m.d, s: m.s,
      halted: m.h, path: m.pa, waypoints: m.wp || [], stop: m.st, kmax: m.km,
      hp: m.hp, mo: m.mo, bt: m.bt, cd: m.cd, park: m.pk, fight: m.fi,
      resume: m.re, autoFire: m.af !== false, forced: !!m.fm,
      embark: m.eb || null, coastK: m.ck ?? null, embState: m.es || null
    }));

    EF.BT = d.B.map(b => b.k === 'p'
      ? {
          id: b.id, kind: 'prov', p: EF.P[b.p], ao: b.ao, au: b.au, ah: b.ah, am: b.am,
          lead: b.lead ? { o: b.lead.o, path: b.lead.pa || [], stop: b.lead.st || null } : null,
          nt: b.nt, rounds: b.r, reb: b.reb, contrib: b.ct || null, losses: b.ls || null, stacks: b.sk || null
        }
      : { id: b.id, kind: 'field', m1: EF.M.find(m => m.id === b.m1), m2: EF.M.find(m => m.id === b.m2), nt: b.nt, rounds: b.r }
    ).filter(b => b.kind === 'prov' || (b.m1 && b.m2));

    EF.BOMBS = (d.BM || []).map(b => ({
      f: { x: b.fx, y: b.fy, o: b.fo },
      t: { x: b.tx, y: b.ty },
      tp: b.tp ? EF.P[b.tp] : null,
      a: b.a, st: b.st, et: b.et, dmg: b.dmg, air: !!b.air
    }));

    EF.G = EF.newG(d.G.me, d.G.vc, d.G.df, d.G.almode || 'hist', d.G.mapId || 'europe1914');
    Object.assign(EF.G, d.G);
    EF.G.pend = d.PD.map(q => {
      const o = { at: q.at, o: q.o };
      ['from', 'u', 'army', 'de', 'to'].forEach(k => { if (q[k] !== undefined && q[k] !== null) o[k] = q[k]; });
      if (q.rt) { const rt = [...q.rt]; if (q.rts) rt.stop = q.rts; o.rt = rt; }
      return o;
    });
    EF.M.forEach(m => { if (m.fight && !EF.BT.some(b => b.kind === 'field' && (b.m1 === m || b.m2 === m))) m.fight = null; });
    if (EF.onGameLoaded) EF.onGameLoaded();
  };

  EF.slotInfo = function (n) {
    try {
      const raw = EF.sget(EF.SK(n));
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (d.v !== 2 || d.n !== EF.SD.length) return { bad: 1 };
      return { me: d.G.me, t: d.G.t, at: d.at, d };
    } catch (e) { return null; }
  };

  EF.saveSlot = function (n) {
    if (!EF.G || EF.G.over) return false;
    try { return EF.sset(EF.SK(n), JSON.stringify(EF.serialize())); } catch (e) { return false; }
  };
  EF.saveNow = () => EF.saveSlot('auto');
  EF.autosave = function () {
    const G = EF.G;
    if (!G || G.over || G.alOn) return;
    const t = performance.now();
    if (t - (G.lastSave || 0) < 30000) return;
    G.lastSave = t;
    EF.saveNow();
  };

  async function gz(str) {
    const cs = new CompressionStream('gzip'), w = cs.writable.getWriter();
    w.write(new TextEncoder().encode(str)).catch(() => {});
    w.close().catch(() => {});
    const u = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    let bin = '';
    for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return btoa(bin);
  }
  async function ungz(b64) {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const ds = new DecompressionStream('gzip'), w = ds.writable.getWriter();
    w.write(u).catch(() => {});
    w.close().catch(() => {});
    return await new Response(ds.readable).text();
  }
  EF.exportCode = async function () {
    const j = JSON.stringify(EF.serialize());
    try { if (typeof CompressionStream !== 'undefined') return 'EF2Z:' + (await gz(j)); } catch (e) {}
    return 'EF2J:' + j;
  };
  EF.importCode = async function (t) {
    t = (t || '').trim();
    let j = t;
    if (t.startsWith('EF2Z:')) j = await ungz(t.slice(5).replace(/\s+/g, ''));
    else if (t.startsWith('EF2J:')) j = t.slice(5);
    EF.loadGame(JSON.parse(j));
  };
})();
