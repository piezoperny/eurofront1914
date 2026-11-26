(function () {
  const EF = (window.EF = window.EF || {});

  EF.tot = u => u.reduce((a, b) => a + b, 0);
  EF.pwr = u => u.reduce((a, b, i) => a + b * EF.T[i][2], 0);
  EF.stk = (p, o) => (p.o === o ? p.u : (p.al[o] || (p.al[o] = new Array(EF.U_LEN).fill(0))));
  EF.SH = (p, o) => (p.o === o ? p : (p.alq[o] || (p.alq[o] = { hp: 1, mo: 1 })));

  EF.addTo = function (p, o, u, h, m) {
    const s = EF.stk(p, o), H = EF.SH(p, o);
    const n0 = EF.tot(s), n1 = EF.tot(u), nn = (n0 + n1) || 1;
    H.hp = (H.hp * n0 + h * n1) / nn;
    H.mo = (H.mo * n0 + m * n1) / nn;
    for (let j = 0; j < EF.U_LEN; j++) s[j] += u[j];
  };

  EF.hostile = (a, b) => a !== b && (a === 'NE' || b === 'NE' || (EF.R[a] && EF.R[a][b] === 'war'));

  EF.bm = p =>
    p.coastal && p.o0 !== 'SEA' && p.adj.some(a => {
      const q = EF.P[a];
      return q && q.o0 === 'SEA' && q.o !== p.o && EF.hostile(p.o, q.o) && EF.tot(q.u) > 0;
    }) ? 0.5 : 1;

  EF.pm = p => {
    const G = EF.G;
    const oilShort = G && G.rs && G.rs[p.o] && G.rs[p.o].o <= 0;
    const indBonus = oilShort ? 0.125 : 0.25;
    return (1 + indBonus * (p.ind || 0)) * (0.3 + 0.7 * (p.st == null ? 1 : p.st));
  };

  EF.lv = (q, k) =>
    k === 'wall' ? q.walls :
    k === 'ind'  ? q.ind :
    k === 'bar'  ? q.bar :
    k === 'port' ? (q.port || 0) :
    k === 'aero' ? (q.aero || 0) : q.inf;

  EF.canCons = function (o, q, k) {
    const G = EF.G;
    if (!q || q.o !== o || q.o0 === 'SEA' || q.cons) return false;
    if (k === 'port' && !q.coastal) return false;
    const cur = EF.lv(q, k);
    if (cur >= EF.MXL[k]) return false;
    return Object.entries(EF.cCost(k, cur + 1)).every(([r, v]) =>
      r === 'g' ? G.g[o] >= v : G.rs[o][r] >= v
    );
  };

  EF.startCons = function (o, q, k) {
    if (!EF.canCons(o, q, k)) return false;
    const G = EF.G, n = EF.lv(q, k) + 1;
    Object.entries(EF.cCost(k, n)).forEach(([r, v]) => {
      if (r === 'g') G.g[o] -= v;
      else G.rs[o][r] -= v;
    });
    q.cons = { k, n, st: G.t, end: G.t + EF.CDUR[k](n) };
    G.dirty = 1;
    return true;
  };

  EF.canRecruit = function (o, p, k) {
    const G = EF.G;
    if (!p || p.o !== o || p.o0 === 'SEA' || p.q.length >= 8) return false;
    if (p.ind < EF.T[k][5]) return false;
    if (k === 1 && (p.bar || 0) < 1) return false;       // Cavalry needs Barracks 1
    if (k === 6 && (p.inf || 0) < 2) return false;       // Railgun needs Rail (inf >= 2)
    if (k === 7 && (p.aero || 0) < 1) return false;      // Airplane needs Aerodrome 1
    if ((k === 8 || k === 9) && (!p.coastal || (p.port || 0) < 1)) return false; // Sub/Battleship need Port 1
    return EF.afford(o, k);
  };

  EF.afford = (o, k) =>
    EF.G.g[o] >= EF.T[k][1] && Object.entries(EF.CST[k]).every(([r, n]) => EF.G.rs[o][r] >= n);

  EF.pay = (o, k) => {
    EF.G.g[o] -= EF.T[k][1];
    Object.entries(EF.CST[k]).forEach(([r, n]) => (EF.G.rs[o][r] -= n));
  };

  EF.queueU = function (o, p, k) {
    if (!EF.canRecruit(o, p, k)) return false;
    EF.pay(o, k);
    p.q.push({ k, st: null, end: null });
    return true;
  };

  EF.cancelQ = function (o, p, i) {
    const j = p.q[i];
    if (!j || p.o !== o) return;
    p.q.splice(i, 1);
    EF.G.g[o] += EF.T[j.k][1] * 0.75;
    Object.entries(EF.CST[j.k]).forEach(([r, n]) => (EF.G.rs[o][r] += n * 0.75));
  };

  EF.slotsOf = p => 1 + (p.bar || 0) + (p.ind || 0);
  EF.jobTime = (p, k) => {
    const morBoost = 0.85 + 0.25 * (p.st == null ? 1 : p.st); // High stability/morale speeds training slightly
    const bldBoost = k < 2 ? (1 + 0.25 * (p.bar || 0)) : (1 + 0.3 * (p.ind || 0));
    return EF.TT[k] / (bldBoost * morBoost);
  };
  EF.autoRate = p => (1 / EF.PERIOD[p.bar || 0]) * (0.3 + 0.7 * (p.st == null ? 1 : p.st));

  EF.runQ = function (p) {
    const sl = EF.slotsOf(p), G = EF.G;
    p.q.forEach((j, i) => {
      if (i < sl && j.end == null) {
        j.st = G.t;
        j.end = G.t + EF.jobTime(p, j.k);
      }
    });
    for (let i = p.q.length - 1; i >= 0; i--) {
      const j = p.q[i];
      if (j.end != null && G.t >= j.end) {
        p.q.splice(i, 1);
        const u = new Array(EF.U_LEN).fill(0);
        u[j.k] = 1;
        EF.addTo(p, p.o, u, 1, Math.max(0.6, p.st == null ? 1 : p.st));
      }
    }
  };

  EF.refreshEco = function () {
    const E = {};
    EF.NS.forEach(o => (E[o] = { up: 0, n: 0, bar: 0 }));
    const add = (o, u) => {
      const e = E[o];
      if (!e) return;
      u.forEach((x, j) => { e.n += x; e.up += x * EF.UP[j]; });
    };
    EF.SD.forEach(p => {
      if (p.o0 !== 'SEA' && E[p.o]) E[p.o].bar += p.bar || 0;
      add(p.o, p.u);
      Object.entries(p.al).forEach(([o, a]) => add(o, a));
    });
    EF.M.forEach(m => add(m.o, m.u));
    EF.G.eco = E;
  };

  EF.inc = o => EF.mine(o).reduce((s, p) => s + p.v * EF.INC * EF.bm(p) * EF.pm(p) + (p.cap ? 1 : 0), 0);

  // All values in econ(o) are exact PER-DAY rates (1 day = EF.DAY_T = 1.5 G.t)
  EF.econ = function (o) {
    const G = EF.G;
    const my = EF.mine(o);
    const R = {};
    EF.RK.forEach(r => (R[r] = { p: 0, c: 0, ps: [], cs: {} }));
    const g = { p: 0, c: 0, ps: [], cs: {} };
    const am = o === G.me ? 1 : EF.DF[G.df].inc;

    my.forEach(p => {
      const pb = 1 + (p.port || 0) * 0.2;
      const m = EF.bm(p) * EF.pm(p) * am * pb;
      const gp = p.v * EF.INC * m * 1.5 + (p.cap ? 1.5 * am : 0);
      const rp = p.v * 0.3 * m * 1.5;
      g.p += gp;
      g.ps.push([p.n + (p.cap ? ' ★' : ''), gp]);
      R[p.r].p += rp;
      R[p.r].ps.push([p.n + (p.v > 1 ? ' (2×)' : ''), rp]);
    });

    const by = new Array(EF.U_LEN).fill(0);
    let n = 0;
    const add = u => u.forEach((x, j) => { by[j] += x; n += x; });
    EF.SD.forEach(p => { const u = p.o === o ? p.u : p.al[o]; if (u) add(u); });
    EF.M.forEach(m => { if (m.o === o) add(m.u); });

    EF.T.forEach((t, j) => {
      if (by[j]) {
        const c = by[j] * EF.UP[j];
        g.c += c;
        g.cs[`${t[0]} wages (${by[j]})`] = c;
        const ur = EF.UP_RES[j];
        if (ur) {
          Object.entries(ur).forEach(([rk, val]) => {
            const rc = by[j] * val;
            R[rk].c += rc;
            R[rk].cs[`${t[0]} upkeep (${by[j]})`] = (R[rk].cs[`${t[0]} upkeep (${by[j]})`] || 0) + rc;
          });
        }
      }
    });

    let bl = 0, indLv = 0, portLv = 0, railLv = 0, aeroLv = 0;
    my.forEach(p => {
      bl += p.bar || 0;
      indLv += p.ind || 0;
      portLv += p.port || 0;
      aeroLv += p.aero || 0;
      if ((p.inf || 0) >= 2) railLv++;
    });

    if (bl) { const bc = bl * 0.3; R.f.c += bc; R.f.cs['Barracks upkeep'] = bc; }
    if (indLv) { const oc = indLv * 0.2; R.o.c += oc; R.o.cs['Industry fuel (oil)'] = oc; }
    if (aeroLv) { const ac = aeroLv * 0.15; R.o.c += ac; R.o.cs['Aerodromes (oil)'] = ac; }
    if (railLv) { const cc = railLv * 0.2; R.c.c += cc; R.c.cs['Railroad fuel (coal)'] = cc; }
    if (portLv) {
      const fp = portLv * 0.4, gp = portLv * 0.3;
      R.f.p += fp; R.f.ps.push(['Port fisheries', fp]);
      g.p += gp; g.ps.push(['Port maritime commerce', gp]);
    }

    // Espionage HQ daily salaries
    const spies = (G.spies || []).filter(s => s.o === o);
    if (spies.length) {
      let sc = 0;
      spies.forEach(s => { sc += EF.SPY_COST[s.mission] || 0.8; });
      g.c += sc;
      g.cs[`Espionage network (${spies.length})`] = sc;
    }

    return { g, R, n };
  };

  EF.computeShortages = function (o) {
    const G = EF.G, rs = G.rs[o];
    if (!rs) return {};
    return {
      f: rs.f <= 0,
      o: rs.o <= 0,
      c: rs.c <= 0,
      s: rs.s <= 0,
      w: rs.w <= 0,
      g: G.g[o] <= 0
    };
  };

  EF.restore = function (o, q) {
    if (!q || q.o !== o || q.o0 === 'SEA' || q.st >= 0.97) return false;
    const c = 12 * q.v;
    if (EF.G.g[o] < c) return false;
    EF.G.g[o] -= c;
    q.st = Math.min(1, q.st + 0.35);
    return true;
  };

  // Stock Market: Neutral Merchant Pool + Player/AI Order Board + Embargoes
  EF.sanctionSpread = function (o) {
    const G = EF.G;
    let count = 0;
    EF.NS.forEach(other => {
      if (other !== o && EF.mine(other).length && EF.isEmbargoed(o, other)) count++;
    });
    return count * 0.08; // +8% buy surcharge / -8% sell penalty per embargoing power
  };

  EF.quote = function (r, q, buy, o) {
    const G = EF.G;
    const spread = o ? EF.sanctionSpread(o) : 0;
    let c = 0, px = G.px[r];
    for (let i = 0; i < q; i++) {
      if (buy) { c += px * (1 + spread); px *= 1.03; }
      else { c += px * Math.max(0.25, 0.8 - spread); px *= 0.97; }
    }
    return c;
  };

  EF.trade = function (o, r, n) {
    const G = EF.G, q = Math.abs(n);
    let ok = 0;
    if (n > 0) {
      const c = EF.quote(r, q, true, o);
      if (G.g[o] < c) return false;
      G.g[o] -= c; G.rs[o][r] += q;
      for (let i = 0; i < q; i++) G.px[r] *= 1.03;
      ok = q;
    } else {
      const k = Math.min(q, Math.floor(G.rs[o][r]));
      if (k <= 0) return false;
      G.g[o] += EF.quote(r, k, false, o);
      G.rs[o][r] -= k;
      for (let i = 0; i < k; i++) G.px[r] *= 0.97;
      ok = -k;
    }
    G.px[r] = Math.min(EF.BP[r] * 4, Math.max(EF.BP[r] * 0.35, G.px[r]));
    G.mkl.unshift({ o, r, n: ok });
    if (G.mkl.length > 10) G.mkl.pop();
    return true;
  };

  EF.postOrder = function (o, r, side, qty, px) {
    const G = EF.G;
    qty = Math.floor(qty);
    px = Math.round(px * 10) / 10;
    if (qty <= 0 || px <= 0) return false;
    // Limit max 2 active orders per nation per resource
    const existing = (G.mktOrders || []).filter(x => x.o === o && x.r === r && x.side === side);
    if (existing.length >= 2) return false;
    if (side === 'sell') {
      if (G.rs[o][r] < qty) return false;
      G.rs[o][r] -= qty;
    } else {
      const cost = qty * px;
      if (G.g[o] < cost) return false;
      G.g[o] -= cost;
    }
    G.mktOrders.push({ id: ++EF.ord_id, o, r, side, qty, px, exp: G.t + 12 });
    return true;
  };

  EF.fillOrder = function (actor, orderId, takeQty) {
    const G = EF.G;
    const idx = (G.mktOrders || []).findIndex(x => x.id === orderId);
    if (idx < 0) return false;
    const ord = G.mktOrders[idx];
    if (ord.o === actor || EF.isEmbargoed(actor, ord.o)) return false;
    const q = Math.min(ord.qty, takeQty || ord.qty);
    if (q <= 0) return false;
    const goldAmt = q * ord.px;
    if (ord.side === 'sell') {
      if (G.g[actor] < goldAmt) return false;
      G.g[actor] -= goldAmt;
      G.rs[actor][ord.r] += q;
      G.g[ord.o] += goldAmt;
    } else {
      if (G.rs[actor][ord.r] < q) return false;
      G.rs[actor][ord.r] -= q;
      G.g[actor] += goldAmt;
      G.rs[ord.o][ord.r] += q;
    }
    ord.qty -= q;
    if (ord.qty <= 0) G.mktOrders.splice(idx, 1);
    G.mkl.unshift({ o: actor, r: ord.r, n: ord.side === 'sell' ? q : -q, peer: ord.o });
    if (G.mkl.length > 10) G.mkl.pop();
    return true;
  };

  EF.cancelOrder = function (o, orderId) {
    const G = EF.G;
    const idx = (G.mktOrders || []).findIndex(x => x.id === orderId && x.o === o);
    if (idx < 0) return false;
    const ord = G.mktOrders[idx];
    if (ord.side === 'sell') G.rs[o][ord.r] += ord.qty;
    else G.g[o] += ord.qty * ord.px;
    G.mktOrders.splice(idx, 1);
    return true;
  };
})();
