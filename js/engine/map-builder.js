(function () {
  const EF = (window.EF = window.EF || {});

  EF.P = {};
  EF.SD = [];
  EF.L = null;
  EF.LS = null;
  EF.PIX = [];
  EF.BB = [];
  EF.NZ = null;
  EF.TS = null;
  EF.TN = null;
  EF.EPOLY = {};
  EF.PRG = {};
  EF.AVIA = {};
  EF.BORDERS = [];
  EF.EDG_ = null;
  EF.LNK_ = null;
  EF.MINE_CACHE = {};

  EF.sbc = document.createElement('canvas');
  EF.shc = document.createElement('canvas');
  EF.mc = document.createElement('canvas');

  const nz = (x, y) =>
    Math.sin(x * 0.045 + Math.sin(y * 0.031) * 2.3) * Math.cos(y * 0.052 + Math.sin(x * 0.027) * 2.1) * 0.6 +
    Math.sin(x * 0.19 + y * 0.13) * Math.cos(y * 0.17 - x * 0.09) * 0.4;

  // Ramer-Douglas-Peucker simplification + endpoint-preserving Chaikin smoothing
  function simplifyRDP(pts, eps) {
    if (pts.length <= 4) return pts;
    const n = pts.length >> 1;
    let dmax = 0, idx = 0;
    const x1 = pts[0], y1 = pts[1], x2 = pts[pts.length - 2], y2 = pts[pts.length - 1];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    for (let i = 1; i < n - 1; i++) {
      const px = pts[i * 2], py = pts[i * 2 + 1];
      const d = Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > eps) {
      const l = simplifyRDP(pts.slice(0, (idx + 1) * 2), eps);
      const r = simplifyRDP(pts.slice(idx * 2), eps);
      return l.slice(0, -2).concat(r);
    }
    return [x1, y1, x2, y2];
  }

  function chaikin(pts) {
    if (pts.length <= 4) return pts;
    const out = [pts[0], pts[1]];
    for (let i = 0; i < pts.length - 2; i += 2) {
      const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3];
      out.push(ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25);
      out.push(ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75);
    }
    out.push(pts[pts.length - 2], pts[pts.length - 1]);
    return out;
  }

  function buildBorders(W, H, L) {
    const segs = {};
    const addSeg = (a, b, x1, y1, x2, y2) => {
      const key = a < b ? a + '-' + b : b + '-' + a;
      (segs[key] || (segs[key] = [])).push([x1, y1, x2, y2]);
    };
    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < W - 1; x++) {
        const i = y * W + x, a = L[i];
        if (a < 0) continue;
        const r = L[i + 1], b = L[i + W];
        if (r >= 0 && r !== a) addSeg(a, r, x + 1, y, x + 1, y + 1);
        if (b >= 0 && b !== a) addSeg(a, b, x, y + 1, x + 1, y + 1);
      }
    }
    const borders = [];
    const ptKey = (x, y) => (x << 12) | y;
    Object.entries(segs).forEach(([key, list]) => {
      const [a, b] = key.split('-').map(Number);
      const adj = new Map();
      const used = new Uint8Array(list.length);
      list.forEach(([x1, y1, x2, y2], idx) => {
        const k1 = ptKey(x1, y1), k2 = ptKey(x2, y2);
        if (!adj.has(k1)) adj.set(k1, []);
        if (!adj.has(k2)) adj.set(k2, []);
        adj.get(k1).push({ idx, nx: x2, ny: y2, nk: k2 });
        adj.get(k2).push({ idx, nx: x1, ny: y1, nk: k1 });
      });
      // Walk chains starting from degree-1 endpoints first, then closed loops
      const walk = (startK, sx, sy) => {
        const pts = [sx, sy];
        let curK = startK;
        while (true) {
          const edges = adj.get(curK);
          const next = edges && edges.find(e => !used[e.idx]);
          if (!next) break;
          used[next.idx] = 1;
          pts.push(next.nx, next.ny);
          curK = next.nk;
        }
        if (pts.length >= 4) {
          const sm = chaikin(simplifyRDP(pts, 1.1));
          borders.push({ a, b, pts: sm });
        }
      };
      for (const [k, edges] of adj.entries()) {
        if (edges.length === 1 && !used[edges[0].idx]) {
          walk(k, k >> 12, k & 4095);
        }
      }
      for (let idx = 0; idx < list.length; idx++) {
        if (!used[idx]) {
          const [x1, y1] = list[idx];
          walk(ptKey(x1, y1), x1, y1);
        }
      }
    });
    return borders;
  }

  EF.buildMap = function (mapId) {
    const map = EF.MAPS[mapId || 'europe1914'];
    EF.CUR_MAP = map;
    const W = (EF.W = map.W);
    const H = (EF.H = map.H);
    const px = (EF.px = map.px);

    EF.P = {};
    EF.SD = [];
    EF.L = new Int16Array(W * H).fill(-1);
    EF.LS = new Int16Array(W * H).fill(-1);
    EF.EPOLY = {};
    EF.PRG = {};
    EF.AVIA = {};
    EF.EDG_ = null;
    EF.LNK_ = null;
    EF.mc.width = W;
    EF.mc.height = H;

    const P = EF.P, SD = EF.SD, L = EF.L, LS = EF.LS;

    const m = document.createElement('canvas');
    m.width = W; m.height = H;
    const c = m.getContext('2d', { willReadFrequently: true });
    const poly = (a, col, op) => {
      c.beginPath();
      for (let i = 0; i < a.length; i += 2) {
        const [x, y] = px(a[i], a[i + 1]);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
      c.globalCompositeOperation = op || 'source-over';
      c.fillStyle = col;
      c.fill();
    };
    poly(map.MAIN, '#fff');
    if (map.BS) poly(map.BS, '#000', 'destination-out');
    if (map.CAS) poly(map.CAS, '#000', 'destination-out');

    const d = c.getImageData(0, 0, W, H).data;
    const ms = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] >= 128) ms[i] = 1;

    const stampPath = (pts, id) => {
      const p = new Path2D();
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let i = 0; i < pts.length; i += 2) {
        const [x, y] = px(pts[i], pts[i + 1]);
        i ? p.lineTo(x, y) : p.moveTo(x, y);
        if (x < x0) x0 = x; if (y < y0) y0 = y;
        if (x > x1) x1 = x; if (y > y1) y1 = y;
      }
      p.closePath();
      const bx0 = Math.max(0, x0 | 0), by0 = Math.max(0, y0 | 0);
      const bx1 = Math.min(W - 1, Math.ceil(x1)), by1 = Math.min(H - 1, Math.ceil(y1));
      for (let y = by0; y <= by1; y++)
        for (let x = bx0; x <= bx1; x++)
          if (c.isPointInPath(p, x, y)) ms[y * W + x] = id;
    };
    if (map.GB) stampPath(map.GB, 2);
    if (map.IRE) stampPath(map.IRE, 3);
    if (map.SIC) stampPath(map.SIC, 4);
    if (map.ISLES) map.ISLES.forEach(([pts, id]) => stampPath(pts, id));

    map.D.forEach((l, k) => {
      const [id, n, lo, la, o, vRaw] = l.split(/\s+/);
      const [x, y] = px(+lo, +la);
      const v = o === 'SEA' ? 0 : Math.min(2, Math.max(1, +vRaw)); // S1914 Single (1x) or Double (2x) Resource
      const p = (P[id] = {
        id, n: n.replace(/_/g, ' '), x, y, o, o0: o, v,
        adj: [], u: new Array(EF.U_LEN).fill(0), k,
        cap: map.CAP.includes(id),
        walls: 0, ind: 0, inf: 0, port: 0, aero: 0, bar: 0,
        autoFire: true, bt: null, cons: null, st: 1, hp: 1, mo: 1,
        alq: {}, q: [], ap: 0, cd: 0, coastal: false, al: {},
        r: map.RESM[id] || 'f', hit: 0
      });
      p.m = p.o0 === 'SEA' ? 0 : ms[(y | 0) * W + (x | 0)];
      SD.push(p);
    });

    const sx = SD.map(() => 0), sy = SD.map(() => 0), sn = SD.map(() => 0);
    const SMs = {};
    SD.forEach(p => { if (p.m) (SMs[p.m] = SMs[p.m] || []).push(p); });
    Object.entries(map.ATT || {}).forEach(([mid, id]) => { if (!SMs[mid]) SMs[mid] = [P[id]]; });

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, mid = ms[i];
        if (!mid) continue;
        const cs = SMs[mid];
        if (!cs) continue;
        let b = 1e9, bk = -1;
        for (const p of cs) {
          const q = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (q < b) { b = q; bk = p.k; }
        }
        L[i] = bk;
        if (SD[bk].m === mid) { sx[bk] += x; sy[bk] += y; sn[bk]++; }
      }
    }

    const seas = SD.filter(q => q.o0 === 'SEA' && q.id !== 'bks');
    const bp = new Path2D();
    if (map.BS) {
      map.BS.forEach((v, i) => {
        if (i % 2) return;
        const [x, y] = px(map.BS[i], map.BS[i + 1]);
        i ? bp.lineTo(x, y) : bp.moveTo(x, y);
      });
      bp.closePath();
    }
    const cp = new Path2D();
    if (map.CAS) {
      map.CAS.forEach((v, i) => {
        if (i % 2) return;
        const [x, y] = px(map.CAS[i], map.CAS[i + 1]);
        i ? cp.lineTo(x, y) : cp.moveTo(x, y);
      });
      cp.closePath();
    }
    for (let i = 0; i < W * H; i++) {
      if (!ms[i]) {
        const x = i % W, y = (i / W) | 0;
        if (map.BS && P.bks && x > 548 && x < 760 && y > 490 && y < 612 && c.isPointInPath(bp, x, y)) {
          LS[i] = P.bks.k; continue;
        }
        if (map.CAS && x > 820 && y > 468 && y < 630 && c.isPointInPath(cp, x, y)) continue;
        let b = 1e9, bk2 = -1;
        for (const q of seas) {
          const e = (q.x - x) ** 2 + (q.y - y) ** 2;
          if (e < b) { b = e; bk2 = q.k; }
        }
        LS[i] = bk2;
      }
    }

    // Sea zone grid & borders
    EF.sbc.width = W; EF.sbc.height = H;
    const si = EF.sbc.getContext('2d').createImageData(W, H), sd = si.data;
    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < W - 1; x++) {
        const i = y * W + x;
        if (ms[i] || LS[i] < 0) continue;
        let a = LS[i] % 2 ? 8 : 0;
        if ((!ms[i + 1] && LS[i + 1] !== LS[i]) || (!ms[i + W] && LS[i + W] !== LS[i])) a = 65;
        sd[i * 4] = sd[i * 4 + 1] = sd[i * 4 + 2] = 255;
        sd[i * 4 + 3] = a;
      }
    }
    EF.sbc.getContext('2d').putImageData(si, 0, 0);

    // Coastal bathymetry glow
    {
      const gw = Math.ceil(W / 4), gh = Math.ceil(H / 4), cov = new Float32Array(gw * gh);
      for (let i = 0; i < W * H; i++) if (ms[i]) cov[((i / W | 0) >> 2) * gw + ((i % W) >> 2)] += 1 / 16;
      const bl = a => {
        const o = new Float32Array(a.length), o2 = new Float32Array(a.length), r = 2;
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
          let t = 0, n = 0;
          for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < gw) { t += a[y * gw + xx]; n++; } }
          o[y * gw + x] = t / n;
        }
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
          let t = 0, n = 0;
          for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < gh) { t += o[yy * gw + x]; n++; } }
          o2[y * gw + x] = t / n;
        }
        return o2;
      };
      const sh = bl(bl(cov));
      EF.shc.width = gw; EF.shc.height = gh;
      const shi = EF.shc.getContext('2d').createImageData(gw, gh), shd = shi.data;
      for (let i = 0; i < gw * gh; i++) {
        const a = Math.min(0.5, Math.max(0, sh[i] * 1.5 - 0.02)) * (cov[i] < 0.6 ? 1 : 0);
        shd[i * 4] = 170; shd[i * 4 + 1] = 225; shd[i * 4 + 2] = 240; shd[i * 4 + 3] = a * 255;
      }
      EF.shc.getContext('2d').putImageData(shi, 0, 0);
    }

    const lk = (a, b) => {
      if (!SD[a].adj.includes(SD[b].id)) {
        SD[a].adj.push(SD[b].id);
        SD[b].adj.push(SD[a].id);
      }
    };
    const CT = {}, touch = (a, b, x, y) => {
      const key = a < b ? a + '-' + b : b + '-' + a;
      (CT[key] || (CT[key] = [])).push(x, y);
    };
    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < W - 1; x++) {
        const i = y * W + x, a = L[i], ma = ms[i];
        if (a < 0 || ma > 4) continue;
        if (L[i + 1] >= 0 && L[i + 1] !== a && ms[i + 1] === ma) touch(a, L[i + 1], x + 1, y);
        if (L[i + W] >= 0 && L[i + W] !== a && ms[i + W] === ma) touch(a, L[i + W], x, y + 1);
      }
    }
    Object.entries(CT).forEach(([key, cList]) => {
      const [a, b] = key.split('-').map(Number);
      const pA = SD[a], pB = SD[b];
      if (cList.length / 2 >= 5 && pA.m === pB.m && !map.NO_LAND.has(pA.id + '-' + pB.id)) lk(a, b);
    });
    map.SEA.forEach(([a, b]) => { if (P[a] && P[b]) lk(P[a].k, P[b].k); });

    SD.forEach(p => {
      if (sn[p.k]) { p.x = sx[p.k] / sn[p.k]; p.y = sy[p.k] / sn[p.k]; }
      p.coastal = p.adj.some(id => P[id].o0 === 'SEA');
    });

    const cnt = new Int32Array(SD.length);
    for (let i = 0; i < W * H; i++) { const k = L[i]; if (k >= 0) cnt[k]++; }
    EF.PIX = SD.map((_, k) => new Int32Array(cnt[k]));
    EF.BB = SD.map(() => [W, H, 0, 0]);
    const fl = new Int32Array(SD.length);
    EF.NZ = new Float32Array(W * H);
    EF.TS = new Uint8Array(W * H);
    EF.TN = new Uint8Array(W * H);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, k = L[i];
        if (k < 0) continue;
        EF.PIX[k][fl[k]++] = i;
        const b = EF.BB[k];
        if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y;
        if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
        EF.NZ[i] = nz(x, y);
        const la = 71 - y * 43 / H, lo = x * 62 / W - 12;
        let sa = 0;
        if (la < 35) {
          sa = Math.min(1, (35 - la) / 5) * 0.42;
          sa *= 1 - 0.5 * Math.max(0, Math.min(1, (12 - lo) / 10));
        }
        EF.TS[i] = sa * 255;
        EF.TN[i] = Math.min(1, Math.max(0, (la - 61) / 8)) * 0.3 * 255;
      }
    }

    // Bend land links that cut across water or a third province
    Object.entries(CT).forEach(([key, cList]) => {
      const [a, b] = key.split('-').map(Number);
      if (cList.length / 2 < 5) return;
      const A = SD[a], B = SD[b];
      const off = pts => {
        let n = 0;
        for (let s = 1; s < pts.length; s++) {
          const u = pts[s - 1], v = pts[s], m2 = Math.max(3, (Math.hypot(v.x - u.x, v.y - u.y) / 3) | 0);
          for (let i = 0; i <= m2; i++) {
            const x = u.x + (v.x - u.x) * i / m2, y = u.y + (v.y - u.y) * i / m2;
            const q = L[(y | 0) * W + (x | 0)];
            if (q !== a && q !== b) n++;
          }
        }
        return n;
      };
      const st = off([A, B]);
      if (st <= 3) return;
      const directD = Math.hypot(A.x - B.x, A.y - B.y);
      let best = null, bs = st * 500 + directD * 1.6;
      const step = Math.max(1, (cList.length / 2 / 60) | 0);
      for (let j = 0; j < cList.length / 2; j += step) {
        const q = { x: cList[j * 2], y: cList[j * 2 + 1] };
        const totD = Math.hypot(A.x - q.x, A.y - q.y) + Math.hypot(q.x - B.x, q.y - B.y);
        const v = off([A, q, B]) * 500 + totD;
        if (v < bs) { bs = v; best = q; }
      }
      if (best) EF.AVIA[A.id < B.id ? A.id + '-' + B.id : B.id + '-' + A.id] = [best];
    });
    Object.entries(map.HARD_AVIA || {}).forEach(([k, pts]) => { EF.AVIA[k] = pts; });

    EF.SEAK = new Set(map.SEA.map(([a, b]) => (a < b ? a + '-' + b : b + '-' + a)));
    EF.BORDERS = buildBorders(W, H, L);
  };

  EF.epl = function (a, b) {
    const key = a < b ? a + '-' + b : b + '-' + a;
    let e = EF.EPOLY[key];
    if (!e) {
      const [ka, kb] = key.split('-');
      const via = (EF.CUR_MAP && EF.CUR_MAP.VIA && EF.CUR_MAP.VIA[key]) || [];
      const pts = [
        EF.P[ka],
        ...via.map(([lo, la]) => { const [x, y] = EF.px(lo, la); return { x, y }; }),
        ...(EF.AVIA[key] || []),
        EF.P[kb]
      ];
      const len = [0];
      for (let i = 1; i < pts.length; i++) {
        len.push(len[i - 1] + Math.hypot(pts[i - 1].x - pts[i].x, pts[i - 1].y - pts[i].y));
      }
      e = EF.EPOLY[key] = { pts, len, L: len[len.length - 1] };
    }
    return e;
  };

  EF.elen = (a, b) => EF.epl(a, b).L;

  EF.epos = function (a, b, k) {
    const e = EF.epl(a, b);
    if (a > b) k = 1 - k;
    const d = Math.max(0, Math.min(1, k)) * e.L;
    let i = 1;
    while (i < e.len.length - 1 && e.len[i] < d) i++;
    const t = (d - e.len[i - 1]) / ((e.len[i] - e.len[i - 1]) || 1);
    return {
      x: e.pts[i - 1].x + (e.pts[i].x - e.pts[i - 1].x) * t,
      y: e.pts[i - 1].y + (e.pts[i].y - e.pts[i - 1].y) * t
    };
  };

  EF.portRange = function (a, b) {
    const key = a < b ? a + '-' + b : b + '-' + a;
    if (key in EF.PRG) return EF.PRG[key];
    const [ka, kb] = key.split('-'), A = EF.P[ka], B = EF.P[kb], seaA = A.o0 === 'SEA';
    let lim = null;
    for (let i = 0; i <= 60; i++) {
      const t = seaA ? i / 60 : 1 - i / 60;
      const x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t;
      if (EF.L[(y | 0) * EF.W + (x | 0)] >= 0) break;
      lim = t;
    }
    return (EF.PRG[key] = lim == null ? null : (seaA ? [0, lim] : [lim, 1]));
  };

  EF.getCoastK = function (f, t) {
    if (f.o0 === 'SEA') return 0;
    for (let s = 1; s <= 40; s++) {
      const k = s / 40, pos = EF.epos(f.id, t.id, k), idx = (pos.y | 0) * EF.W + (pos.x | 0);
      if (idx < 0 || idx >= EF.W * EF.H || EF.L[idx] < 0) return Math.max(0.2, (s - 1) / 40);
    }
    return 0.45;
  };

  EF.edges = () => EF.EDG_ || (EF.EDG_ = EF.SD.flatMap(q => q.adj.filter(id => q.id < id).map(id => [q.id, id])));
  EF.linkType = (a, b) => {
    const sa = EF.P[a].o0 === 'SEA', sb = EF.P[b].o0 === 'SEA';
    return sa && sb ? 'lane' : (sa || sb) ? 'port' : EF.SEAK.has(a < b ? a + '-' + b : b + '-' + a) ? 'strait' : 'land';
  };
  EF.LNK = () => EF.LNK_ || (EF.LNK_ = EF.edges().map(([a, b]) => ({ a, b, t: EF.linkType(a, b) })));

  EF.hitAt = (x, y) => {
    if (x < 0 || y < 0 || x >= EF.W || y >= EF.H) return null;
    const i = (y | 0) * EF.W + (x | 0), k = EF.L[i] >= 0 ? EF.L[i] : EF.LS[i];
    return k >= 0 ? EF.SD[k] : null;
  };

  EF.rebuildMine = function () {
    EF.MINE_CACHE = {};
    EF.NS.forEach(o => (EF.MINE_CACHE[o] = []));
    EF.MINE_CACHE.NE = [];
    EF.MINE_CACHE.SEA = [];
    for (let i = 0; i < EF.SD.length; i++) {
      const p = EF.SD[i];
      if (p.o0 !== 'SEA') {
        (EF.MINE_CACHE[p.o] || (EF.MINE_CACHE[p.o] = [])).push(p);
      }
    }
  };

  EF.setProvOwner = function (p, no) {
    const old = p.o;
    if (old === no) return;
    p.o = no;
    if (EF.MINE_CACHE[old]) {
      const idx = EF.MINE_CACHE[old].indexOf(p);
      if (idx >= 0) EF.MINE_CACHE[old].splice(idx, 1);
    }
    if (p.o0 !== 'SEA') {
      (EF.MINE_CACHE[no] || (EF.MINE_CACHE[no] = [])).push(p);
    }
  };

  EF.mine = o => EF.MINE_CACHE[o] || (EF.MINE_CACHE[o] = EF.SD.filter(p => p.o === o && p.o0 !== 'SEA'));
})();
