(function () {
  const EF = (window.EF = window.EF || {});
  const $ = id => document.getElementById(id);

  let cv, cx;
  const PT = new Map();
  let DPR = 1, K0 = 1, PW = 0, SHEET = 0, TOPH = 62;
  let ecoKey = null, wpMode = false;
  const HC = {};
  const hset = (id, h) => { if (HC[id] !== h) { HC[id] = h; $(id).innerHTML = h; } };

  EF.kk = () => K0 * EF.G.z;
  EF.gest = null;
  EF.hoverProv = null;
  EF.hoverArmy = null;

  EF.log = function (s) {
    EF.LG.push(s);
    if (EF.LG.length > 4) EF.LG.shift();
    const r = () => { $('tk').innerHTML = EF.LG.map(l => `<div class="toast">${l}</div>`).join(''); };
    r();
    setTimeout(() => {
      const i = EF.LG.indexOf(s);
      if (i >= 0) { EF.LG.splice(i, 1); r(); }
    }, 9000);
  };

  function fitTop() {
    const t = $('top'), hh = t && t.offsetHeight;
    if (hh) {
      document.documentElement.style.setProperty('--toph', hh + 'px');
      TOPH = hh + (innerWidth > 860 ? 14 : 16);
    }
  }
  function clampV() {
    const G = EF.G, k = EF.kk(), vw = innerWidth / k, vh = innerHeight / k;
    G.vx = Math.max(-vw * 0.55, Math.min(EF.W - vw * 0.45, G.vx));
    G.vy = Math.max(-vh * 0.55, Math.min(EF.H - vh * 0.45, G.vy));
  }
  function centerView() {
    const G = EF.G, k = K0 * G.z;
    G.vx = EF.W / 2 - ((innerWidth - PW) / 2) / k;
    G.vy = EF.H / 2 - ((innerHeight - SHEET + TOPH) / 2) / k;
  }
  function focusOn(q, z) {
    const G = EF.G;
    G.z = Math.max(G.z, z || 1.8);
    const k = EF.kk();
    G.vx = q.x - ((innerWidth - PW) / 2) / k;
    G.vy = q.y - ((innerHeight - SHEET + TOPH) / 2) / k;
    clampV();
  }
  function zoomAt(sx, sy, f) {
    const G = EF.G, k = EF.kk(), wx = sx / k + G.vx, wy = sy / k + G.vy;
    G.z = Math.max(0.6, Math.min(6, G.z * f));
    const k2 = EF.kk();
    G.vx = wx - sx / k2; G.vy = wy - sy / k2;
    clampV();
  }
  function resize() {
    DPR = EF.DPR = Math.min(2, window.devicePixelRatio || 1);
    const w = innerWidth, h = innerHeight;
    const tall = !!(document.body && document.body.classList && document.body.classList.contains('tall'));
    cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const pmn = !!(document.body && document.body.classList && document.body.classList.contains('pmin'));
    PW = w > 860 ? (pmn ? 0 : 368) : 0;
    SHEET = w > 860 ? 0 : (pmn ? 54 : h * (tall ? 0.76 : 0.42));
    TOPH = w > 860 ? 62 : 104;
    fitTop();
    K0 = Math.min((w - PW - 24) / EF.W, (h - TOPH - SHEET - 24) / EF.H);
    EF.K0 = K0;
    if (EF.G) { if (EF.G.z === 1) centerView(); else clampV(); }
  }
  const toW = e => {
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, k = EF.kk();
    return [sx, sy, sx / k + EF.G.vx, sy / k + EF.G.vy];
  };

  EF.mkDest = e => {
    const A = EF.P[e.a], B = EF.P[e.b];
    return (EF.P['@'] = {
      id: '@', n: `a field position between ${A.n} and ${B.n}`,
      x: e.x, y: e.y, edge: { a: e.a, b: e.b, k: e.k },
      adj: [], o: 'NE', o0: 'FIELD', u: new Array(EF.U_LEN).fill(0), al: {}
    });
  };

  EF.actSet = function () {
    const G = EF.G, o = new Set(), sel = G.sel && EF.P[G.sel];
    const am = G.sel_m ? EF.M.find(m => m.id === G.sel_m) : null;
    if (sel) o.add(sel.id);
    G.ms.forEach(i => o.add(i));
    if (am) { o.add(am.f.id); o.add(am.t.id); }
    return o;
  };

  EF.tickPts = function (l, fleet) {
    if (l.t === 'land' || l.t === 'lane') return [0.25, 0.5, 0.75];
    if (l.t === 'port' && fleet) {
      const pr = EF.portRange(l.a, l.b);
      if (!pr || pr[1] - pr[0] < 0.16) return [];
      return [0.25, 0.55, 0.85].map(f => pr[0] + 0.05 + (pr[1] - pr[0] - 0.1) * f);
    }
    return [];
  };

  EF.edgeAt = function (wx, wy) {
    const k = EF.kk(), ex = Math.max(12, 15 / k);
    let b = null, bd = Math.max(11, 24 / k);
    EF.LNK().forEach(l => {
      const pl = EF.epl(l.a, l.b);
      let lo = 0.08, hi = 0.92;
      if (l.t === 'port') {
        const pr = EF.portRange(l.a, l.b);
        if (!pr) return;
        lo = pr[0] + 0.05; hi = pr[1] - 0.05;
        if (hi <= lo) return;
      } else if (l.t !== 'land' && l.t !== 'lane') return;
      for (let i = 1; i < pl.pts.length; i++) {
        const A = pl.pts[i - 1], C = pl.pts[i], dx = C.x - A.x, dy = C.y - A.y, l2 = dx * dx + dy * dy || 1;
        let t = ((wx - A.x) * dx + (wy - A.y) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        const x = A.x + dx * t, y = A.y + dy * t, d = Math.hypot(x - wx, y - wy);
        if (d < bd) {
          const kf = (pl.len[i - 1] + t * (pl.len[i] - pl.len[i - 1])) / pl.L;
          if (kf < lo || kf > hi) continue;
          bd = d; b = { a: l.a, b: l.b, k: kf, x, y };
        }
      }
    });
    return b && !EF.SD.some(q => Math.hypot(q.x - wx, q.y - wy) < ex) ? b : null;
  };

  function tickAt(wx, wy) {
    const G = EF.G, sel = G.sel && EF.P[G.sel];
    const am = G.sel_m ? EF.M.find(m => m.id === G.sel_m && m.o === G.me) : null;
    if (!((sel && EF.tot(EF.stk(sel, G.me)) > 0) || am)) return null;
    const act = EF.actSet(), uu = am ? am.u : EF.stk(sel, G.me), fleet = !!(uu[8] || uu[9] || uu[7]);
    let best = null, bd = Math.max(8, 16 / EF.kk());
    EF.LNK().forEach(l => {
      if (!(act.has(l.a) || act.has(l.b))) return;
      EF.tickPts(l, fleet).forEach(t => {
        const q = EF.epos(l.a, l.b, t), d = Math.hypot(q.x - wx, q.y - wy);
        if (d < bd) { bd = d; best = { a: l.a, b: l.b, k: t, x: q.x, y: q.y }; }
      });
    });
    return best;
  }

  function pickAt(wx, wy, own) {
    const k = EF.kk(), sc = EF.armyScale(k);
    let best = null, bd = 1e9;
    EF.armyClusters(k).forEach(c => {
      const items = c.items.filter(i => !own || i.m.o === EF.G.me);
      if (!items.length) return;
      const d = Math.hypot(c.x - wx, c.y - wy), lim = (c.items.length > 1 ? 24 : 18) * sc + 6 / k;
      if (d < lim && d < bd) { bd = d; best = items.map(i => i.m); }
    });
    return best;
  }
  const pickArmy = (wx, wy, own) => {
    const l = pickAt(wx, wy, own);
    if (!l) return null;
    return l.find(m => m.id === EF.G.sel_m) || l[0];
  };
  const pickArmyCycle = (wx, wy) => {
    const l = pickAt(wx, wy, false);
    if (!l) return null;
    if (l.length === 1) return l[0];
    const i = l.findIndex(m => m.id === EF.G.sel_m);
    return l[(i + 1) % l.length];
  };

  function setTgt(h) {
    const G = EF.G, s = EF.P[G.sel], su = EF.stk(s, G.me), f = su.findIndex(x => x > 0);
    G.tgt = h.id;
    G.tr = su.map((x, j) => (j === f && s.o === G.me && EF.tot(su) > 1 ? x - 1 : x));
  }

  function multiSend(o, srcs, t, half, sync) {
    const G = EF.G, pl = [];
    srcs.forEach(q => {
      const su = EF.stk(q, o), f = su.findIndex(x => x > 0);
      let u = half ? su.map(x => x >> 1) : su.map((x, j) => (j === f && q.o === o && EF.tot(su) > 1 ? x - 1 : x));
      if (!EF.tot(u) && EF.tot(su) > 1) u = su.map((x, j) => (j === f ? 1 : 0));
      if (!EF.tot(u)) return;
      const rt = EF.route(q, t, u, o);
      if (rt) pl.push({ q, u, rt, e: EF.etaR(q, rt, u, o) });
    });
    const mx = Math.max(0, ...pl.map(x => x.e));
    pl.forEach(x => {
      const d = sync ? mx - x.e : 0;
      if (d > 0.3) G.pend.push({ at: G.t + d, from: x.q.id, u: x.u, o, rt: x.rt });
      else EF.dispatch(x.q, x.u, o, x.rt);
    });
    return pl.length;
  }

  function multiArmyMove(list, t, sync) {
    const G = EF.G, pl = list.map(m => ({ m, p: EF.planArmy(m, t) })).filter(x => x.p);
    if (!pl.length) return 0;
    const mx = Math.max(...pl.map(x => x.p.e)), de = t.edge ? { ...t.edge, x: t.x, y: t.y } : null;
    pl.forEach(({ m, p }) => {
      const d = sync ? mx - p.e : 0;
      if (d > 0.3) { m.halted = true; G.pend.push({ at: G.t + d, army: m.id, o: m.o, de, to: t.id }); }
      else p.apply();
    });
    return pl.length;
  }

  // Alerts
  function frontOf(list) {
    let best = null, bs = -1;
    EF.SD.forEach(q => {
      if (q.o !== EF.G.me || q.o0 === 'SEA') return;
      const v = q.adj.reduce((t, id) => {
        const w = EF.P[id];
        return t + (w.o0 !== 'SEA' && list.includes(w.o) ? EF.pwr(w.u) + 1 : 0);
      }, 0);
      if (v > bs) { bs = v; best = q; }
    });
    return bs > 0 ? best : null;
  }
  EF.showAlert = function (o) {
    const G = EF.G;
    if (!G || G.over) return;
    G.alq = G.alq || []; G.alq.push(o);
    if (!G.alOn) { G.alOn = 1; G.sp0 = G.sp; G.sp = 0; }
    renderAlert();
  };
  function renderAlert() {
    const a = EF.G.alq, last = a[a.length - 1], rows = [...new Set(a.flatMap(x => x.rows || []))];
    $('alc').innerHTML = `<div class="swords">⚔️</div><div class="alk">${last.kicker}</div><div class="alt">${last.title}</div><div class="als">${last.sub || ''}</div>${rows.length ? `<div class="alrows">${rows.map(c => `<span>${EF.fi(c, 20)} ${EF.NATIONS[c][0]}</span>`).join('')}</div>` : ''}${a.length > 1 ? `<div class="als">${a.length - 1} more event${a.length > 2 ? 's' : ''} while this was open</div>` : ''}<div class="alb">${last.front ? '<button id="al-go" class="pri">Go to the front</button>' : ''}<button id="al-ok">${last.k === 'war' ? 'To arms!' : 'Continue'}</button></div>`;
    $('al').style.display = 'flex';
  }
  function closeAlert(go) {
    const G = EF.G, last = G.alq && G.alq[G.alq.length - 1];
    G.alOn = 0; G.alq = []; $('al').style.display = 'none';
    G.sp = G.sp0 == null ? 1 : G.sp0;
    if (go && last && last.front) {
      focusOn(last.front); G.sel = last.front.id; G.tgt = null; G.sel_m = null;
      G.ms.clear(); G.dirty = 1; showTab('prov');
    }
    EF.ui(true);
  }
  EF.warAlert = (nw, a, b) => {
    const direct = b === EF.G.me;
    EF.showAlert({
      k: 'war', kicker: 'Declaration of war',
      title: direct ? `${EF.NATIONS[a][0]} declares war on you!` : `${EF.NATIONS[a][0]} attacks your ally ${EF.NATIONS[b][0]}`,
      sub: direct ? (nw.length > 1 ? 'Their allies are joining the war against you.' : 'Prepare your defenses.') : 'Your alliance drags you into the war.',
      rows: nw, front: frontOf(nw)
    });
  };

  function showTab(t) {
    ['prov', 'mkt', 'dip', 'spy'].forEach(k => $('tab-' + k).classList.toggle('hid', k !== t));
    $('tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  }

  // UI Rendering Helpers
  const tiles = u => `<div class="tiles">${EF.T.map((t, i) => u[i] ? `<div class="tile" title="${t[0]}"><img src="${EF.SU[i]}" width="30" height="21"><b>${u[i]}</b><small>${t[0]}</small></div>` : '').join('') || '<span class="mu">No troops</span>'}</div>`;
  const hmHTML = (h, m) => `<div class="hm"><span>Health</span><div class="bar2"><i style="width:${Math.round(h * 100)}%;background:${EF.hcol(h)}"></i></div><span>Morale</span><div class="bar2"><i style="width:${Math.round(m * 100)}%;background:${EF.hcol(m)}"></i></div></div>`;

  function pinfo(p) {
    const G = EF.G, v = G.vis.has(p.id), sea = p.o0 === 'SEA';
    const al = Object.entries(p.al).filter(([, a]) => EF.tot(a) > 0);
    const bt = EF.BT.find(b => b.kind === 'prov' && b.p === p);
    const own = p.o === G.me, hasGuns = own && !sea && EF.RNG(p.u, p) > 0;
    const intelActive = G.intel && G.intel[p.id] > G.t;

    let h = `<div class="meta"><span class="chip">${EF.fi(p.o, 16)} ${p.o === 'SEA' ? 'Open sea' : EF.NATIONS[p.o][0]}</span>${p.cap ? '<span class="chip">★ Capital</span>' : ''}${!sea ? `<span class="chip">${p.v > 1 ? '2× Double' : '1× Single'} ${EF.RNm[p.r]}</span>` : ''}${p.coastal ? (p.port ? `<span class="chip">⚓ Port Lv ${p.port}</span>` : '<span class="chip">⚓ Coastal</span>') : ''}${p.aero ? `<span class="chip">✈ Airfield Lv ${p.aero}</span>` : ''}${EF.bm(p) < 1 ? '<span class="chip bad">Blockaded</span>' : ''}${!sea && p.st < 0.5 ? '<span class="chip bad">Unrest</span>' : ''}${intelActive ? '<span class="chip" style="background:#0284c7;color:#fff">🕵 Intel Active</span>' : ''}${hasGuns ? `<span class="chip ${p.autoFire !== false ? '' : 'bad'}">${p.autoFire !== false ? '🛡 Auto-Defend' : 'Auto-Defend OFF'}</span>` : ''}</div>`;

    if (!sea) {
      const pb = 1 + (p.port || 0) * 0.2, m = EF.bm(p) * EF.pm(p) * pb;
      const gpDay = p.v * EF.INC * m * 1.5 + (p.cap ? 1.5 : 0);
      const rpDay = p.v * 0.3 * m * 1.5;
      h += `<div class="stats"><div><label>Income</label><b>${EF.ri('g', 15)} ${gpDay.toFixed(1)}<small>/day</small></b></div><div><label>${EF.RNm[p.r]} ${p.v > 1 ? '2×' : '1×'}</label><b>${EF.ri(p.r, 15)} ${rpDay.toFixed(1)}<small>/day</small></b></div><div><label>Defense</label><b>${10 + 2 * p.walls}<small> frontage</small></b></div></div>` + (p.st < 0.99 ? `<div class="hm"><span>Stability</span><div class="bar2"><i style="width:${Math.round(p.st * 100)}%;background:${EF.hcol(p.st)}"></i></div></div>` : '');
    }
    if (bt && v) h += `<div class="note"><b>⚔ Battle in progress</b><small>Round ${bt.rounds} · ${EF.NATIONS[bt.ao][0]} ${EF.tot(bt.au)} vs ${EF.tot(EF.defU(p))} defenders</small></div>`;
    h += v
      ? `<div class="sec">Garrison</div>${tiles(p.u)}${hmHTML(p.hp, p.mo)}` + al.map(([o, a]) => `<div class="sec">${o === G.me ? 'Your troops here' : EF.NATIONS[o][0] + (EF.R[p.o][o] === 'ally' ? ' · ally' : ' · pact')}</div>${tiles(a)}${hmHTML(EF.SH(p, o).hp, EF.SH(p, o).mo)}`).join('')
      : '<div class="mu">No intelligence on forces here. Send an Airplane or Spy!</div>';
    return h;
  }

  function upCard(p, k) {
    const G = EF.G, L = EF.lv(p, k), mx = EF.MXL[k], busy = p.cons && p.cons.k === k;
    const nm = k === 'wall' ? 'Fortress' : k === 'ind' ? 'Industry' : k === 'bar' ? 'Barracks' : k === 'port' ? 'Naval Port' : k === 'aero' ? 'Aerodrome' : (L >= 2 ? 'Rail' : L === 1 ? 'Road' : 'Roads');
    const fx = {
      wall: '+40% defense/lvl, +2 frontage. Upkeep: None',
      ind: '+25% output/lvl. Unlocks armor/air/navy. Upkeep: -0.2 oil/day/lvl',
      inf: L >= 2 ? 'Rail: marches ×2.2, enables Railguns. Upkeep: -0.2 coal/day' : L === 1 ? 'Road: marches ×1.4. Upkeep: None' : 'Road ×1.4 · Rail ×2.2 (-0.2 coal/day)',
      bar: 'Speeds recruitment & Cavalry. Upkeep: -0.3 food/day/lvl',
      port: 'Rapid embarkation, +20% income, Ships. Produces: +0.4 food, +0.3g/day',
      aero: 'Enables Airplanes, air strikes & air-rebasing. Upkeep: -0.15 oil/day/lvl'
    }[k];
    const pips = Array.from({ length: mx }, (_, i) => `<i class="${i < L ? 'on' : ''}"></i>`).join('');
    let right;
    if (busy) {
      const f = Math.min(1, (G.t - p.cons.st) / (p.cons.end - p.cons.st));
      right = `<div class="bar"><span style="width:${(f * 100).toFixed(0)}%"></span></div><small>Under construction · ${Math.ceil((p.cons.end - G.t) / EF.DAY_T)} days left</small>`;
    } else if (L >= mx) right = '<small>Fully built</small>';
    else right = '<small>' + Object.entries(EF.cCost(k, L + 1)).map(([r, v]) => EF.ri(r, 13) + v).join(' ') + ` · ${Math.ceil(EF.CDUR[k](L + 1) / EF.DAY_T)} days</small>`;
    return `<img src="${EF.BU[k]}" width="26" height="26"><div class="ut"><b>${nm}</b><span class="pips">${pips}</span><small>${fx}</small>${right}</div>`;
  }

  function side() {
    const G = EF.G;
    if (G.sel_m && EF.M.some(x => x.id === G.sel_m)) return;
    const p = G.sel && EF.P[G.sel], own = p && p.o === G.me, land = p && p.o0 !== 'SEA';
    $('pn').textContent = p ? p.n : 'Pick a province';
    $('pi').innerHTML = p ? pinfo(p) : 'Select a province or army on the map.';
    ['wall', 'ind', 'inf', 'bar', 'port', 'aero'].forEach(k => {
      const b = $('up-' + k);
      if (land) {
        if (k === 'port' && !p.coastal) { b.style.display = 'none'; return; }
        b.style.display = 'flex';
        b.innerHTML = upCard(p, k);
        b.disabled = !(own && land && EF.canCons(G.me, p, k));
      }
    });
    const rb = $('up-rest'), showR = !!(own && land && p.st < 0.97);
    rb.style.display = showR ? 'flex' : 'none';
    if (showR) {
      rb.innerHTML = `<img src="${EF.BU.rest}" width="26" height="26"><div class="ut"><b>Restore order</b><small>Stability ${Math.round(p.st * 100)}% · output ×${(0.3 + 0.7 * p.st).toFixed(2)}</small><small>${EF.ri('g', 13)}${12 * p.v}</small></div>`;
      rb.disabled = G.g[G.me] < 12 * p.v;
    }
    $('rcb').querySelectorAll('button').forEach((b, k) => {
      b.disabled = !(own && land && EF.canRecruit(G.me, p, k));
    });
    hset('qpn', (own && land && p.q.length)
      ? `<div class="sec" style="margin-top:6px">In production</div>` + p.q.map((j, i) => {
          const f = j.end != null ? Math.min(1, (G.t - j.st) / (j.end - j.st)) : 0;
          return `<div class="qj"><img src="${EF.SU[j.k]}" width="24" height="17"><div class="qb"><b>${EF.T[j.k][0]}</b><div class="bar2"><i style="width:${Math.round(f * 100)}%;background:var(--ac)"></i></div></div><small>${j.end != null ? Math.ceil((j.end - G.t) / EF.DAY_T) + ' d' : 'queued'}</small><button data-qc="${i}" title="Cancel (75% refund)">✕</button></div>`;
        }).join('')
      : '');
    const sh = own && land;
    $('upg').style.display = sh ? 'grid' : 'none';
    $('rcb').style.display = sh ? 'grid' : 'none';
    $('rch').style.display = sh ? '' : 'none';
  }

  function bombHTML(src, army) {
    const G = EF.G, u = src.u, rg = EF.RNG(u, army ? null : src);
    if (!rg || src.o !== G.me) return '';
    const op = EF.fireTargets(src, army, G.me).map(t => `<option value="${t.v}">${t.n}</option>`);
    const rng = [
      u[3] ? `artillery ${EF.ARANGE}` : '',
      u[6] ? `railgun ${EF.RRANGE}` : '',
      !army && src.aero >= 1 && u[7] ? `air ${src.aero >= 2 ? EF.PRANGE2 : EF.PRANGE}` : '',
      u[9] ? `ships ${EF.SRANGE}` : ''
    ].filter(Boolean).join(' · ');
    const afOn = src.autoFire !== false;
    const realCd = Math.round(EF.ACD / (EF.BASE * (G.sp || 1)));
    const afBtn = `<div class="row" style="margin-top:6px"><button id="${army ? 'btn-m-autofire' : 'btn-autofire'}" class="${afOn ? 'pri' : ''}">${afOn ? '🛡 Auto Defensive Fire: ON' : '⏸ Auto Defensive Fire: OFF'}</button></div>`;
    return `<div class="sec" style="margin-top:10px">Fire support <span class="mu" style="text-transform:none;letter-spacing:0">range ${rng} · salvo every ${Math.round(EF.ACD / EF.DAY_T)}d (~${realCd}s)</span></div>${afBtn}${src.bt ? `<div class="note">Firing at <b>${src.bt.k === 'p' ? EF.P[src.bt.id].n : 'an enemy army'}</b> <button id="btn-cease">Cease fire</button></div>` : ''}${army && !src.halted ? '<div class="mu">Halt the army to bring its guns into action.</div>' : ''}${op.length ? `<div class="row"><select id="bm-tgt">${op.join('')}</select><button id="btn-bomb" class="danger">Fire</button></div>` : '<div class="mu">No enemy in range.</div>'}`;
  }

  function armyTxt(m) {
    const G = EF.G, P = EF.P, nx = [m.t, ...m.path.map(i => P[i])], here = EF.armyPos(m), kx = m.kmax || 1;
    if (m.embState === 'marching') return `Marching to coast for embarkation`;
    if (m.embark) return `Embarking at shore · Ready in ~${Math.max(1, Math.ceil((m.embark.end - G.t) / EF.DAY_T))}d ${m.embark.port ? '(naval port)' : '(beach)'}`;
    if (m.halted) return 'Holding position';
    const wpTxt = m.waypoints && m.waypoints.length ? ` (+${m.waypoints.length} waypoint${m.waypoints.length > 1 ? 's' : ''})` : '';
    if (kx < 1) return `Marching to field position${wpTxt}`;
    const names = nx.map(q => q.n); if (m.stop) names.push('field position');
    return `Marching to ${names.join(' → ')} · ETA ~${Math.round(EF.etaOf([here, ...nx], m.u))}s${wpTxt}`;
  }

  function routeTxt(s, t, u) {
    const rt = EF.route(s, t, u, EF.G.me);
    EF.G.rt = rt;
    return rt
      ? [s.n, ...rt.map(i => EF.P[i].n), ...(t.edge ? ['<i>field position</i>'] : [])].join(' → ') + ` · ETA ~${Math.round(EF.etaS(s, rt, u))}s`
      : '<span style="color:#f87171">No route: needs a pact/alliance, a Rail link (for Railguns), or an Aerodrome hop.</span>';
  }

  function abarUI() {
    const G = EF.G, el = $('abar'), fm = $('fmenu'), p = G.sel && EF.P[G.sel];
    const mi = G.sel_m ? EF.M.find(x => x.id === G.sel_m) : null;
    let h = '', menuHTML = '';
    const B = (id, cls, txt) => `<button id="bar-${id}" class="${cls}">${txt}</button>`;
    const fireBtn = (src, army) => {
      const tg = EF.fireTargets(src, army, G.me);
      let s2 = '';
      if (src.bt) s2 += B('btn-cease', 'danger', '■ Cease fire');
      if (tg.length && (!army || src.halted)) {
        s2 += B('btn-fire-menu', 'danger', `🔥 Fire ▾ (${tg.length})`);
        if (G.fmOpen) menuHTML = tg.slice(0, 8).map(t => `<button data-fire="${t.v}">${t.n}</button>`).join('');
      }
      return s2;
    };
    if (mi && mi.o === G.me) {
      if (mi.fight) h = '<span class="mu">⚔ Engaged in battle</span>';
      else if (G.ma.size && G.tgtA) {
        const t = G.tgtA.edge ? EF.mkDest({ ...G.tgtA.edge, x: G.tgtA.x, y: G.tgtA.y }) : EF.P[G.tgtA.id];
        h = B('btn-mamove', 'pri big', `▶ Move ${1 + G.ma.size} armies to ${t.n.split(' between')[0]}`) + B('btn-cancel', '', 'Cancel');
      } else {
        h = (mi.halted ? '<button data-army="resume" class="pri">▶ Resume</button>' : '<button data-army="halt">⏸ Halt</button>') +
            '<button data-army="rev">↩ Turn back</button>' +
            `<button data-army="forced" class="${mi.forced ? 'danger' : ''}" title="Forced March: +50% speed at HP/morale cost">⚡ ${mi.forced ? 'Forced ON' : 'Forced March'}</button>`;
        if (mi.waypoints && mi.waypoints.length) h += '<button data-army="clearwp">✕ Clear WP</button>';
        if (EF.tot(mi.u) > mi.u[3] + mi.u[6] + mi.u[9] && (mi.u[3] || mi.u[6] || mi.u[9])) h += B('btn-spfront', '', '⚔ Front line out');
        h += fireBtn(mi, true);
      }
    } else if (p && G.ms.size && G.tgt) {
      const t = EF.P[G.tgt];
      h = B('btn-msend', 'pri big', `▶ March ${1 + G.ms.size} provinces to ${t.n.split(' between')[0]}`) + B('btn-cancel', '', 'Cancel');
    } else if (p && G.tgt) {
      const t = EF.P[G.tgt], su = EF.stk(p, G.me), u = EF.tot(G.tr) ? G.tr : su;
      const rt = G.rt, eta = rt ? Math.round(EF.etaS(p, rt, u)) + 's' : '';
      h = B('btn-send-exact', 'pri big', `▶ MARCH to ${t.n.split(' between')[0]}${eta ? ' · ' + eta : ''}`) + B('btn-cancel', '', 'Cancel');
    } else if (p && p.o === G.me && EF.RNG(p.u, p)) h = fireBtn(p, false);
    hset('abar', h); hset('fmenu', menuHTML);
    el.style.display = h ? 'flex' : 'none';
    fm.style.display = (menuHTML && G.fmOpen) ? 'flex' : 'none';
  }

  function mkUI() {
    const G = EF.G;
    if (!G || !G.px) return;
    const q = +$('mq').value, sp = EF.sanctionSpread(G.me);
    const spNote = sp > 0 ? `<span style="color:#f87171">Embargo sanctions active: +${Math.round(sp * 100)}% merchant spread</span>` : 'National orders let you trade directly without merchant markups.';
    hset('mk-sanct', spNote);

    EF.RK.forEach(r => {
      const a = G.ph[r] || [], tr = a.length > 3 ? (a[a.length - 1] > a[a.length - 4] * 1.005 ? '▲' : a[a.length - 1] < a[a.length - 4] * 0.995 ? '▼' : '•') : '';
      $('ms-' + r).textContent = Math.floor(G.rs[G.me][r]);
      $('mp-' + r).textContent = G.px[r].toFixed(1) + 'g ' + tr;
      const mn = Math.min(...a), mx = Math.max(...a), rg = (mx - mn) || 1;
      $('sk-' + r).innerHTML = a.length < 2 ? '' : `<polyline fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" points="${a.map((v, i) => `${(i * 44 / (a.length - 1)).toFixed(1)},${(13 - (v - mn) / rg * 12).toFixed(1)}`).join(' ')}"/>`;
      const b = $('mb-' + r), c = $('mc-' + r), have = Math.floor(G.rs[G.me][r]);
      b.textContent = `Buy ${q} · ${Math.ceil(EF.quote(r, q, true, G.me))}g`;
      b.disabled = G.g[G.me] < EF.quote(r, q, true, G.me);
      c.textContent = `Sell ${Math.min(q, have)} · ${Math.floor(EF.quote(r, Math.min(q, have), false, G.me))}g`;
      c.disabled = have < 1;
    });

    // Order Board
    const orders = (G.mktOrders || []).filter(x => x.o === G.me || !EF.isEmbargoed(G.me, x.o));
    hset('mk-orders', orders.length
      ? orders.map(ord => {
          const own = ord.o === G.me;
          const canFill = !own && (ord.side === 'sell' ? G.g[G.me] >= ord.qty * ord.px : G.rs[G.me][ord.r] >= ord.qty);
          return `<div class="mf">${EF.fi(ord.o, 16)}<span><b>${EF.NATIONS[ord.o][0]}</b> ${ord.side === 'sell' ? 'sells' : 'buys'} ${ord.qty} ${EF.ri(ord.r, 13)} @ <b>${ord.px.toFixed(1)}g</b></span><span style="margin-left:auto">${own ? `<button data-ord-cancel="${ord.id}">Cancel</button>` : `<button data-ord-fill="${ord.id}" class="pri" ${canFill ? '' : 'disabled'}>${ord.side === 'sell' ? 'Buy' : 'Sell'}</button>`}</span></div>`;
        }).join('')
      : '<div class="mu">No open national market orders.</div>');

    hset('mkf', G.mkl.length
      ? `<div class="sec" style="margin-top:8px">Recent trades</div>` + G.mkl.map(x => `<div class="mf">${EF.fi(x.o, 15)}<span><b>${EF.NATIONS[x.o][0]}</b> ${x.n > 0 ? 'bought' : 'sold'} ${Math.abs(x.n)} ${EF.ri(x.r, 13)} ${EF.RNm[x.r]}</span></div>`).join('')
      : '');
  }

  function dipUI() {
    const G = EF.G, R = EF.R, c = {};
    EF.SD.forEach(q => { if (q.o0 !== 'SEA') c[q.o] = (c[q.o] || 0) + 1; });
    const off = G.offers.map((x, i) => `<div class="dr offer">${EF.fi(x.from, 18)}<div><b>${EF.NATIONS[x.from][0]}</b><small>offers ${{ peace: 'a ceasefire', pact: 'a non-aggression pact', ally: 'an alliance' }[x.type]}</small></div><span class="st">offer</span><span class="bs"><button data-a="accept" data-i="${i}" class="pri">Accept</button><button data-a="decline" data-i="${i}">Decline</button></span></div>`).join('');
    const h = off + EF.NS.filter(o => o !== G.me).map(o => {
      const s = R[G.me][o], n = c[o] || 0; let b = '';
      const isDen = !!(G.denounced && G.denounced[o]);
      const isEmb = !!(G.embargoes && G.embargoes[G.me] && G.embargoes[G.me][o]);
      if (n) {
        if (s === 'war') b += `<button data-a="peace" data-o="${o}">Offer peace</button>`;
        else if (s === 'ally') {
          b += `<button data-a="break" data-o="${o}">Break alliance</button>`;
          const wars = EF.NS.filter(e => R[G.me][e] === 'war' && R[o][e] !== 'war' && EF.mine(e).length);
          if (wars.length) b += `<button data-a="call" data-o="${o}" class="pri">Call to arms</button>`;
        } else {
          if (!isDen) {
            if (s === 'peace') b += `<button data-a="pact" data-o="${o}">Pact</button>`;
            if (s === 'pact' || EF.getRel(G.me, o) >= 40) b += `<button data-a="ally" data-o="${o}">Ally</button>`;
          }
          if (s === 'peace') b += `<button data-a="war" data-o="${o}">Declare war</button>`;
          else b += `<button data-a="break" data-o="${o}">Break pact</button>`;
        }
        if (s !== 'ally') {
          b += isDen ? `<button data-a="retract" data-o="${o}">Retract denunciation</button>` : `<button data-a="denounce" data-o="${o}">Denounce</button>`;
          if (s !== 'war') {
            b += isEmb ? `<button data-a="unembargo" data-o="${o}">Lift Embargo</button>` : `<button data-a="embargo" data-o="${o}">Embargo</button>`;
          }
        }
        if (!EF.isEmbargoed(G.me, o)) b += `<button data-a="aid" data-o="${o}">Aid 40g</button>`;
        if (s !== 'war') {
          const myCore = EF.SD.filter(p => p.o === o && p.o0 === G.me && !p.cap && n > 1);
          if (myCore.length) b += `<button data-a="reclaim" data-o="${o}" data-pid="${myCore[0].id}" class="pri">Reclaim ${myCore[0].n}</button>`;
          else if (s !== 'ally') {
            const bdr = EF.SD.filter(p => p.o === o && !p.cap && n > 1 && p.adj.some(a => EF.P[a].o === G.me));
            if (bdr.length) b += `<button data-a="demand" data-o="${o}" data-pid="${bdr[0].id}">Claim ${bdr[0].n}</button>`;
          }
        }
      }
      const rScore = EF.getRel(G.me, o), rd = EF.relDesc(rScore);
      const relHtml = `<div style="grid-column:2/4;display:flex;align-items:center;gap:6px;margin:2px 0 4px"><div style="flex:1;height:5px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden"><div style="width:${Math.max(4, Math.round((rScore + 100) / 2))}%;height:100%;background:${rd.col};border-radius:3px"></div></div><span style="font-size:11px;font-weight:600;color:${rd.col}">${rd.txt}</span></div>`;
      return `<div class="dr">${EF.fi(o, 18)}<div><b>${EF.NATIONS[o][0]}</b><small>${n ? n + ' provinces' : 'eliminated'}${isDen ? ' · Denounced' : ''}${isEmb && s !== 'war' ? ' · Embargoed' : ''}</small></div><span class="st ${s}">${isDen ? 'denounced' : s}</span>${relHtml}<div class="bs">${b}</div></div>`;
    }).join('');
    if (h !== G.dh) { $('dp').innerHTML = h; G.dh = h; }
    $('dbadge').textContent = G.offers.length || '';
    hset('ofr', G.offers.map((x, i) => `<div class="offer-card glass">${EF.fi(x.from, 18)}<span><b>${EF.NATIONS[x.from][0]}</b> offers ${{ peace: 'a ceasefire', pact: 'a non-aggression pact', ally: 'an alliance' }[x.type]}</span><span class="bs"><button data-i="${i}" data-a="accept" class="pri">Accept</button><button data-i="${i}" data-a="decline">Decline</button></span></div>`).join(''));
  }

  function spyUI() {
    const G = EF.G, mySpies = (G.spies || []).filter(s => s.o === G.me);
    const selP = G.sel && EF.P[G.sel] && EF.P[G.sel].o0 !== 'SEA' ? EF.P[G.sel] : null;
    const isOwn = selP && selP.o === G.me;
    let hireHTML = '<div class="mu">Select any land province on the map to deploy a new spy there (30g).</div>';
    if (selP) {
      hireHTML = `<div class="note"><b>Target: ${selP.n}</b> (${EF.NATIONS[selP.o][0]})<div class="row" style="margin-top:6px">` +
        (isOwn
          ? `<button data-spy-hire="counter" data-pid="${selP.id}" class="pri" ${G.g[G.me] < EF.SPY_HIRE_COST ? 'disabled' : ''}>🛡 Counter-Spy (30g · 0.8g/d)</button>`
          : `<button data-spy-hire="intel" data-pid="${selP.id}" class="pri" ${G.g[G.me] < EF.SPY_HIRE_COST ? 'disabled' : ''}>🕵 Intel (30g · 0.8g/d)</button>` +
            `<button data-spy-hire="eco" data-pid="${selP.id}" ${G.g[G.me] < EF.SPY_HIRE_COST ? 'disabled' : ''}>💣 Eco Sabotage (30g · 1.5g/d)</button>` +
            `<button data-spy-hire="mil" data-pid="${selP.id}" class="danger" ${G.g[G.me] < EF.SPY_HIRE_COST ? 'disabled' : ''}>⚔ Mil Sabotage (30g · 2g/d)</button>`) +
        `</div></div>`;
    }
    const listHTML = mySpies.length
      ? mySpies.map(s => {
          const p = EF.P[s.targetProv];
          return `<div class="sl"><div><b>${EF.SPY_LABEL[s.mission]}</b><small>${p ? p.n + ' (' + EF.NATIONS[p.o][0] + ')' : s.targetProv} · ${EF.SPY_COST[s.mission]}g/day</small></div><button data-spy-del="${s.id}">Dismiss</button></div>`;
        }).join('')
      : '<div class="mu">No active operatives.</div>';
    const logs = (G.spyLog || []).slice(0, 10).map(l => `<div class="mf"><span>${l}</span></div>`).join('');
    hset('spy-pnl', `<div class="sec" style="margin-top:0">Espionage Headquarters (${mySpies.length}/10)</div><div class="mu">Missions resolve daily at 00:00. Counter-spies catch enemy agents.</div>${hireHTML}<div class="sec">Active Operatives</div>${listHTML}<div class="sec">Daily Spy Reports</div>${logs || '<div class="mu">No reports yet.</div>'}`);
  }

  function newsUI() {
    const G = EF.G;
    const cat = $('np-cat') ? $('np-cat').value : 'all';
    const list = (G.news || []).filter(n => cat === 'all' || n.cat === cat);
    $('np-list').innerHTML = list.length
      ? list.map(n => `<article class="np-art"><div class="np-meta"><span>${n.dateStr} · Day ${n.day}</span><span>${n.nations.map(o => EF.fi(o, 14)).join(' ')}</span></div><h4>${n.title}</h4><p>${n.body}</p></article>`).join('')
      : '<div class="mu">No dispatches in this category yet.</div>';
    G.newsRead = (G.news || []).length;
    $('np-tgt').innerHTML = '<option value="">General Statement</option>' + EF.NS.filter(o => o !== G.me).map(o => `<option value="${o}">${EF.NATIONS[o][0]}</option>`).join('');
  }

  function ecoHTML(key, E) {
    const d = key === 'g' ? E.g : E.R[key], nm = key === 'g' ? 'Gold' : EF.RNm[key], net = d.p - d.c, fmt = v => (v >= 0 ? '+' : '') + v.toFixed(2);
    const ps = d.ps.slice().sort((x, y) => y[1] - x[1]), top = ps.slice(0, 6), rest = ps.slice(6).reduce((s2, x) => s2 + x[1], 0);
    const prod = top.map(([n, v]) => `<div class="er"><span>${n}</span><b>+${v.toFixed(2)}</b></div>`).join('') + (rest > 0 ? `<div class="er"><span>${ps.length - 6} more</span><b>+${rest.toFixed(2)}</b></div>` : '');
    const cons = Object.entries(d.cs).sort((x, y) => y[1] - x[1]).map(([n, v]) => `<div class="er"><span>${n}</span><b>−${v.toFixed(2)}</b></div>`).join('');
    return `<div class="eh">${EF.ri(key, 20)}<b>${nm}</b><span class="${net < 0 ? 'neg' : 'pos'}">${fmt(net)} / day</span></div><div class="sec">Production +${d.p.toFixed(2)}</div>${prod || '<div class="mu">None</div>'}<div class="sec" style="margin-top:6px">Consumption −${d.c.toFixed(2)}</div>${cons || '<div class="mu">None</div>'}`;
  }
  function showEco(c) {
    const key = c.dataset.r; if (!key || !EF.G) return;
    ecoKey = key; EF.G.ecoV = EF.econ(EF.G.me);
    const el = $('ecp'), r = c.getBoundingClientRect();
    el.innerHTML = ecoHTML(key, EF.G.ecoV); el.style.display = 'block';
    const w = el.offsetWidth || 290;
    el.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    el.style.top = (r.bottom + 8) + 'px';
  }
  function hideEco() { ecoKey = null; $('ecp').style.display = 'none'; }

  EF.ui = function (force) {
    const G = EF.G;
    if (!G || G.over) return;
    const d = new Date(Date.UTC(1914, 7, 1) + Math.floor(G.t / EF.DAY_T) * 864e5);
    const dd = G.t / EF.DAY_T, hh = Math.floor((dd % 1) * 24), mi = Math.floor(((dd * 24) % 1) * 60), p2 = n => String(n).padStart(2, '0');
    hset('dt', `<b>${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</b><span class="tm">${p2(hh)}:${p2(mi)}</span><span class="mu">1 day = ${G.sp ? (EF.DAY_T / (EF.BASE * G.sp)).toFixed(G.sp >= 16 ? 1 : 0) + ' s' : 'paused'}</span>`);

    const ev = G.ecoV || (G.ecoV = EF.econ(G.me)), nt = d2 => d2.p - d2.c, fmt = v => (v >= 0 ? '+' : '') + v.toFixed(1);
    const sh = G.shortages[G.me] || {};
    if (!ecoKey) {
      hset('gd', `<span class="rc ${sh.g ? 'short' : ''}" data-r="g">${EF.ri('g', 18)} ${Math.floor(G.g[G.me])}<small class="${nt(ev.g) < 0 ? 'neg' : 'pos'}">${fmt(nt(ev.g))}</small></span>`);
      hset('rs', EF.RK.map(r => `<span class="rc ${sh[r] ? 'short' : ''}" data-r="${r}">${EF.ri(r, 18)} ${Math.floor(G.rs[G.me][r])}<small class="${nt(ev.R[r]) < 0 ? 'neg' : 'pos'}">${fmt(nt(ev.R[r]))}</small></span>`).join(''));
    }
    const unread = Math.max(0, (G.news || []).length - (G.newsRead || 0));
    $('nbadge').textContent = unread || '';
    hset('pr', G.vc === 'maj' ? `Coalition ${EF.coal()}/${EF.need()} prov.` : G.vc === 'dom' ? `You ${EF.mine(G.me).length}/${EF.need()} prov.` : G.vc === 'tot' ? `You ${EF.mine(G.me).length}/${EF.LAND()} prov.` : `Endless · Rank #${EF.ranks().indexOf(G.me) + 1}`);

    if (!force) {
      if ((G.fr = (G.fr || 0) + 1) % 15 === 0) {
        EF.autosave(); G.ecoV = EF.econ(G.me); side(); dipUI(); mkUI(); spyUI(); abarUI();
        if (ecoKey && $('ecp').style.display === 'block') $('ecp').innerHTML = ecoHTML(ecoKey, G.ecoV);
        if ($('sb').style.display === 'flex') sbUI();
      }
      return;
    }

    $('sp').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.s === G.sp));
    document.querySelectorAll('#mmode button').forEach(b => b.classList.toggle('on', b.dataset.mm === G.mapMode));

    const p = G.sel && EF.P[G.sel], own = p && p.o === G.me, mi2 = G.sel_m ? EF.M.find(x => x.id === G.sel_m) : null;
    let act = '';
    if (mi2) {
      const isSeaZone = mi2.f.o0 === 'SEA' || mi2.t.o0 === 'SEA', isConv = EF.isConvoy(mi2.u, isSeaZone);
      $('pn').textContent = `Army · ${EF.NATIONS[mi2.o][0]}`;
      $('pi').innerHTML = `<div class="meta"><span class="chip">${EF.fi(mi2.o, 16)} ${EF.NATIONS[mi2.o][0]}</span>${mi2.fight ? '<span class="chip bad">⚔ In battle</span>' : mi2.embark ? `<span class="chip" style="background:#0284c7;color:#fff">⚓ Embarking</span>` : mi2.halted ? '<span class="chip">Holding</span>' : ''}${mi2.forced ? '<span class="chip bad">⚡ Forced March</span>' : ''}${isConv ? '<span class="chip bad">⚠️ Convoy</span>' : ''}</div>${tiles(mi2.u)}${hmHTML(mi2.hp, mi2.mo)}`;
      $('upg').style.display = 'none'; $('rcb').style.display = 'none'; $('rch').style.display = 'none';
      act = `<div class="route">${mi2.fight ? 'Engaged in battle' : armyTxt(mi2)}</div>`;
      if (mi2.o === G.me && !mi2.fight) {
        if (G.ma.size) {
          const list = [mi2, ...[...G.ma].map(id => EF.M.find(x => x.id === id)).filter(Boolean)];
          act = `<div class="note"><b>${list.length} armies selected</b></div>`;
          if (G.tgtA) {
            const t = G.tgtA.edge ? EF.mkDest({ ...G.tgtA.edge, x: G.tgtA.x, y: G.tgtA.y }) : EF.P[G.tgtA.id];
            act += `<div class="sec">Move together to <b>${t.n}</b></div><label class="row"><input type="checkbox" id="sync" ${G.sync ? 'checked' : ''}> Arrive at the same time</label>`;
          } else act += '<div class="mu">Drag from any selected army to destination.</div>';
          act += '<div class="row" style="margin-top:6px"><button id="btn-mmerge">Merge selected</button></div>';
        } else {
          act += `<div class="row">${mi2.halted ? '<button data-army="resume">Resume</button>' : '<button data-army="halt">Halt</button>'}<button data-army="rev">Turn back</button><button data-army="forced" class="${mi2.forced ? 'danger' : ''}">⚡ ${mi2.forced ? 'Forced ON' : 'Forced March'}</button>${mi2.waypoints && mi2.waypoints.length ? '<button data-army="clearwp">Clear WP</button>' : ''}</div><div class="mu">Drag to march, or hold <b>Shift</b> (or tap ⚑) to chain waypoints.</div>`;
          if (EF.tot(mi2.u) > 1) {
            act += `<div class="sec" style="margin-top:10px">Split &amp; merge</div><div class="deploy">${EF.T.map((tt, i) => mi2.u[i] > 0 ? `<div class="dr2"><img src="${EF.SU[i]}" width="26" height="19"><span>${tt[0]}</span><input type="number" data-sp="${i}" value="${G.spl[i]}" min="0" max="${mi2.u[i]}"><button data-sp="${i}" data-spv="1">1</button><button data-sp="${i}" data-spv="half">½</button><button data-sp="${i}" data-spv="all">All</button></div>` : '').join('')}</div><div class="row"><button id="btn-split" class="pri">Split off</button><button id="btn-spfront">Detach front line</button></div>`;
          }
          if (EF.M.some(q => q !== mi2 && q.o === mi2.o && !q.fight && EF.armyDist(q, mi2) <= 22)) {
            act += '<div class="row" style="margin-top:6px"><button id="btn-merge">Merge nearby armies</button></div>';
          }
          act += bombHTML(mi2, true);
        }
      }
    } else {
      side();
      if (p && G.ms.size) {
        const src = [p.id, ...G.ms].map(i => EF.P[i]);
        if (!G.tgt) act = `<div class="note"><b>${src.length} provinces selected</b><small>Drag from any selected province to destination.</small></div>`;
        else {
          const t = EF.P[G.tgt];
          act = `<div class="sec">Multi-march to <b>${t.n}</b></div><label class="row"><input type="checkbox" id="sync" ${G.sync ? 'checked' : ''}> Arrive at same time</label><div class="row"><button id="btn-mmode">Send: ${G.half ? 'half' : 'all but 1'}</button></div>`;
        }
      } else if (p) {
        const su = EF.stk(p, G.me);
        if (G.tgt) {
          const t = EF.P[G.tgt];
          act = `<div class="sec">March to <b>${t.n}</b></div><div class="route">${routeTxt(p, t, EF.tot(G.tr) ? G.tr : su)}</div><div class="deploy">${EF.T.map((tt, i) => su[i] > 0 ? `<div class="dr2"><img src="${EF.SU[i]}" width="26" height="19"><span>${tt[0]}</span><input type="number" data-tr="${i}" value="${G.tr[i]}" min="0" max="${su[i]}"><button data-tr="${i}" data-val="1">1</button><button data-tr="${i}" data-val="half">½</button><button data-tr="${i}" data-val="all">All</button></div>` : '').join('')}</div>`;
        } else {
          act = `<div class="mu">${EF.tot(su) ? 'Drag from this province to march anywhere. Ctrl/Shift-click adds provinces.' : 'No troops of yours here.'}</div>`;
          if (own) act += bombHTML(p, false);
        }
      } else act = '<div class="mu">Click a province to select it, then drag to march.</div>';
    }
    $('act-ui').innerHTML = act;
    if (G.tgt && G.tgt !== G.lastTgt) $('tab-prov').scrollTop = 0;
    G.lastTgt = G.tgt;
    dipUI(); mkUI(); spyUI(); abarUI();
  };

  function sbUI() {
    const G = EF.G, rows = EF.NS.map(o => ({ o, s: EF.stats(o) })).sort((x, y) => y.s.score - x.s.score).map(({ o, s }, i) => {
      const k = o === G.me || EF.R[G.me][o] === 'ally', st = EF.R[G.me][o];
      return `<tr style="${o === G.me ? 'font-weight:700;' : ''}${s.prov ? '' : 'opacity:.45'}"><td>${i + 1}</td><td>${EF.fi(o, 16)} ${EF.NATIONS[o][0]}${st === 'ally' || st === 'pact' || st === 'war' ? ` <span class="mu">(${st})</span>` : ''}</td><td>${s.prov}</td><td>${s.inc.toFixed(1)}</td><td>${s.ind}</td><td>${k ? s.a.map((x, j) => x ? `<img src="${EF.SU[j]}" width="18" height="13">${x}` : '').join(' ') : '~' + Math.round(EF.tot(s.a) / 5) * 5}</td><td>${k ? s.pow : '~' + Math.round(s.pow / 10) * 10}</td><td><b>${k ? s.score : '~' + Math.round(s.score / 10) * 10}</b></td></tr>`;
    }).join('');
    $('sbt').innerHTML = `<table><tr><th>#</th><th>Nation</th><th>Prov.</th><th>Gold/day</th><th>Infra</th><th>Troops</th><th>Power</th><th>Score</th></tr>${rows}</table>`;
  }

  EF.end = function (w, msg) {
    EF.G.over = 1; EF.sdel(EF.SK('auto'));
    $('abar').style.display = 'none'; $('fmenu').style.display = 'none';
    const r = EF.ranks().slice(0, 3).map((o, i) => `${i + 1}. ${EF.NATIONS[o][0]} (${EF.stats(o).score})`).join(' · ');
    $('ovc').innerHTML = `<h2>${w ? 'Victory' : 'Defeat'}</h2><p>${msg || ''}</p><p class="mu">Final ranking: ${r}</p><button onclick="EF.menu()">Play again</button>`;
    $('ov').style.display = 'flex';
  };

  EF.start = function (me) {
    try { const old = EF.sget(EF.SK('auto')); if (old) EF.sset(EF.SK('prev'), old); } catch (e) {}
    const mapId = $('maps') ? $('maps').value : 'europe1914';
    EF.buildMap(mapId);
    EF.M = []; EF.BT = []; EF.BOMBS = []; EF.LG = []; EF.FX.length = 0; EF.R = {};
    EF.m_id_seq = EF.bt_id = EF.spy_id = EF.ord_id = EF.news_id = 0;
    ecoKey = null; $('ecp').style.display = 'none';
    if (EF.clearRenderCaches) EF.clearRenderCaches();

    const almode = $('alms') ? $('alms').value : 'hist';
    const vc = $('vcs') ? $('vcs').value : 'maj';
    const df = $('dfs') ? +$('dfs').value : 1;

    if (almode === 'ffa') {
      Object.keys(EF.NATIONS).forEach(a => { EF.R[a] = {}; Object.keys(EF.NATIONS).forEach(b => (EF.R[a][b] = a === b ? '-' : 'peace')); });
    } else {
      const bl = o => ('UK FR RU'.includes(o) ? 1 : 'DE AH OT'.includes(o) ? 2 : 0);
      Object.keys(EF.NATIONS).forEach(a => { EF.R[a] = {}; Object.keys(EF.NATIONS).forEach(b => (EF.R[a][b] = a === b ? '-' : bl(a) && bl(a) === bl(b) ? 'ally' : bl(a) && bl(b) ? 'war' : 'peace')); });
    }
    EF.SD.forEach(p => { p.o = p.o0; });
    EF.rebuildMine();
    EF.SD.forEach(p => {
      p.walls = p.ind = p.inf = p.bar = p.port = p.aero = 0;
      p.autoFire = true; p.bt = null; p.cons = null; p.hit = 0; p.cd = 0;
      p.al = {}; p.st = 1; p.hp = 1; p.mo = 1; p.alq = {}; p.q = []; p.ap = Math.random() * 0.8;
      p.u = new Array(EF.U_LEN).fill(0);
      if (p.o0 !== 'SEA') p.u[0] = 5;
    });

    const G = (EF.G = EF.newG(me, vc, df, almode, mapId));
    Object.keys(EF.NATIONS).forEach(a => {
      G.rel[a] = {};
      Object.keys(EF.NATIONS).forEach(b => {
        if (a === b) G.rel[a][b] = 100;
        else if (almode === 'ffa') G.rel[a][b] = 0;
        else { const st = EF.R[a][b]; G.rel[a][b] = st === 'ally' ? 75 : st === 'pact' ? 40 : st === 'war' ? -60 : 0; }
      });
    });
    Object.keys(EF.NATIONS).forEach(o => {
      G.g[o] = o === 'NE' || o === 'SEA' ? 0 : 120;
      G.rs[o] = { s: 12, c: 12, o: 8, f: 60, w: 12 };
      G.at[o] = EF.DF[df].per * (1 + Math.random() * 1.5);
    });

    EF.addNews('war', 'August 1914: Europe Mobilizes!',
      almode === 'hist'
        ? 'The Entente (Britain, France, Russia) and Central Powers (Germany, Austria-Hungary, Ottomans) stand at war across the continent.'
        : 'All European Great Powers stand independent and unaligned in an uncertain balance of power.',
      EF.NS);

    resize(); centerView(); EF.calcVis(); EF.refreshEco();
    $('ov').style.display = 'none'; $('sb').style.display = 'none';
    EF.log(`You lead ${EF.NATIONS[me][0]}. Good luck.`);
    EF.ui(true);
  };

  EF.menu = function () {
    const VCD = {
      maj: 'Majority: your coalition (you + allies) holds 60% of all provinces.',
      dom: 'Domination: you alone hold 60% of all provinces.',
      tot: 'Total conquest: you alone hold every province.',
      sco: 'Endless / Sandbox: no victory condition or time limit.'
    };
    const rows = EF.SLOTS.map(n => [n, EF.slotInfo(n)]).filter(([, i]) => i && !i.bad).sort((a, b) => b[1].at - a[1].at);
    const saved = rows.length ? '<div class="gh" style="margin-top:0">Saved games</div>' + rows.map(([n, i], j) => `<div class="row" style="margin-bottom:6px"><button class="${j ? '' : 'pri'}" onclick="EF.loadSlot('${n}')" style="width:100%;justify-content:flex-start;padding:10px 14px">▶ ${EF.SLN[n]} · ${EF.NATIONS[i.me][0]} · ${EF.dayStr(i.t)}</button></div>`).join('') + '<div style="height:12px"></div>' : '';

    $('ovc').innerHTML = `<h2>Eurofront 1914 v12</h2>${saved}<p>Real-time grand strategy across Europe. Build Aerodromes, Railways, Ports &amp; Fortresses; deploy Armored Cars, Railguns &amp; U-Boats; run Espionage &amp; Stock Market Embargoes.</p>
    <div class="row" style="margin-bottom:8px">
      <label class="mu">Theater <select id="maps">${Object.values(EF.MAPS).map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select></label>
      <label class="mu">Diplomacy <select id="alms"><option value="hist" selected>Historical (1914 Coalitions)</option><option value="ffa">Free for All</option></select></label>
      <label class="mu">Victory <select id="vcs"><option value="maj">Majority (coalition)</option><option value="dom">Domination (alone)</option><option value="tot">Total conquest</option><option value="sco">Endless (Sandbox)</option></select></label>
      <label class="mu">AI <select id="dfs"><option value="0">Easy</option><option value="1" selected>Normal</option><option value="2">Hard</option><option value="3">Brutal</option></select></label>
    </div>
    <p id="vcd" style="font-size:13px"></p><div class="row">${EF.NS.map(o => `<button onclick="EF.start('${o}')">${EF.fi(o, 20)} ${EF.NATIONS[o][0]}</button>`).join('')}</div>`;
    const u = () => { $('vcd').textContent = VCD[$('vcs').value]; };
    $('vcs').onchange = u; u(); $('ov').style.display = 'flex';
  };

  EF.loadSlot = function (n) {
    const i = EF.slotInfo(n);
    if (!i || i.bad) { EF.log('That save cannot be loaded.'); return false; }
    try { EF.loadGame(i.d); return true; } catch (e) { EF.log('Could not load save.'); return false; }
  };

  EF.onGameLoaded = function () {
    resize(); centerView(); EF.calcVis(); EF.refreshEco();
    $('ov').style.display = 'none'; $('sb').style.display = 'none'; $('al').style.display = 'none'; $('gm').style.display = 'none';
    EF.G.sp = 0; EF.ui(true);
    EF.log(`Game loaded: ${EF.NATIONS[EF.G.me][0]}. Paused: press 1× to continue.`);
  };

  let GM = { arm: null, txt: '', mode: '', msg: '', prevSp: 0 };
  function gmUI() {
    const sl = EF.SLOTS.map(n => {
      const i = EF.slotInfo(n), cf = a => GM.arm === a + n;
      const info = !i ? '— empty —' : i.bad ? 'incompatible save' : `${EF.NATIONS[i.me][0]} · ${EF.dayStr(i.t)}`;
      let btn = '';
      if (n !== 'auto' && n !== 'prev') btn += `<button data-g="save" data-s="${n}" class="${cf('save') ? 'pri' : ''}">${cf('save') ? 'Overwrite?' : 'Save'}</button>`;
      if (i && !i.bad) btn += `<button data-g="load" data-s="${n}" class="${cf('load') ? 'pri' : ''}">${cf('load') ? 'Load?' : 'Load'}</button>`;
      if (i && n !== 'auto') btn += `<button data-g="del" data-s="${n}" class="${cf('del') ? 'danger' : ''}">${cf('del') ? 'Delete?' : '✕'}</button>`;
      return `<div class="sl"><div><b>${EF.SLN[n]}</b><small>${info}</small></div><div class="bb">${btn}</div></div>`;
    }).join('');
    const seg = (v, l) => `<button data-g="road" data-s="${v}" class="${EF.OPT.roads === v ? 'on' : ''}">${l}</button>`;
    $('gmt').innerHTML = `<div class="gh" style="margin-top:0">Save &amp; load</div>${sl}<div class="row" style="margin:8px 0 4px"><button data-g="exp">Export code</button><button data-g="imp">Import code</button></div>${GM.mode ? `<textarea id="gmta" ${GM.mode === 'exp' ? 'readonly' : ''} placeholder="Paste a save code here">${GM.txt}</textarea><div class="row" style="margin-top:6px">${GM.mode === 'exp' ? '<button data-g="copy">Copy</button>' : '<button data-g="impgo" class="pri">Load code</button>'}</div>` : ''}${GM.msg ? `<div class="mu" style="margin-top:8px">${GM.msg}</div>` : ''}<div class="gh">Roads</div><div class="seg" id="gseg">${seg('sub', 'Subtle')}${seg('hl', 'Selected')}${seg('all', 'Bright')}</div><div class="gh">Game</div><div class="row"><button data-g="help">How to play</button><button data-g="stats">Statistics</button><button data-g="quit" class="${GM.arm === 'quit' ? 'danger' : ''}">${GM.arm === 'quit' ? 'Quit?' : 'Main menu'}</button></div>`;
  }
  function gmOpen() { if (!EF.G) return; GM = { arm: null, txt: '', mode: '', msg: '', prevSp: EF.G.sp > 0 ? EF.G.sp : 0 }; if (GM.prevSp) EF.G.sp = 0; gmUI(); $('gm').style.display = 'flex'; }
  function gmClose() { $('gm').style.display = 'none'; if (GM.prevSp && EF.G && !EF.G.over && EF.G.sp === 0) EF.G.sp = GM.prevSp; GM.prevSp = 0; }
  function gmAct(a, n) {
    const arm = () => { if (GM.arm !== a + n) { GM.arm = a + n; GM.msg = ''; gmUI(); return false; } GM.arm = null; return true; };
    if (a === 'save') { if (!EF.G || EF.G.over) return; if (EF.slotInfo(n) && !arm()) return; EF.saveSlot(n); GM.msg = `Saved to ${EF.SLN[n]}.`; GM.arm = null; }
    else if (a === 'load') { if (!arm()) return; GM.prevSp = 0; EF.loadSlot(n); return; }
    else if (a === 'del') { if (!arm()) return; EF.sdel(EF.SK(n)); GM.msg = 'Deleted.'; }
    else if (a === 'exp') { GM.mode = 'exp'; GM.txt = ''; GM.msg = 'Preparing…'; gmUI(); EF.exportCode().then(t => { GM.txt = t; GM.msg = `${Math.max(1, Math.round(t.length / 1024))} KB`; gmUI(); }); return; }
    else if (a === 'imp') { GM.mode = 'imp'; GM.txt = ''; GM.msg = 'Paste code below.'; }
    else if (a === 'impgo') { const t = ($('gmta') && $('gmta').value) || GM.txt; GM.prevSp = 0; EF.importCode(t).catch(() => { GM.msg = 'Invalid code.'; gmUI(); }); return; }
    else if (a === 'copy') { navigator.clipboard && navigator.clipboard.writeText(GM.txt).then(() => { GM.msg = 'Copied!'; gmUI(); }); return; }
    else if (a === 'road') { EF.OPT.roads = n; EF.sset(EF.SK('opt'), JSON.stringify(EF.OPT)); if (EF.G) EF.G.dirty = 1; }
    else if (a === 'help') { gmClose(); $('hp').style.display = 'flex'; return; }
    else if (a === 'stats') { gmClose(); sbUI(); $('sb').style.display = 'flex'; return; }
    else if (a === 'quit') { if (!arm()) return; EF.saveSlot('auto'); EF.G.over = 1; GM.prevSp = 0; $('gm').style.display = 'none'; $('abar').style.display = 'none'; $('fmenu').style.display = 'none'; EF.menu(); return; }
    gmUI();
  }

  function initDOM() {
    cv = EF.cv = $('cv'); cx = EF.cx = cv.getContext('2d');
    addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(() => { fitTop(); resize(); }).observe($('top'));

    // Static UI templates
    $('rcb').innerHTML = EF.T.map((t, k) => `<button class="rb" data-r="${k}" title="${EF.DESC[k]}"><span class="t"><img src="${EF.SU[k]}" width="26" height="18">${t[0]}${t[5] ? `<small style="display:inline;margin-left:2px">Ind ${t[5]}</small>` : ''}</span><small>${EF.DESC[k]}</small><span class="cost">${EF.cs(k)} <span>⏱ ${Math.ceil(EF.TT[k] / EF.DAY_T)}d</span></span></button>`).join('');
    $('lg').innerHTML = EF.T.map((t, i) => `<span><img src="${EF.SU[i]}" width="20" height="14"> ${t[0]}</span>`).join('') + EF.RK.map(r => `<span>${EF.ri(r, 14)} ${EF.RNm[r]}</span>`).join('');
    $('mk').innerHTML = EF.RK.map(r => `<div class="mr"><span>${EF.ri(r, 18)}</span><b>${EF.RNm[r]}</b><span class="mu" id="ms-${r}"></span><span class="pc"><b id="mp-${r}"></b><svg id="sk-${r}" width="44" height="14" viewBox="0 0 44 14" style="color:var(--ac)"></svg></span><button data-mk="${r}" data-d="1" id="mb-${r}">Buy</button><button data-mk="${r}" data-d="-1" id="mc-${r}">Sell</button></div>`).join('');
    $('hpt').innerHTML = `<h4>Controls &amp; Waypoints</h4><ul><li><b>March:</b> Drag from any province or army to any destination or link dot. Hold <b>Shift</b> (or tap <b>⚑</b>) while dragging/clicking to chain <b>Waypoints</b>.</li><li><b>Forced March (⚡):</b> +50% speed at daily HP/morale cost.</li><li><b>Map Modes:</b> Switch between Political, Morale, Diplomacy, and Resources in the bottom-left toolbar.</li></ul><h4>WWI Units &amp; Buildings</h4><ul><li><b>Armored Car:</b> Fast scout &amp; anti-air defense; calms unrest.</li><li><b>Railgun:</b> 240 px siege gun; moves only on Railways (Infra Lv 2) with Coal.</li><li><b>Aerodrome:</b> Required for Airplanes to strike (190 px) &amp; fly between bases.</li><li><b>Submarine:</b> Stealthed at sea unless spotted by Airplanes or fighting; lethal vs. Battleships &amp; Convoys.</li></ul><h4>Economy, Embargoes &amp; Espionage</h4><ul><li>Running out of <b>Food, Oil, Coal, Steel, Wood, or Gold</b> inflicts real penalties.</li><li>Use the <b>Stock Market</b> Order Board, impose <b>Trade Embargoes</b>, deploy <b>Spies</b>, and read <b>The Daily European</b>.</li></ul>`;

    // Canvas pointer interactions
    cv.addEventListener('wheel', e => { if (!EF.G) return; e.preventDefault(); const [sx, sy] = toW(e); zoomAt(sx, sy, e.deltaY < 0 ? 1.18 : 1 / 1.18); }, { passive: false });
    cv.addEventListener('pointerdown', e => {
      const G = EF.G; if (!G || G.over) return;
      cv.setPointerCapture(e.pointerId); PT.set(e.pointerId, [e.clientX, e.clientY]);
      const [, , wx, wy] = toW(e);
      EF.gest = { moved: 0, pan: 0, from: null, fromA: null, pd: 0, add: e.shiftKey || e.ctrlKey || e.metaKey, wp: e.shiftKey || wpMode };
      if (PT.size > 1) { EF.gest.pan = 2; return; }
      const a = pickArmy(wx, wy, true); if (a) { EF.gest.fromA = a; return; }
      const h = EF.hitAt(wx, wy); if (h && EF.tot(EF.stk(h, G.me)) > 0) EF.gest.from = h; else EF.gest.pan = 1;
    });
    cv.addEventListener('pointermove', e => {
      const G = EF.G; if (!G) return;
      const [, , wx, wy] = toW(e);
      if (!EF.gest) {
        const ha = pickArmy(wx, wy, false); EF.hoverArmy = ha ? ha.id : null;
        const hp = EF.hitAt(wx, wy); EF.hoverProv = hp ? hp.id : null;
        return;
      }
      if (!PT.has(e.pointerId)) return;
      const old = PT.get(e.pointerId); PT.set(e.pointerId, [e.clientX, e.clientY]);
      const r = cv.getBoundingClientRect();
      if (PT.size === 2) {
        const [a, b] = [...PT.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (EF.gest.pd) zoomAt((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, d / EF.gest.pd);
        EF.gest.pd = d; return;
      }
      const dx = e.clientX - old[0], dy = e.clientY - old[1];
      EF.gest.moved += Math.abs(dx) + Math.abs(dy);
      if (EF.gest.pan === 1 && EF.gest.moved > 4) { G.vx -= dx / EF.kk(); G.vy -= dy / EF.kk(); clampV(); }
      EF.gest.cx = wx; EF.gest.cy = wy;
    });
    cv.addEventListener('pointercancel', e => { PT.delete(e.pointerId); EF.gest = null; });
    cv.addEventListener('pointerup', e => {
      PT.delete(e.pointerId); const g = EF.gest, G = EF.G;
      if (!G || G.over || !g) return;
      if (PT.size || g.pan === 2) { if (!PT.size) EF.gest = null; return; }
      EF.gest = null;
      const [, , wx, wy] = toW(e), hit = EF.hitAt(wx, wy); G.dirty = 1;
      if (g.moved < 6) {
        const tk = tickAt(wx, wy);
        if (tk) {
          const t = EF.mkDest(tk), am = G.sel_m ? EF.M.find(m => m.id === G.sel_m && m.o === G.me) : null;
          if (am) EF.orderArmy(am, t, g.wp); else setTgt(t);
          showTab('prov'); EF.ui(true); return;
        }
        const cm = pickArmyCycle(wx, wy);
        if (cm) {
          if ((g.add || G.mm) && cm.o === G.me && G.sel_m && G.sel_m !== cm.id) {
            if (G.ma.has(cm.id)) G.ma.delete(cm.id); else G.ma.add(cm.id);
          } else {
            G.sel = null; G.tgt = null; G.ms.clear(); G.tr.fill(0);
            G.sel_m = cm.id; G.ma.clear(); G.tgtA = null; G.spl.fill(0);
          }
        } else if (!hit) {
          G.sel = G.tgt = G.sel_m = null; G.ms.clear(); G.ma.clear(); G.tgtA = null; G.tr.fill(0);
        } else if ((g.add || G.mm) && EF.tot(EF.stk(hit, G.me)) > 0) {
          G.sel_m = null; G.tgt = null;
          if (!G.sel) G.sel = hit.id;
          else if (hit.id === G.sel) { G.sel = G.ms.size ? [...G.ms][0] : null; G.ms.delete(G.sel); }
          else if (G.ms.has(hit.id)) G.ms.delete(hit.id); else G.ms.add(hit.id);
        } else if (hit.id === G.sel) { G.tgt = null; G.ms.clear(); G.tr.fill(0); }
        else { G.sel = hit.id; G.ms.clear(); G.ma.clear(); G.tgtA = null; G.tgt = null; G.tr.fill(0); G.sel_m = null; }
      } else if (g.fromA) {
        const ed = EF.edgeAt(wx, wy), t = ed ? EF.mkDest(ed) : hit;
        if (t) {
          G.sel = null; G.tgt = null; G.ms.clear();
          const multi = G.ma.size > 0 && (G.sel_m === g.fromA.id || G.ma.has(g.fromA.id));
          if (multi) G.tgtA = t.edge ? { edge: { ...t.edge }, x: t.x, y: t.y } : { id: t.id };
          else { G.ma.clear(); G.tgtA = null; EF.orderArmy(g.fromA, t, g.wp); G.sel_m = g.fromA.id; }
        }
      } else if (g.from) {
        const ed = EF.edgeAt(wx, wy), t = ed ? EF.mkDest(ed) : (hit !== g.from ? hit : null);
        if (t) {
          if (G.sel !== g.from.id && !G.ms.has(g.from.id)) { G.sel = g.from.id; G.ms.clear(); }
          G.sel_m = null; setTgt(t);
        }
      }
      if (G.sel || G.sel_m) showTab('prov');
      EF.ui(true);
    });

    // Modal-safe global hotkeys
    addEventListener('keydown', e => {
      const G = EF.G; if (!G || G.alOn) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        const openModals = ['np', 'gm', 'sb', 'hp'].filter(id => $(id).style.display === 'flex');
        if (openModals.length) { openModals.forEach(id => ($(id).style.display = 'none')); return; }
        G.sel = null; G.tgt = null; G.sel_m = null; G.ms.clear(); G.ma.clear(); G.tgtA = null; G.tr.fill(0); G.dirty = 1; EF.ui(true);
        return;
      }
      if (['np', 'gm', 'sb', 'hp'].some(id => $(id).style.display === 'flex')) return;
      if (e.code === 'Space') { e.preventDefault(); G.sp = G.sp ? 0 : 1; EF.ui(true); }
      if (['[', ']', '+', '=', '-'].includes(e.key)) {
        const SPS = [0, 1, 2, 4, 8, 16, 32]; let i = SPS.indexOf(G.sp); if (i < 0) i = 1;
        i = Math.max(0, Math.min(6, i + ((e.key === '[' || e.key === '-') ? -1 : 1)));
        G.sp = SPS[i]; EF.ui(true);
      }
    });

    // Toolbar, Map Modes, Modals
    $('sp').onclick = e => { const s = e.target.dataset.s; if (EF.G && s != null) { EF.G.sp = +s; EF.ui(true); } };
    $('zb').onclick = e => {
      const b = e.target.closest('button'), z = b && b.dataset.z; if (!EF.G || z == null) return;
      if (z === 'm') { EF.G.mm = !EF.G.mm; $('mmb').classList.toggle('on', EF.G.mm); return; }
      if (z === 'wp') { wpMode = !wpMode; $('wpb').classList.toggle('on', wpMode); return; }
      if (+z === 0) { EF.G.z = 1; centerView(); } else zoomAt(innerWidth / 2, innerHeight / 2, +z);
    };
    $('mmode').onclick = e => {
      const b = e.target.closest('button'); if (!b || !EF.G || !b.dataset.mm) return;
      EF.G.mapMode = b.dataset.mm; EF.G.dirty = 1; EF.ui(true);
    };
    $('bsb').onclick = () => { if (!EF.G) return; sbUI(); $('sb').style.display = 'flex'; };
    $('sbx').onclick = () => { $('sb').style.display = 'none'; };
    $('bnp').onclick = () => { if (!EF.G) return; newsUI(); $('np').style.display = 'flex'; EF.ui(true); };
    $('npx').onclick = () => { $('np').style.display = 'none'; };
    $('np-cat').onchange = newsUI;
    $('np-post').onclick = () => {
      const G = EF.G; if (!G) return;
      const ok = EF.publishCommunique(G.me, $('np-title').value, $('np-body').value, $('np-anon').checked, $('np-tgt').value);
      if (ok) { $('np-title').value = ''; $('np-body').value = ''; newsUI(); }
    };
    ['sb', 'hp', 'np', 'gm'].forEach(id => $(id).addEventListener('click', e => { if (e.target === $(id)) $(id).style.display = 'none'; }));
    $('hpb').onclick = () => { $('hp').style.display = 'flex'; };
    $('hpx').onclick = () => { $('hp').style.display = 'none'; };
    $('gmb').onclick = gmOpen; $('gmx').onclick = gmClose;
    $('gmt').onclick = e => { const b = e.target.closest('[data-g]'); if (b) gmAct(b.dataset.g, b.dataset.s); };
    $('grab').onclick = () => { document.body.classList.toggle('tall'); resize(); };
    $('al').onclick = e => { const b = e.target.closest('button'); if (!b || !EF.G) return; if (b.id === 'al-go') closeAlert(1); else if (b.id === 'al-ok') closeAlert(0); };
    $('ofr').onclick = e => {
      const b = e.target.closest('button'); if (!b || !EF.G) return;
      const i = +b.dataset.i, of = EF.G.offers[i];
      if (of) {
        if (b.dataset.a === 'accept') {
          EF.set(EF.G.me, of.from, of.type);
          EF.modRel(EF.G.me, of.from, of.type === 'ally' ? 40 : 20);
          EF.log(`You accepted ${EF.NATIONS[of.from][0]}'s proposal.`);
        }
        EF.G.offers.splice(i, 1); EF.G.dh = ''; dipUI();
      }
    };

    // Market events
    $('mk').onclick = e => { const b = e.target.closest('button'); if (!b || !EF.G || EF.G.over) return; EF.trade(EF.G.me, b.dataset.mk, +b.dataset.d * (+$('mq').value)); mkUI(); side(); };
    $('mq').onchange = mkUI;
    $('mk-post-btn').onclick = () => {
      const G = EF.G; if (!G || G.over) return;
      const ok = EF.postOrder(G.me, $('mk-ord-r').value, $('mk-ord-side').value, +$('mk-ord-qty').value, +$('mk-ord-px').value);
      EF.log(ok ? 'Market order posted.' : 'Cannot post order (insufficient funds/resources or limit reached).');
      EF.ui(true);
    };
    $('mk-orders').onclick = e => {
      const b = e.target.closest('button'); if (!b || !EF.G || EF.G.over) return;
      if (b.dataset.ordFill) { if (!EF.fillOrder(EF.G.me, +b.dataset.ordFill)) EF.log('Insufficient gold/resources.'); EF.ui(true); }
      else if (b.dataset.ordCancel) { EF.cancelOrder(EF.G.me, +b.dataset.ordCancel); EF.ui(true); }
    };

    // Espionage events
    $('spy-pnl').onclick = e => {
      const b = e.target.closest('button'); if (!b || !EF.G || EF.G.over) return;
      if (b.dataset.spyHire) { EF.hireSpy(EF.G.me, b.dataset.pid, b.dataset.spyHire); EF.ui(true); }
      else if (b.dataset.spyDel) { EF.dismissSpy(EF.G.me, +b.dataset.spyDel); EF.ui(true); }
    };

    // Sidebar & Action Bar unified delegation
    $('act-ui').addEventListener('change', e => { if (e.target.id === 'sync') EF.G.sync = e.target.checked; });
    $('act-ui').addEventListener('input', e => {
      const G = EF.G; if (!G) return;
      if (e.target.tagName === 'INPUT' && e.target.dataset.tr != null) {
        const idx = +e.target.dataset.tr, p = EF.P[G.sel];
        if (p) G.tr[idx] = Math.max(0, Math.min(EF.stk(p, G.me)[idx], parseInt(e.target.value) || 0));
      } else if (e.target.tagName === 'INPUT' && e.target.dataset.sp != null) {
        const i = +e.target.dataset.sp, a = EF.M.find(x => x.id === G.sel_m);
        if (a) G.spl[i] = Math.max(0, Math.min(a.u[i], parseInt(e.target.value) || 0));
      }
    });

    $('as').onclick = e => {
      const G = EF.G, btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.tab) { showTab(btn.dataset.tab); return; }
      if (!G || G.over) return;
      const id = (btn.id || '').replace(/^bar-/, '');

      if (btn.dataset.fire) { const sh = G.sel_m ? EF.M.find(x => x.id === G.sel_m) : EF.P[G.sel], v = btn.dataset.fire; if (sh && sh.o === G.me) { sh.bt = { k: v[0], id: v.slice(2) }; EF.log('Fire support locked.'); } G.fmOpen = false; EF.ui(true); return; }
      if (id === 'btn-fire-menu') { G.fmOpen = !G.fmOpen; EF.ui(true); return; }
      if (id === 'btn-cancel') { G.tgt = null; G.tgtA = null; G.tr.fill(0); G.fmOpen = false; EF.ui(true); return; }
      if (btn.dataset.qc != null && G.sel) { EF.cancelQ(G.me, EF.P[G.sel], +btn.dataset.qc); EF.ui(true); return; }
      if (btn.dataset.spv != null) { const i = +btn.dataset.sp, m = EF.M.find(x => x.id === G.sel_m); if (m) { const c = m.u[i]; G.spl[i] = btn.dataset.spv === 'all' ? c : btn.dataset.spv === 'half' ? c >> 1 : Math.min(1, c); EF.ui(true); } return; }
      if (id === 'btn-split') { const m = EF.M.find(x => x.id === G.sel_m); if (m && m.o === G.me) { const n = EF.splitArmy(m, G.spl); if (n) { G.sel_m = n.id; G.spl.fill(0); } } EF.ui(true); return; }
      if (id === 'btn-spfront') { const m = EF.M.find(x => x.id === G.sel_m); if (m && m.o === G.me) { const n = EF.splitArmy(m, m.u.map((x, j) => (j === 3 || j === 6 || j === 9 ? 0 : x))); if (n) G.sel_m = n.id; } EF.ui(true); return; }
      if (id === 'btn-merge') { const m = EF.M.find(x => x.id === G.sel_m); if (m && m.o === G.me) EF.mergeNear(m, 22); EF.ui(true); return; }
      if (id === 'btn-mmerge') { const m = EF.M.find(x => x.id === G.sel_m); if (m) { [...G.ma].forEach(i => { const q = EF.M.find(x => x.id === i); if (q && !q.fight && !m.fight && EF.armyDist(q, m) <= 26) EF.mergeInto(m, q); }); G.tgtA = null; } EF.ui(true); return; }
      if (id === 'btn-mamove' && G.tgtA) { const t = G.tgtA.edge ? EF.mkDest({ ...G.tgtA.edge, x: G.tgtA.x, y: G.tgtA.y }) : EF.P[G.tgtA.id]; multiArmyMove([G.sel_m, ...G.ma].map(i => EF.M.find(x => x.id === i)).filter(Boolean), t, G.sync); G.tgtA = null; G.ma.clear(); EF.ui(true); return; }
      if (id === 'up-rest' && G.sel) { EF.restore(G.me, EF.P[G.sel]); EF.ui(true); return; }
      if (btn.dataset.val != null) { const idx = +btn.dataset.tr, p = EF.P[G.sel]; G.tr[idx] = btn.dataset.val === 'all' ? EF.stk(p, G.me)[idx] : btn.dataset.val === 'half' ? Math.floor(EF.stk(p, G.me)[idx] / 2) : Math.min(1, EF.stk(p, G.me)[idx]); EF.ui(true); return; }
      if (id === 'btn-mmode') { G.half = !G.half; EF.ui(true); return; }
      if (id === 'btn-msend' && G.sel && G.tgt) { multiSend(G.me, [G.sel, ...G.ms].map(i => EF.P[i]).filter(q => q.id !== G.tgt), EF.P[G.tgt], G.half, G.sync); G.tgt = null; G.ms.clear(); G.dirty = 1; EF.ui(true); return; }
      if (id === 'btn-send-exact' && G.sel && G.tgt) {
        if (!EF.tot(G.tr)) { EF.log('Select troops first.'); return; }
        const s = EF.P[G.sel], t = EF.P[G.tgt], rt = EF.route(s, t, G.tr, G.me);
        if (!rt) { EF.log('No valid route.'); return; }
        EF.dispatch(s, [...G.tr], G.me, rt); G.tr.fill(0); G.tgt = null; G.dirty = 1; EF.ui(true); return;
      }
      if (id === 'btn-bomb') { const sh = G.sel_m ? EF.M.find(x => x.id === G.sel_m) : EF.P[G.sel], v = $('bm-tgt') && $('bm-tgt').value; if (sh && sh.o === G.me && v) sh.bt = { k: v[0], id: v.slice(2) }; EF.ui(true); return; }
      if (id === 'btn-cease') { const sh = G.sel_m ? EF.M.find(x => x.id === G.sel_m) : EF.P[G.sel]; if (sh) sh.bt = null; EF.ui(true); return; }

      if (btn.dataset.army != null && G.sel_m) {
        const m = EF.M.find(x => x.id === G.sel_m);
        if (m && m.o === G.me) {
          const act = btn.dataset.army;
          if (act === 'halt') m.halted = true;
          else if (act === 'resume') m.halted = false;
          else if (act === 'forced') m.forced = !m.forced;
          else if (act === 'clearwp') m.waypoints = [];
          else if (act === 'rev') {
            [m.f, m.t] = [m.t, m.f]; m.k = 1 - m.k; m.halted = false;
            m.path = []; m.waypoints = []; m.stop = null; m.kmax = 1;
            delete m.embark; m.coastK = null; m.embState = null;
          }
          EF.ui(true); return;
        }
      }
      if (id === 'btn-autofire' && G.sel) { const p = EF.P[G.sel]; if (p && p.o === G.me) p.autoFire = p.autoFire === false; EF.ui(true); return; }
      if (id === 'btn-m-autofire' && G.sel_m) { const m = EF.M.find(x => x.id === G.sel_m); if (m && m.o === G.me) m.autoFire = m.autoFire === false; EF.ui(true); return; }
      if (['up-wall', 'up-ind', 'up-inf', 'up-bar', 'up-port', 'up-aero'].includes(id)) { if (G.sel && EF.startCons(G.me, EF.P[G.sel], id.slice(3))) EF.ui(true); return; }
      if (btn.parentElement && btn.parentElement.id === 'rcb' && G.sel) { if (EF.queueU(G.me, EF.P[G.sel], +btn.dataset.r)) { G.dirty = 1; EF.ui(true); } return; }

      if (btn.parentElement && btn.parentElement.classList.contains('bs')) {
        const o = btn.dataset.o, a = btn.dataset.a, me = G.me;
        if (a === 'accept' || a === 'decline') {
          const of = G.offers[+btn.dataset.i];
          if (of) { if (a === 'accept') { EF.set(me, of.from, of.type); EF.modRel(me, of.from, of.type === 'ally' ? 40 : 20); } G.offers.splice(+btn.dataset.i, 1); G.dh = ''; }
          EF.ui(true); return;
        }
        if (a === 'war') { EF.war(me, o); EF.modRel(me, o, -60); return; }
        if (a === 'break') { EF.set(me, o, 'peace'); EF.modRel(me, o, -30); return; }
        if (a === 'embargo') { G.embargoes[me] = G.embargoes[me] || {}; G.embargoes[me][o] = true; EF.modRel(me, o, -15); G.dh = ''; EF.log(`Trade embargo imposed on ${EF.NATIONS[o][0]}.`); EF.ui(true); return; }
        if (a === 'unembargo') { if (G.embargoes[me]) delete G.embargoes[me][o]; G.dh = ''; EF.log(`Trade embargo lifted on ${EF.NATIONS[o][0]}.`); EF.ui(true); return; }
        if (a === 'denounce') { G.denounced[o] = true; G.cd[o] = G.t + 30; EF.modRel(me, o, -25); G.dh = ''; return; }
        if (a === 'retract') { delete G.denounced[o]; EF.modRel(me, o, 15); G.dh = ''; return; }
        if (a === 'aid') {
          if (G.aidCd[o] > G.t) { EF.log('Wait before sending more aid.'); return; }
          if (G.g[me] < 40) { EF.log('Not enough gold.'); return; }
          G.g[me] -= 40; G.g[o] += 40; G.aidCd[o] = G.t + 25; EF.modRel(me, o, 25); G.dh = ''; return;
        }
        if (a === 'call') {
          const enemies = EF.NS.filter(e => EF.R[me][e] === 'war' && EF.R[o][e] !== 'war' && EF.mine(e).length);
          enemies.forEach(e => EF.set(o, e, 'war')); EF.modRel(me, o, 15); G.dh = ''; return;
        }
        if (a === 'reclaim' || a === 'demand') {
          if (G.cd[o] > G.t) { EF.log(`${EF.NATIONS[o][0]} won't discuss territory yet.`); return; }
          if (EF.R[me][o] === 'war') { EF.log('Cannot demand territory while at war.'); return; }
          const pid = btn.dataset.pid, prov = EF.P[pid];
          if (!prov || prov.o !== o || prov.cap) return;
          G.cd[o] = G.t + 35;
          if (EF.R[me][o] === 'ally' || EF.natpow(o) < EF.natpow(me) * (0.45 + Math.max(0, EF.getRel(me, o)) / 200)) {
            const oldU = prov.u.slice(); prov.u = new Array(EF.U_LEN).fill(0);
            const fallback = EF.mine(o).filter(x => x !== prov)[0];
            if (fallback) EF.addTo(fallback, o, oldU, prov.hp, prov.mo);
            prov.q = []; prov.cons = null;
            EF.setProvOwner(prov, me); prov.st = 0.5; G.dirty = 1;
            EF.modRel(me, o, -15);
            EF.log(`${EF.NATIONS[o][0]} ceded ${prov.n} (garrison evacuated).`);
          } else {
            EF.modRel(me, o, -30);
            EF.log(`${EF.NATIONS[o][0]} rejected your claim on ${prov.n}!`);
          }
          G.dh = ''; EF.ui(true); return;
        }
        if (G.cd[o] > G.t) { EF.log(`${EF.NATIONS[o][0]} won't talk yet.`); return; }
        G.cd[o] = G.t + 40;
        const sh = EF.NS.some(c => c !== me && c !== o && EF.R[me][c] === 'war' && EF.R[o][c] === 'war');
        const rel = EF.getRel(me, o), relMod = (rel + 60) / 160;
        const ok = a === 'peace' ? Math.random() < Math.min(0.95, Math.max(0.1, (0.2 + 0.5 * EF.natpow(me) / EF.natpow(o)) * relMod)) : a === 'pact' ? (rel >= -25 && (sh || Math.random() < (0.4 + 0.4 * relMod))) : (rel >= 20 && (sh || Math.random() < (0.15 + 0.35 * relMod)));
        if (ok) { EF.set(me, o, a); EF.modRel(me, o, a === 'ally' ? 40 : 20); }
        else EF.modRel(me, o, -10);
        EF.ui(true);
      }
    };

    $('abar').onclick = $('as').onclick;
    $('fmenu').onclick = $('as').onclick;
    $('top').addEventListener('mouseover', e => { const c = e.target.closest('.rc'); if (c && c.dataset.r) showEco(c); });
    $('top').addEventListener('mouseout', e => { const c = e.target.closest('.rc'); if (c && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.rc'))) hideEco(); });
    $('top').addEventListener('click', e => { const c = e.target.closest('.rc'); if (c && c.dataset.r) { if (ecoKey === c.dataset.r && $('ecp').style.display === 'block') hideEco(); else showEco(c); } });
    const togglePanel = () => { document.body.classList.toggle('pmin'); resize(); EF.ui(true); };
    $('pmin').onclick = togglePanel; $('pexp').onclick = togglePanel;
    addEventListener('pagehide', EF.saveNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) EF.saveNow(); });
    if (window.matchMedia) {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', EF.invalidateSea);
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (EF.G) { EF.tick(dt); EF.draw(); EF.ui(false); }
    requestAnimationFrame(loop);
  }

  window.addEventListener('DOMContentLoaded', () => {
    initDOM();
    resize();
    EF.buildMap('europe1914');
    EF.menu();
    requestAnimationFrame(loop);
  });
})();
