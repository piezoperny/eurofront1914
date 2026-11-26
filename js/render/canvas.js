(function () {
  const EF = (window.EF = window.EF || {});

  const hx = s => [1, 3, 5].map(i => parseInt(s.substr(i, 2), 16));
  const C = {};
  Object.keys(EF.NATIONS).forEach(o => (C[o] = hx(EF.NATIONS[o][1])));

  const bkS = document.createElement('canvas');
  const bkR = document.createElement('canvas');
  let ST = [], STATIC = 0, SEAOK = 0, HLC = {}, IMG = null, MCX = null, RELIEF = null;
  let SEAC = ['#12283b', '#0b1a29'];
  let _seaGrad = null, _lastGy = null, _lastHk = null, _lastSeaC = null;
  let _clsCache = null, _clsCacheK = 0, _clsCacheT = -1;

  EF.clearRenderCaches = function () {
    ST = []; STATIC = 0; HLC = {}; RELIEF = null;
    _clsCache = null; _seaGrad = null;
  };
  EF.invalidateSea = () => { SEAOK = 0; };

  EF.fxAdd = function (t, x, y, c) {
    if (EF.FX.length > 140) EF.FX.shift();
    EF.FX.push({ t, x, y, c: c || '#fff', s: performance.now(), r: Math.random() * 6.28 });
  };
  const FXD = { muzzle: 380, boom: 1500, clash: 1700, capture: 1600, water: 950 };

  function relief() {
    if (RELIEF) return RELIEF;
    let sd = 12345;
    const rn = () => { sd = (sd * 1664525 + 1013904223) % 4294967296; return sd / 4294967296; };
    RELIEF = [];
    const map = EF.CUR_MAP;
    (map.MTN || []).forEach(r => {
      const n = r[r.length - 1], pts = r.slice(0, -1).map(([lo, la]) => EF.px(lo, la)), segs = [];
      let tot2 = 0;
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        segs.push(l); tot2 += l;
      }
      for (let k = 0; k < n; k++) {
        let d = rn() * tot2, i = 0;
        while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
        const t = d / (segs[i] || 1);
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t + (rn() - 0.5) * 14;
        const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t + (rn() - 0.5) * 14;
        if (x >= 0 && y >= 0 && x < EF.W && y < EF.H && EF.L[(y | 0) * EF.W + (x | 0)] >= 0) {
          RELIEF.push({ x, y, s: 0.8 + rn() * 0.7 });
        }
      }
    });
    return RELIEF;
  }

  function modeColor(p) {
    const G = EF.G, mode = G.mapMode || 'pol';
    if (mode === 'pol') return C[p.o];
    if (mode === 'mor') {
      if (p.o === 'NE') return [150, 155, 145];
      const s = p.st == null ? 1 : p.st;
      if (s >= 0.6) {
        const t = (s - 0.6) / 0.4;
        return [Math.round(234 - 180 * t), Math.round(179 + 18 * t), Math.round(40 + 54 * t)];
      }
      const t = s / 0.6;
      return [Math.round(220 + 14 * t), Math.round(38 + 141 * t), Math.round(38 + 2 * t)];
    }
    if (mode === 'dip') {
      if (p.o === G.me) return [59, 130, 246];
      if (p.o === 'NE') return [148, 163, 184];
      const r = EF.R[G.me] ? EF.R[G.me][p.o] : 'peace';
      if (r === 'ally') return [34, 197, 94];
      if (r === 'pact') return [234, 179, 8];
      if (r === 'war') return [239, 68, 68];
      if (EF.isEmbargoed(G.me, p.o)) return [249, 115, 22];
      return [148, 163, 184];
    }
    if (mode === 'res') {
      const base = hx(EF.RCl[p.r] || '#94a3b8');
      return p.v > 1 ? base : base.map(v => Math.round(v * 0.62 + 50));
    }
    return C[p.o];
  }

  const SAND = [226, 201, 140], SNOW = [238, 243, 247], SC2 = 2;
  function paintProv(k) {
    const G = EF.G, p = EF.SD[k], c = modeColor(p), pix = EF.PIX[k], d = IMG.data;
    const dk = G.vis.has(p.id) ? 1 : 0.72;
    const W = EF.W, H = EF.H, L = EF.L, NZ = EF.NZ, TS = EF.TS, TN = EF.TN;
    const unrestStripe = G.mapMode === 'mor' && p.st < 0.35;

    for (let n = 0; n < pix.length; n++) {
      const i = pix[n], x = i % W, y = (i / W) | 0;
      let f = 1 + 0.05 * NZ[i];
      const r = x < W - 1 ? L[i + 1] : -1, b = y < H - 1 ? L[i + W] : -1;
      const l = x ? L[i - 1] : -1, u = y ? L[i - W] : -1;
      if (r < 0 || b < 0 || l < 0 || u < 0) f *= 0.65;
      if (unrestStripe && ((x + y) % 8 < 3)) f *= 0.72;
      f *= dk;
      const sa = TS[i] / 255, sn2 = TN[i] / 255;
      let R_ = c[0] * f, G_ = c[1] * f, B_ = c[2] * f;
      if (sa) { R_ += (SAND[0] * f - R_) * sa; G_ += (SAND[1] * f - G_) * sa; B_ += (SAND[2] * f - B_) * sa; }
      if (sn2) { R_ += (SNOW[0] * f - R_) * sn2; G_ += (SNOW[1] * f - G_) * sn2; B_ += (SNOW[2] * f - B_) * sn2; }
      const o = i * 4;
      d[o] = R_; d[o + 1] = G_; d[o + 2] = B_; d[o + 3] = 255;
    }
  }

  function updateLand() {
    const G = EF.G, dirty = new Set();
    const mode = G.mapMode || 'pol';
    EF.SD.forEach((p, k) => {
      if (p.o0 === 'SEA') return;
      const sig = mode + ':' + p.o + ':' + (G.vis.has(p.id) ? '1' : '0') + ':' + (mode === 'mor' ? Math.round((p.st || 1) * 20) : '');
      if (ST[k] !== sig) {
        ST[k] = sig;
        dirty.add(k);
        p.adj.forEach(id => { const q = EF.P[id]; if (q && q.o0 !== 'SEA') dirty.add(q.k); });
      }
    });
    if (!dirty.size) return;
    let x0 = EF.W, y0 = EF.H, x1 = 0, y1 = 0;
    dirty.forEach(k => {
      paintProv(k);
      const b = EF.BB[k];
      if (!b) return;
      x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
    });
    MCX.putImageData(IMG, 0, 0, x0, y0, Math.max(1, x1 - x0 + 1), Math.max(1, y1 - y0 + 1));
  }

  function buildStatic() {
    const W = EF.W, H = EF.H, BW = W * SC2, BH = H * SC2;
    MCX = EF.mc.getContext('2d');
    IMG = MCX.createImageData(W, H);
    bkS.width = BW; bkS.height = BH; bkR.width = BW; bkR.height = BH;

    const g = bkS.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(EF.shc, 0, 0, BW, BH);
    g.drawImage(EF.sbc, 0, 0, BW, BH);
    const sil = document.createElement('canvas');
    sil.width = W; sil.height = H;
    const sg = sil.getContext('2d'), si = sg.createImageData(W, H);
    for (let i = 0; i < W * H; i++) if (EF.L[i] >= 0) si.data[i * 4 + 3] = 255;
    sg.putImageData(si, 0, 0);
    g.shadowColor = 'rgba(0,10,25,.42)'; g.shadowBlur = 10;
    g.drawImage(sil, 0, 0, BW, BH); g.shadowBlur = 0;

    // Mountains + Major European Rivers
    const r = bkR.getContext('2d');
    r.scale(BW / W, BH / H);
    if (EF.CUR_MAP && EF.CUR_MAP.RIVERS) {
      r.strokeStyle = 'rgba(72, 138, 188, 0.55)';
      r.lineWidth = 1.6;
      r.lineCap = 'round'; r.lineJoin = 'round';
      EF.CUR_MAP.RIVERS.forEach(rv => {
        r.beginPath();
        rv.forEach(([lo, la], idx) => {
          const [x, y] = EF.px(lo, la);
          idx ? r.lineTo(x, y) : r.moveTo(x, y);
        });
        r.stroke();
      });
    }
    relief().forEach(m => {
      r.beginPath(); r.moveTo(m.x - 3.2 * m.s, m.y + 2.3 * m.s); r.lineTo(m.x, m.y - 3.4 * m.s); r.lineTo(m.x + 3.2 * m.s, m.y + 2.3 * m.s); r.closePath();
      r.fillStyle = 'rgba(60,42,25,.30)'; r.fill();
      r.beginPath(); r.moveTo(m.x, m.y - 3.4 * m.s); r.lineTo(m.x + 3.2 * m.s, m.y + 2.3 * m.s); r.lineTo(m.x + 0.4 * m.s, m.y + 2.3 * m.s); r.closePath();
      r.fillStyle = 'rgba(255,255,255,.14)'; r.fill();
    });
  }

  function hlOf(k) {
    let h = HLC[k]; if (h) return h;
    const pix = EF.PIX[k], b = EF.BB[k], x0 = b[0], y0 = b[1], w = b[2] - x0 + 1, hh = b[3] - y0 + 1;
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    const g = c.getContext('2d'), im = g.createImageData(w, hh), d = im.data;
    const W = EF.W, H = EF.H, L = EF.L;
    for (let n = 0; n < pix.length; n++) {
      const i = pix[n], x = i % W, y = (i / W) | 0, o = ((y - y0) * w + (x - x0)) * 4;
      const ed = (x < W - 1 && L[i + 1] !== k) || (x && L[i - 1] !== k) || (y < H - 1 && L[i + W] !== k) || (y && L[i - W] !== k);
      d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = ed ? 170 : 46;
    }
    g.putImageData(im, 0, 0);
    return (HLC[k] = { c, x: x0, y: y0 });
  }

  function readSea() {
    const st = getComputedStyle(document.documentElement);
    SEAC = [st.getPropertyValue('--sea').trim(), st.getPropertyValue('--sea2').trim()];
  }

  EF.armyScale = k => Math.min(1.5, Math.max(0.32, Math.pow(EF.K0 / k, 0.78)));

  EF.armyClusters = function (k) {
    const now = performance.now();
    if (_clsCache && _clsCacheK === k && now - _clsCacheT < 16) return _clsCache;
    const rad = 30 / k, cl = [];
    EF.M.forEach(m => {
      if (!EF.seen(m)) return;
      const q = EF.armyPos(m);
      const c = cl.find(c2 => Math.hypot(c2.x - q.x, c2.y - q.y) < rad);
      if (c) {
        c.items.push({ m, q });
        const n = c.items.length;
        c.x = c.items.reduce((s2, i) => s2 + i.q.x, 0) / n;
        c.y = c.items.reduce((s2, i) => s2 + i.q.y, 0) / n;
      } else cl.push({ x: q.x, y: q.y, items: [{ m, q }] });
    });
    _clsCache = cl; _clsCacheK = k; _clsCacheT = now;
    return cl;
  };

  function domUnit(u) {
    // Pick most iconic unit type present (prioritize heavy/special units, then infantry)
    const prio = [5, 6, 9, 8, 7, 4, 3, 2, 1, 0];
    for (const idx of prio) if (u[idx] > 0) return idx;
    return 0;
  }

  function chips(cx, u, x, y, oc, code) {
    const a = [];
    u.forEach((n, i) => { if (n > 0) a.push([i, n]); });
    let sx = x - a.length * 11;
    if (code && a.length) {
      cx.drawImage(EF.FLAGS[code] || EF.FLAGS.NE, sx - 19, y + 1, 16, 11);
    }
    a.forEach(([i, n]) => {
      cx.drawImage(EF.SPR[i], sx, y, 20, 14);
      if (oc) { cx.strokeStyle = oc; cx.lineWidth = 1.6; cx.beginPath(); cx.roundRect(sx, y, 20, 14, 4); cx.stroke(); }
      cx.font = 'bold 9px Inter,system-ui'; cx.lineWidth = 2.5; cx.strokeStyle = '#000';
      cx.strokeText(n, sx + 16, y + 11.5); cx.fillStyle = '#fff'; cx.fillText(n, sx + 16, y + 11.5);
      sx += 22;
    });
  }

  function drawFX(cx, now) {
    for (let i = EF.FX.length - 1; i >= 0; i--) {
      const e = EF.FX[i], dur = FXD[e.t] || 1000, a = (now - e.s) / dur;
      if (a >= 1) { EF.FX.splice(i, 1); continue; }
      if (e.t === 'muzzle') {
        cx.fillStyle = `rgba(255,220,120,${1 - a})`; cx.beginPath(); cx.arc(e.x, e.y, 3 + a * 8, 0, 7); cx.fill();
      } else if (e.t === 'water') {
        cx.strokeStyle = `rgba(125,211,252,${0.85 * (1 - a)})`; cx.lineWidth = 1.8;
        cx.beginPath(); cx.arc(e.x, e.y, 4 + a * 18, 0, 7); cx.stroke();
      } else if (e.t === 'boom') {
        const rad = 4 + a * 20, g = cx.createRadialGradient(e.x, e.y, 0, e.x, e.y, rad);
        g.addColorStop(0, `rgba(255,250,200,${1 - a})`); g.addColorStop(0.5, `rgba(255,140,30,${0.85 * (1 - a)})`); g.addColorStop(1, 'rgba(120,30,0,0)');
        cx.fillStyle = g; cx.beginPath(); cx.arc(e.x, e.y, rad, 0, 7); cx.fill();
        cx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - a)})`; cx.lineWidth = 1.6; cx.beginPath(); cx.arc(e.x, e.y, rad * 1.35, 0, 7); cx.stroke();
      } else if (e.t === 'clash') {
        for (let j = 0; j < 6; j++) {
          const an = e.r + j * 1.05, d = 4 + a * 18;
          cx.fillStyle = `rgba(150,130,100,${0.5 * (1 - a)})`;
          cx.beginPath(); cx.arc(e.x + Math.cos(an) * d, e.y + Math.sin(an) * d * 0.7, 4 + a * 5, 0, 7); cx.fill();
        }
        cx.strokeStyle = `rgba(255,255,255,${1 - a})`; cx.lineWidth = 2.2;
        const s = 7 + Math.sin(a * 12) * 1.5;
        cx.beginPath(); cx.moveTo(e.x - s, e.y - s); cx.lineTo(e.x + s, e.y + s);
        cx.moveTo(e.x + s, e.y - s); cx.lineTo(e.x - s, e.y + s); cx.stroke();
      } else if (e.t === 'capture') {
        cx.strokeStyle = e.c; cx.globalAlpha = 1 - a; cx.lineWidth = 4;
        cx.beginPath(); cx.arc(e.x, e.y, 8 + a * 40, 0, 7); cx.stroke(); cx.globalAlpha = 1;
      }
    }
  }

  function drawBorders(cx, k) {
    const SD = EF.SD, borders = EF.BORDERS;
    if (!borders || !borders.length) return;
    cx.lineCap = 'round'; cx.lineJoin = 'round';
    borders.forEach(b => {
      const pA = SD[b.a], pB = SD[b.b];
      if (!pA || !pB) return;
      const sameOwner = pA.o === pB.o;
      cx.beginPath();
      for (let i = 0; i < b.pts.length; i += 2) {
        i ? cx.lineTo(b.pts[i], b.pts[i + 1]) : cx.moveTo(b.pts[i], b.pts[i + 1]);
      }
      if (sameOwner) {
        cx.strokeStyle = 'rgba(20, 26, 34, 0.34)';
        cx.lineWidth = 0.85 / Math.sqrt(k);
        cx.setLineDash([3 / k, 2.5 / k]);
        cx.stroke();
        cx.setLineDash([]);
      } else {
        cx.strokeStyle = 'rgba(10, 14, 20, 0.72)';
        cx.lineWidth = 1.9 / Math.sqrt(k);
        cx.stroke();
      }
    });
  }

  function drawLinks(cx, k, vis, sel, now) {
    const G = EF.G, P = EF.P, px = n => n / k, act = EF.actSet();
    const am = G.sel_m ? EF.M.find(m => m.id === G.sel_m) : null;
    const gest = EF.gest;
    const drag = !!(gest && gest.moved >= 6 && (gest.from || gest.fromA));
    const mode = EF.OPT.roads || 'sub';
    const uu = (sel && sel.o === G.me) ? sel.u : (am ? am.u : null);
    const fleet = !!((uu && (uu[8] || uu[9] || uu[7])) || (sel && sel.o0 === 'SEA'));
    const hasT = !!(uu && EF.tot(uu) > 0);
    const snap = drag && gest.cx != null ? EF.edgeAt(gest.cx, gest.cy) : null;
    const zf = Math.max(0, Math.min(1, (k - 0.5) / 0.9));

    const ln = (A, B) => { cx.beginPath(); cx.moveTo(A.x, A.y); cx.lineTo(B.x, B.y); cx.stroke(); };
    const lp = pts => { cx.beginPath(); pts.forEach((q, i) => (i ? cx.lineTo(q.x, q.y) : cx.moveTo(q.x, q.y))); cx.stroke(); };
    const dots = (l, hot) => {
      EF.tickPts(l, fleet).forEach(t => {
        const q = EF.epos(l.a, l.b, t);
        cx.fillStyle = hot ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.55)';
        cx.strokeStyle = 'rgba(0,0,0,.6)'; cx.lineWidth = px(1);
        cx.beginPath(); cx.arc(q.x, q.y, px(hot ? 3.2 : 2.2), 0, 7); cx.fill(); cx.stroke();
      });
    };

    cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.setLineDash([]);
    EF.LNK().forEach(l => {
      const A = P[l.a], B = P[l.b], hot = act.has(l.a) || act.has(l.b);
      const pl = EF.epl(l.a, l.b), seen = vis.has(l.a) || vis.has(l.b);

      if (l.t === 'port') {
        const S = A.o0 === 'SEA' ? B : A, Z = A.o0 === 'SEA' ? A : B, len = Math.hypot(Z.x - S.x, Z.y - S.y) || 1;
        if (hot || (fleet && act.has(S.id))) {
          cx.strokeStyle = 'rgba(165,215,255,.85)'; cx.lineWidth = px(1.8);
          cx.setLineDash([px(5), px(5)]); cx.lineDashOffset = -now / 70 * px(1); ln(S, Z);
          cx.setLineDash([]); cx.lineDashOffset = 0;
          const pr = EF.portRange(l.a, l.b);
          if (pr && pr[1] - pr[0] > 0.1) {
            const a0 = EF.epos(l.a, l.b, pr[0] + 0.05), a1 = EF.epos(l.a, l.b, pr[1] - 0.05);
            cx.strokeStyle = 'rgba(253,224,71,.5)'; cx.lineWidth = px(3); ln(a0, a1);
          }
          if (fleet && hasT) dots(l, true);
          return;
        }
        if (mode === 'all') {
          const f = Math.min(0.4, px(30) / len), ex = { x: S.x + (Z.x - S.x) * f, y: S.y + (Z.y - S.y) * f };
          cx.strokeStyle = 'rgba(190,225,255,.26)'; cx.lineWidth = px(1.3);
          cx.setLineDash([px(2), px(4)]); ln(S, ex); cx.setLineDash([]);
          cx.fillStyle = 'rgba(190,225,255,.55)'; cx.beginPath(); cx.arc(ex.x, ex.y, px(2), 0, 7); cx.fill();
        }
        return;
      }

      if (l.t === 'lane') {
        const br = hot || fleet;
        if (br) {
          cx.strokeStyle = 'rgba(56,189,248,.3)'; cx.lineWidth = px(3.5); lp(pl.pts);
          cx.strokeStyle = 'rgba(186,230,253,.9)'; cx.lineWidth = px(1.8);
          cx.setLineDash([px(6), px(8)]); cx.lineDashOffset = -now / 75 * px(1); lp(pl.pts);
          cx.setLineDash([]); cx.lineDashOffset = 0;
          if ((hot && hasT) || (fleet && drag)) dots(l, true);
          return;
        }
        if (mode === 'all') { cx.strokeStyle = 'rgba(125,211,252,.18)'; cx.lineWidth = px(1.2); cx.setLineDash([px(3), px(7)]); lp(pl.pts); cx.setLineDash([]); }
        else if (mode === 'sub' && zf > 0.15) { cx.strokeStyle = 'rgba(100,180,240,.09)'; cx.lineWidth = px(1); cx.setLineDash([px(2), px(7)]); lp(pl.pts); cx.setLineDash([]); }
        return;
      }

      if (l.t === 'strait') {
        if (hot || mode !== 'hl') {
          cx.strokeStyle = hot ? 'rgba(165,215,255,.9)' : (mode === 'all' ? 'rgba(190,225,255,.42)' : 'rgba(190,225,255,.2)');
          cx.lineWidth = px(hot ? 1.8 : 1.2); cx.setLineDash([px(3), px(5)]); ln(A, B); cx.setLineDash([]);
        }
        return;
      }

      const vv = vis.has(l.a) && vis.has(l.b), inf = Math.min(A.inf, B.inf);
      if (inf >= 1 && vv) {
        if (inf === 1) {
          // Dirt Road (no cartoon cars)
          cx.strokeStyle = 'rgba(40,25,10,.65)'; cx.lineWidth = px(3.8); lp(pl.pts);
          cx.strokeStyle = '#c4a46a'; cx.lineWidth = px(2.2); lp(pl.pts);
        } else {
          // Authentic S1914 Cross-Hatched WWI Railroad
          cx.strokeStyle = 'rgba(15,20,28,.85)'; cx.lineWidth = px(4.6); lp(pl.pts);
          cx.strokeStyle = '#cbd5e1'; cx.lineWidth = px(2.4); lp(pl.pts);
          cx.strokeStyle = '#1e293b'; cx.lineWidth = px(3.8); cx.setLineDash([px(1.6), px(3.4)]); lp(pl.pts);
          cx.setLineDash([]);
        }
      } else if (hot) {
        cx.strokeStyle = 'rgba(0,0,0,.3)'; cx.lineWidth = px(3.4); lp(pl.pts);
        cx.strokeStyle = 'rgba(255,255,255,.95)'; cx.lineWidth = px(2.2); cx.setLineDash([px(7), px(5)]); lp(pl.pts); cx.setLineDash([]);
      } else if (mode === 'all') {
        cx.strokeStyle = 'rgba(0,0,0,.28)'; cx.lineWidth = px(3.6); lp(pl.pts);
        cx.strokeStyle = 'rgba(255,255,255,.45)'; cx.lineWidth = px(1.4); cx.setLineDash([px(7), px(5)]); lp(pl.pts); cx.setLineDash([]);
      } else if (mode === 'sub' && seen && zf > 0) {
        cx.strokeStyle = 'rgba(255,255,255,' + (0.14 * zf + 0.03) + ')'; cx.lineWidth = px(1); lp(pl.pts);
      }
      if (hot && inf >= 1 && vv) { cx.strokeStyle = 'rgba(255,255,255,.55)'; cx.lineWidth = px(1); lp(pl.pts); }
      if (hot && (hasT || drag)) dots(l, true);
    });
    if (snap) { cx.strokeStyle = 'rgba(253,224,71,.95)'; cx.lineWidth = px(3.4); lp(EF.epl(snap.a, snap.b).pts); }
  }

  function drawArmies(cx, k, now, tag) {
    const G = EF.G, P = EF.P, sc = EF.armyScale(k), cls = EF.armyClusters(k);

    // March routes + Waypoint flags
    cls.forEach(c => c.items.forEach(({ m, q }) => {
      if (m.o === G.me && (!m.halted || m.path.length || m.stop || (m.waypoints && m.waypoints.length))) {
        cx.setLineDash([3 * sc, 3 * sc]);
        cx.strokeStyle = m.forced ? '#f97316' : EF.NATIONS[m.o][1];
        cx.lineWidth = 2 * sc;
        cx.beginPath(); cx.moveTo(q.x, q.y);
        if (m.t) cx.lineTo(m.t.x, m.t.y);
        (m.path || []).forEach(i => cx.lineTo(P[i].x, P[i].y));
        if (m.waypoints && m.waypoints.length) {
          m.waypoints.forEach((wp, wi) => {
            const pt = wp.edge ? wp.edge : P[wp.id];
            if (pt) {
              cx.lineTo(pt.x, pt.y);
              cx.stroke();
              cx.setLineDash([]);
              cx.fillStyle = '#facc15'; cx.strokeStyle = '#111'; cx.lineWidth = 1.4 * sc;
              cx.beginPath(); cx.arc(pt.x, pt.y, 6 * sc, 0, 7); cx.fill(); cx.stroke();
              cx.fillStyle = '#111'; cx.font = `bold ${Math.round(8 * sc)}px Inter,system-ui`;
              cx.fillText(String(wi + 1), pt.x, pt.y + 0.5);
              cx.setLineDash([3 * sc, 3 * sc]); cx.beginPath(); cx.moveTo(pt.x, pt.y);
            }
          });
        }
        cx.stroke(); cx.setLineDash([]);
      }
    }));

    // Compact S1914 Army Pins
    cls.forEach(c => {
      const one = c.items.length === 1, x = c.x, y = c.y;
      if (!one) {
        c.items.forEach(({ m, q }) => {
          cx.strokeStyle = 'rgba(255,255,255,.6)'; cx.lineWidth = 1.2 / k; cx.setLineDash([3 / k, 3 / k]);
          cx.beginPath(); cx.moveTo(x, y); cx.lineTo(q.x, q.y); cx.stroke(); cx.setLineDash([]);
          cx.fillStyle = EF.NATIONS[m.o][1]; cx.strokeStyle = '#fff'; cx.lineWidth = 1.3 / k;
          cx.beginPath(); cx.arc(q.x, q.y, 3.6 / k, 0, 7); cx.fill(); cx.stroke();
        });
      }
      cx.save(); cx.translate(x, y); cx.scale(sc, sc); cx.translate(-x, -y);
      if (one) {
        const m = c.items[0].m;
        const selected = G.sel_m === m.id || G.ma.has(m.id);
        const hovered = EF.hoverArmy === m.id;
        const expand = selected || hovered || k > 2.6;
        const dom = domUnit(m.u);

        if (selected) {
          cx.strokeStyle = G.sel_m === m.id ? '#fde047' : '#93c5fd';
          cx.lineWidth = 2.6; cx.beginPath(); cx.roundRect(x - 24, y - 13, 48, 25, 6); cx.stroke();
        }
        // S1914 Army Pin Plaque
        cx.fillStyle = 'rgba(15, 23, 34, 0.92)';
        cx.strokeStyle = EF.NATIONS[m.o][1]; cx.lineWidth = 2;
        cx.beginPath(); cx.roundRect(x - 21, y - 10, 42, 19, 5); cx.fill(); cx.stroke();
        // Flag + Dominant Silhouette + Count
        cx.drawImage(EF.FLAGS[m.o] || EF.FLAGS.NE, x - 18, y - 7, 13, 9);
        cx.drawImage(EF.SPR[dom], x - 4, y - 8, 16, 11);
        cx.fillStyle = '#fff'; cx.font = 'bold 10px Inter,system-ui';
        cx.fillText(EF.tot(m.u), x + 15.5, y - 1.5);
        // HP & Morale bars
        cx.fillStyle = 'rgba(0,0,0,.6)'; cx.fillRect(x - 18, y + 4.5, 36, 3.5);
        cx.fillStyle = EF.hcol(m.hp); cx.fillRect(x - 18, y + 4.5, 36 * m.hp, 1.8);
        cx.fillStyle = '#60a5fa'; cx.fillRect(x - 18, y + 6.3, 36 * m.mo, 1.7);

        if (m.halted) { tag('⏸', x - 24, y - 9, '9px system-ui'); }
        if (m.forced) { tag('⚡', x + 24, y - 9, '10px system-ui'); }
        if (m.embark) {
          const f = Math.max(0, Math.min(1, 1 - (m.embark.end - G.t) / m.embark.max));
          cx.fillStyle = 'rgba(0,0,0,.65)'; cx.fillRect(x - 14, y - 16, 28, 3.5);
          cx.fillStyle = '#38bdf8'; cx.fillRect(x - 14, y - 16, 28 * f, 3.5);
          tag('⚓', x, y - 22, '10px system-ui');
        }
        const isSeaZone = m.f.o0 === 'SEA' || m.t.o0 === 'SEA';
        if (EF.isConvoy(m.u, isSeaZone)) tag('⚠️', x + 25, y + 2, '10px system-ui');
        if (EF.isPureAir(m.u) && !m.airHop) tag('📦', x - 25, y + 2, '9px system-ui');

        if (expand) chips(cx, m.u, x, y + 12, EF.NATIONS[m.o][1]);
      } else {
        const tn = c.items.reduce((s2, i) => s2 + EF.tot(i.m.u), 0);
        const ow = [...new Set(c.items.map(i => i.m.o))];
        const sel = c.items.some(i => G.sel_m === i.m.id || G.ma.has(i.m.id));
        const w = 44;
        cx.fillStyle = ow.length === 1 ? 'rgba(15, 23, 34, 0.94)' : '#1f2937';
        cx.strokeStyle = sel ? '#fde047' : (ow.length === 1 ? EF.NATIONS[ow[0]][1] : 'rgba(255,255,255,.9)');
        cx.lineWidth = sel ? 2.8 : 2;
        cx.beginPath(); cx.roundRect(x - w / 2, y - 10, w, 19, 6); cx.fill(); cx.stroke();
        if (ow.length === 1) cx.drawImage(EF.FLAGS[ow[0]] || EF.FLAGS.NE, x - 18, y - 7, 13, 9);
        cx.fillStyle = '#fff'; cx.font = 'bold 11px Inter,system-ui';
        cx.fillText('✱ ' + tn, ow.length === 1 ? x + 6 : x, y - 1);
        tag(ow.join('·'), x, y - 16, 'bold 8px Inter,system-ui');
      }
      cx.restore();
    });
  }

  EF.draw = function () {
    const G = EF.G, P = EF.P, cv = EF.cv, cx = EF.cx;
    if (!G || !cv || !cx) return;
    if (!STATIC) { buildStatic(); STATIC = 1; }
    if (G.dirty) { updateLand(); G.dirty = 0; }
    if (!SEAOK) { readSea(); SEAOK = 1; }

    const k = EF.kk(), ps = Math.min(1.4, Math.max(0.45, Math.pow(EF.K0 / k, 0.45)));
    const vw = innerWidth, vh = innerHeight, vis = G.vis;
    const sel = G.sel && P[G.sel], tgt = G.tgt && P[G.tgt], now = performance.now();

    cx.setTransform(EF.DPR, 0, 0, EF.DPR, 0, 0);
    const gy = -G.vy * k, hk = EF.H * k;
    if (!_seaGrad || _lastGy !== gy || _lastHk !== hk || _lastSeaC !== SEAC[0]) {
      _lastGy = gy; _lastHk = hk; _lastSeaC = SEAC[0];
      _seaGrad = cx.createLinearGradient(0, gy, 0, gy + hk);
      _seaGrad.addColorStop(0, SEAC[0]); _seaGrad.addColorStop(1, SEAC[1]);
    }
    cx.fillStyle = _seaGrad; cx.fillRect(0, 0, vw, vh);

    const z = EF.DPR * k;
    cx.setTransform(z, 0, 0, z, -z * G.vx, -z * G.vy);
    cx.drawImage(bkS, 0, 0, EF.W, EF.H);
    cx.drawImage(EF.mc, 0, 0, EF.W, EF.H);
    drawBorders(cx, k);
    cx.drawImage(bkR, 0, 0, EF.W, EF.H);

    if (sel && sel.o0 !== 'SEA' && sel.k >= 0) { const h = hlOf(sel.k); cx.drawImage(h.c, h.x, h.y); }
    G.ms.forEach(id => { const q = P[id]; if (q && q.o0 !== 'SEA') { const h = hlOf(q.k); cx.globalAlpha = 0.6; cx.drawImage(h.c, h.x, h.y); cx.globalAlpha = 1; } });

    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineJoin = 'round'; cx.lineCap = 'round';
    const tag = (t, x, y, f) => {
      cx.font = f || '600 10px Inter,system-ui'; cx.lineWidth = 3;
      cx.strokeStyle = 'rgba(0,0,0,.65)'; cx.fillStyle = '#fff';
      cx.strokeText(t, x, y); cx.fillText(t, x, y);
    };
    const flag = (x, y) => {
      cx.strokeStyle = '#111'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x, y + 8); cx.lineTo(x, y - 11); cx.stroke();
      cx.fillStyle = '#facc15'; cx.beginPath(); cx.moveTo(x, y - 11); cx.lineTo(x + 12, y - 7); cx.lineTo(x, y - 3); cx.closePath(); cx.fill(); cx.stroke();
    };

    drawLinks(cx, k, vis, sel, now);

    // Construction progress rings
    EF.SD.forEach(p => {
      if (!p.cons || !vis.has(p.id)) return;
      const c = p.cons, f = Math.max(0, Math.min(1, (G.t - c.st) / (c.end - c.st)));
      cx.strokeStyle = 'rgba(0,0,0,.55)'; cx.lineWidth = 5; cx.beginPath(); cx.arc(p.x, p.y, 16 * ps, 0, 7); cx.stroke();
      cx.strokeStyle = '#facc15'; cx.lineWidth = 3.5; cx.beginPath(); cx.arc(p.x, p.y, 16 * ps, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); cx.stroke();
    });

    // Fire support target lines & range rings
    const drawArtLine = s => {
      if (!s.bt || !(s.o === G.me || (EF.R[G.me] && EF.R[G.me][s.o] === 'ally'))) return;
      const a = s.f ? EF.armyPos(s) : s;
      let tx, ty;
      if (s.bt.k === 'p') { const w = P[s.bt.id]; tx = w.x; ty = w.y; }
      else { const m = EF.M.find(q => String(q.id) === String(s.bt.id)); if (!m) return; const q = EF.armyPos(m); tx = q.x; ty = q.y; }
      cx.strokeStyle = 'rgba(239,68,68,.75)'; cx.lineWidth = 1.8; cx.setLineDash([2, 4]);
      cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(tx, ty); cx.stroke(); cx.setLineDash([]);
    };
    EF.SD.forEach(drawArtLine);
    EF.M.forEach(drawArtLine);

    const sh = sel && sel.o === G.me ? sel : (G.sel_m ? EF.M.find(m => m.id === G.sel_m && m.o === G.me) : null);
    if (sh) {
      const rg = EF.RNG(sh.u, sh.f ? null : sh);
      if (rg) {
        const a = sh.f ? EF.armyPos(sh) : sh;
        cx.strokeStyle = 'rgba(239,68,68,.55)'; cx.lineWidth = 1.6; cx.setLineDash([7, 5]);
        cx.beginPath(); cx.arc(a.x, a.y, rg, 0, 7); cx.stroke();
        cx.setLineDash([]);
      }
      // Show Aerodrome rebase radius when pure Airplane province is selected
      if (!sh.f && EF.isPureAir(sh.u) && (sh.aero || 0) >= 1) {
        cx.strokeStyle = 'rgba(56,189,248,.45)'; cx.lineWidth = 1.5; cx.setLineDash([5, 5]);
        cx.beginPath(); cx.arc(sh.x, sh.y, EF.AIR_HOP + (sh.aero >= 2 ? 35 : 0), 0, 7); cx.stroke();
        cx.setLineDash([]);
      }
    }

    G.ms.forEach(id => {
      const q = P[id];
      cx.strokeStyle = '#fff'; cx.setLineDash([3, 3]); cx.lineWidth = 2;
      cx.beginPath(); cx.arc(q.x, q.y, 17, 0, 7); cx.stroke(); cx.setLineDash([]);
    });

    cx.strokeStyle = '#fde047'; cx.lineWidth = 2.5; cx.setLineDash([6, 4]);
    if (G.rt && sel && tgt) {
      cx.beginPath(); cx.moveTo(sel.x, sel.y);
      G.rt.forEach(i => cx.lineTo(P[i].x, P[i].y));
      if (tgt.edge) cx.lineTo(tgt.x, tgt.y);
      cx.stroke();
    }
    const gest = EF.gest;
    if (gest && gest.moved >= 6 && (gest.from || gest.fromA) && gest.cx != null) {
      const o = gest.from || EF.armyPos(gest.fromA), d = EF.edgeAt(gest.cx, gest.cy);
      cx.beginPath(); cx.moveTo(o.x, o.y); cx.lineTo(d ? d.x : gest.cx, d ? d.y : gest.cy); cx.stroke();
      if (d) { cx.setLineDash([]); flag(d.x, d.y); }
    }
    cx.setLineDash([]);

    if (sel) sel.adj.forEach(b => {
      const t = P[b];
      cx.strokeStyle = t.o === G.me || (EF.R[G.me] && EF.R[G.me][t.o] === 'ally') ? '#4ade80' : EF.hostile(G.me, t.o) ? '#f87171' : '#fbbf24';
      cx.lineWidth = 2.5; cx.beginPath(); cx.arc(t.x, t.y, (t.o0 === 'SEA' ? 11 : 18) * ps, 0, 7); cx.stroke();
    });
    if (tgt) {
      if (tgt.edge) flag(tgt.x, tgt.y);
      else { cx.strokeStyle = '#ef4444'; cx.setLineDash([4, 4]); cx.lineWidth = 3; cx.beginPath(); cx.arc(tgt.x, tgt.y, 22 * ps, 0, 7); cx.stroke(); cx.setLineDash([]); }
    }

    // Provinces & S1914 Compact Garrison Pins
    EF.SD.forEach(p => {
      const sea = p.o0 === 'SEA', v = vis.has(p.id), ghost = sea && !EF.tot(p.u), r = ghost ? 5 : sea ? 7.5 : 10;
      cx.save(); cx.translate(p.x, p.y); cx.scale(ps, ps); cx.translate(-p.x, -p.y);

      if (sea && ghost) {
        cx.fillStyle = 'rgba(10,24,40,.55)'; cx.strokeStyle = 'rgba(125,211,252,.4)'; cx.lineWidth = 1.2;
        cx.beginPath(); cx.arc(p.x, p.y, r, 0, 7); cx.fill(); cx.stroke();
      } else {
        cx.fillStyle = ghost ? 'rgba(8,18,32,.5)' : 'rgba(12,18,26,.88)';
        cx.strokeStyle = ghost ? 'rgba(255,255,255,.55)' : EF.NATIONS[p.o][1];
        cx.lineWidth = ghost ? 1.5 : 2.5;
        cx.beginPath(); cx.arc(p.x, p.y, r, 0, 7); cx.fill(); cx.stroke();
      }
      // Fortress concentric bastion rings
      for (let w = 0; w < p.walls; w++) {
        const rr = 13 + w * 3;
        cx.strokeStyle = 'rgba(0,0,0,.55)'; cx.lineWidth = 3.8; cx.beginPath(); cx.arc(p.x, p.y, rr, 0, 7); cx.stroke();
        cx.strokeStyle = '#d6d3d1'; cx.lineWidth = 2.4; cx.setLineDash([3.4, 2.2]);
        cx.beginPath(); cx.arc(p.x, p.y, rr, 0, 7); cx.stroke(); cx.setLineDash([]);
      }
      if (p === sel) { cx.strokeStyle = '#fde047'; cx.lineWidth = 2; cx.beginPath(); cx.arc(p.x, p.y, r + 8, 0, 7); cx.stroke(); }

      cx.fillStyle = '#fff'; cx.font = `bold ${sea ? 9 : 11}px Inter,system-ui`;
      if (!ghost) cx.fillText(v ? EF.tot(p.u) : '?', p.x, p.y + 0.5);

      // Single vs Double Resource Icons!
      if (!sea) {
        cx.drawImage(EF.RSP[p.r], p.x + 8, p.y - 22, 13, 13);
        if (p.v > 1) cx.drawImage(EF.RSP[p.r], p.x + 15, p.y - 22, 13, 13);
        // Unrest smoke when stability < 35%
        if (v && p.st < 0.35) {
          for (let si = 0; si < 3; si++) {
            const ph = ((now / 900 + si * 0.33) % 1);
            cx.fillStyle = `rgba(30,30,34,${0.55 * (1 - ph)})`;
            cx.beginPath(); cx.arc(p.x - 4 + si * 4, p.y - 10 - ph * 18, 2.5 + ph * 4, 0, 7); cx.fill();
          }
          tag('⚠', p.x + 17, p.y + 14, '12px system-ui');
        }
        if (p.coastal && EF.bm(p) < 1) tag('🚫', p.x - 17, p.y + 14, '12px system-ui');
        if (v && p.ind) {
          const x0 = p.x + 13, y0 = p.y + 3;
          cx.fillStyle = 'rgba(20,24,30,.92)'; cx.fillRect(x0, y0, 12, 6);
          cx.fillRect(x0 + 1, y0 - 4, 3, 4); if (p.ind > 1) cx.fillRect(x0 + 7, y0 - 6, 3, 6);
        }
      }
      if (!sea && v) {
        let bx = p.x - 21;
        [['wall', p.walls], ['ind', p.ind], ['inf', p.inf], ['bar', p.bar], ['port', p.port], ['aero', p.aero]].forEach(([kd, Lv]) => {
          if (Lv) { cx.drawImage(EF.BSP[kd], bx, p.y - 22, 13, 13); tag(String(Lv), bx + 11, p.y - 10, 'bold 8px Inter,system-ui'); bx -= 15; }
        });
      }

      // Garrison Display: Compact Pin by default, full chips on select/hover/close-zoom
      let ry = p.y + (sea ? 9 : 11);
      const expandProv = p === sel || G.ms.has(p.id) || EF.hoverProv === p.id || k > 2.6;
      if (v) {
        if (expandProv) {
          chips(cx, p.u, p.x, ry);
          Object.entries(p.al).forEach(([o, a]) => {
            if (EF.tot(a)) { ry += 15; chips(cx, a, p.x, ry, EF.NATIONS[o][1], o); }
          });
        } else {
          // Compact S1914 garrison summary pill only if non-empty allied stack or special units
          const hasAlly = Object.values(p.al).some(a => EF.tot(a) > 0);
          if (hasAlly) {
            const oFirst = Object.keys(p.al).find(o => EF.tot(p.al[o]) > 0);
            if (oFirst) {
              cx.drawImage(EF.FLAGS[oFirst] || EF.FLAGS.NE, p.x - 14, ry + 1, 13, 9);
              tag(String(EF.tot(p.al[oFirst])), p.x + 7, ry + 5.5, 'bold 9px Inter,system-ui');
              ry += 12;
            }
          }
        }
      }
      const has = v && (expandProv ? (EF.tot(p.u) > 0 || ry > p.y + 11) : ry > p.y + 11);
      tag((p.cap ? '★ ' : '') + p.n.replace(/_/g, ' '), p.x, ry + (has ? 17 : 8), sea ? 'italic 10px Inter,system-ui' : undefined);
      cx.restore();
    });

    drawArmies(cx, k, now, tag);

    // Battle clash badges
    EF.BT.forEach(b => {
      let x, y, an, dn;
      if (b.kind === 'prov') { if (!vis.has(b.p.id)) return; x = b.p.x; y = b.p.y - 32; an = EF.tot(b.au); dn = EF.tot(EF.defU(b.p)); }
      else { if (!EF.seen(b.m1) && !EF.seen(b.m2)) return; const a = EF.armyPos(b.m1), c = EF.armyPos(b.m2); x = (a.x + c.x) / 2; y = (a.y + c.y) / 2 - 24; an = EF.tot(b.m1.u); dn = EF.tot(b.m2.u); }
      const w = Math.max(1, an + dn), pulse = 0.75 + 0.25 * Math.sin(now / 180);
      cx.save(); cx.translate(x, y); cx.scale(EF.armyScale(k), EF.armyScale(k)); cx.translate(-x, -y);
      cx.fillStyle = 'rgba(20,8,8,.85)'; cx.strokeStyle = `rgba(248,113,113,${pulse})`; cx.lineWidth = 1.8;
      cx.beginPath(); cx.roundRect(x - 27, y - 9, 54, 18, 9); cx.fill(); cx.stroke();
      cx.fillStyle = '#fff'; cx.font = 'bold 10px Inter,system-ui'; cx.fillText(`${an} ⚔ ${dn}`, x, y + 0.5);
      cx.fillStyle = '#4ade80'; cx.fillRect(x - 22, y + 10.5, 44 * an / w, 2.4);
      cx.fillStyle = '#f87171'; cx.fillRect(x - 22 + 44 * an / w, y + 10.5, 44 * dn / w, 2.4);
      cx.restore();
    });

    drawFX(cx, now);

    EF.BOMBS.forEach(b => {
      const pk = Math.max(0, Math.min(1, (G.t - b.st) / (b.et - b.st)));
      const bx = b.f.x + (b.t.x - b.f.x) * pk;
      const by = b.f.y + (b.t.y - b.f.y) * pk - Math.sin(pk * Math.PI) * (b.air ? 28 : 50);
      if (b.air) {
        cx.drawImage(EF.SPR[7], bx - 10, by - 7, 20, 14);
      } else {
        cx.fillStyle = '#000'; cx.beginPath(); cx.arc(bx, by, 3, 0, 7); cx.fill();
        cx.fillStyle = '#ef4444'; cx.beginPath(); cx.arc(bx, by, 1.5, 0, 7); cx.fill();
      }
    });
  };
})();
