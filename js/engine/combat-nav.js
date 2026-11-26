(function () {
  const EF = (window.EF = window.EF || {});

  EF.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  EF.natpow = o =>
    EF.mine(o).reduce((s, p) => s + EF.pwr(p.u), 0) +
    EF.M.filter(m => m.o === o).reduce((s, m) => s + EF.pwr(m.u), 0) + 1;

  EF.hasNavy = u => u[8] > 0 || u[9] > 0;
  EF.isPureNavy = u => !u.slice(0, 8).some(x => x > 0) && EF.hasNavy(u);
  EF.isPureAir = u => u[7] > 0 && u.every((x, j) => j === 7 || x === 0);
  EF.isConvoy = (u, isSea) => isSea && u.slice(0, 7).some(x => x > 0) && u[8] === 0 && u[9] === 0;

  EF.RNG = function (u, src) {
    let r = 0;
    if (u[3] > 0) r = Math.max(r, EF.ARANGE);
    if (u[6] > 0) r = Math.max(r, EF.RRANGE);
    if (u[9] > 0) r = Math.max(r, EF.SRANGE);
    // Airplanes strike only when stationed at an Aerodrome province
    if (u[7] > 0 && src && !src.f && src.o0 !== 'SEA' && (src.aero || 0) >= 1) {
      r = Math.max(r, src.aero >= 2 ? EF.PRANGE2 : EF.PRANGE);
    }
    return r;
  };

  EF.eff = (h, m) => (0.45 + 0.55 * h) * (0.6 + 0.4 * m);
  const rnd = () => 0.88 + Math.random() * 0.24;
  const RND = 0.9;
  EF.hcol = v => (v > 0.66 ? '#4ade80' : v > 0.33 ? '#fbbf24' : '#f87171');

  EF.pw = function (a, b, d, fw = 12) {
    const s = EF.tot(b) || 1;
    const v = a.map((n, k) => {
      let stat = EF.T[k][d ? 3 : 2];
      // Submarine 2x bonus vs Battleships [9] and Convoys
      if (k === 8 && (b[9] > 0 || (b[8] === 0 && b[9] === 0 && EF.tot(b) > 0))) stat *= 1.6;
      return [stat * (1 + 0.5 * (b[EF.B[k]] || 0) / s), n];
    }).sort((x, y) => y[0] - x[0]);
    let r = 0, left = fw;
    for (const [x, n] of v) {
      const c = Math.min(n, left);
      r += c * x;
      left -= c;
      if (left <= 0) break;
    }
    return r;
  };

  EF.canEnter = (o, p) => p.o === o || EF.hostile(o, p.o) || (EF.R[p.o] && (EF.R[p.o][o] === 'ally' || EF.R[p.o][o] === 'pact'));

  EF.stepOK = function (o, p, u, prevP) {
    if (p.o0 === 'SEA') return true;
    if (EF.isPureNavy(u)) {
      // Pure naval fleets can enter friendly/allied coastal ports from sea, NEVER march overland between land provinces
      if (prevP && prevP.o0 !== 'SEA') return false;
      return p.coastal && (p.o === o || (EF.R[p.o] && EF.R[p.o][o] === 'ally'));
    }
    // Railguns on land require Railway (inf >= 2) and Coal
    if (u[6] > 0 && prevP && prevP.o0 !== 'SEA') {
      if (Math.min(prevP.inf || 0, p.inf || 0) < 2) return false;
      if (EF.G && EF.G.rs[o] && EF.G.rs[o].c <= 0) return false;
    }
    return EF.canEnter(o, p);
  };

  EF.legMul = function (o, a, b, u) {
    if (a.o0 === 'SEA' || b.o0 === 'SEA') return 1;
    const G = EF.G;
    if (u && EF.isPureAir(u)) {
      const fr = q => q.o === o || (EF.R[q.o] && EF.R[q.o][o] === 'ally');
      if (fr(a) && fr(b) && (a.aero || 0) >= 1 && (b.aero || 0) >= 1) return 1;
      return 0.12; // Crated ground transport when no Aerodrome link
    }
    const fr = q => q.o === o || (EF.R[q.o] && EF.R[q.o][o] === 'ally');
    if (!fr(a) || !fr(b)) return 1;
    let infLv = Math.min(a.inf || 0, b.inf || 0);
    if (infLv >= 2 && G && G.rs[o] && G.rs[o].c <= 0) infLv = 1; // Coal shortage degrades Rail to Road
    return EF.IM[infLv];
  };

  EF.spd = function (u, o) {
    const G = EF.G;
    const oilShort = o && G && G.rs[o] && G.rs[o].o <= 0;
    const coalShort = o && G && G.rs[o] && G.rs[o].c <= 0;
    let mn = 9;
    for (let j = 0; j < EF.U_LEN; j++) {
      if (!u[j]) continue;
      let s = EF.T[j][4];
      if (oilShort && (j === 2 || j === 4 || j === 5 || j === 7 || j === 8)) s *= 0.55;
      if (coalShort && j === 9) s *= 0.7;
      if (s < mn) mn = s;
    }
    return mn;
  };

  EF.route = function (f, t, u, o) {
    if (t.edge) {
      let best = null;
      const { a, b, k } = t.edge;
      [[a, b, k], [b, a, 1 - k]].forEach(([x, y, kf]) => {
        if (!(EF.linkType(a, b) === 'port' ? true : EF.stepOK(o, EF.P[y], u, EF.P[x]))) return;
        const rt = x === f.id ? [] : EF.route(f, EF.P[x], u, o);
        if (!rt) return;
        rt.stop = { nb: y, k: kf };
        const e = EF.etaR(f, rt, u, o);
        if (!best || e < best.e) best = { rt, e };
      });
      return best && best.rt;
    }
    // Direct Aerodrome-to-Aerodrome air-rebase for pure Airplanes
    if (EF.isPureAir(u) && (f.aero || 0) >= 1 && (t.aero || 0) >= 1 && (t.o === o || (EF.R[t.o] && EF.R[t.o][o] === 'ally'))) {
      const maxHop = EF.AIR_HOP + ((f.aero >= 2 ? 35 : 0));
      if (EF.dist(f, t) <= maxHop) {
        const rt = [t.id];
        rt.airHop = true;
        return rt;
      }
    }
    const dd = { [f.id]: 0 }, prev = {}, q = [f.id], done = new Set();
    while (q.length) {
      let bi = 0, bval = dd[q[0]];
      for (let i = 1; i < q.length; i++) {
        if (dd[q[i]] < bval) { bval = dd[q[i]]; bi = i; }
      }
      const c = q.splice(bi, 1)[0];
      done.add(c);
      if (c === t.id) break;
      const Pc = EF.P[c];
      for (let i = 0; i < Pc.adj.length; i++) {
        const a = Pc.adj[i];
        if (done.has(a)) continue;
        const n = EF.P[a];
        if (!EF.stepOK(o, n, u, Pc)) continue;
        if (EF.isPureNavy(u) && n.o0 !== 'SEA' && n.id !== t.id) continue;
        const w = dd[c] + EF.elen(c, a) / EF.legMul(o, Pc, n, u);
        if (dd[a] == null || w < dd[a]) {
          dd[a] = w;
          prev[a] = c;
          if (!q.includes(a)) q.push(a);
        }
      }
    }
    if (dd[t.id] == null) return null;
    const path = [];
    for (let c = t.id; c !== f.id; c = prev[c]) path.unshift(c);
    return path;
  };

  EF.stopOK = (o, u, a, b) => (EF.linkType(a.id, b.id) === 'port' ? true : EF.stepOK(o, b, u, a));
  EF.etaG = function (pts, u, o) {
    const sp = EF.spd(u, o);
    let t = 0;
    for (let i = 1; i < pts.length; i++) {
      const A = pts[i - 1], B = pts[i];
      const d = A.id && B.id ? EF.elen(A.id, B.id) : EF.dist(A, B);
      const lm = A.id && B.id ? EF.legMul(o, A, B, u) : 1;
      t += d / (EF.SPD * sp * lm);
    }
    return t;
  };
  EF.etaR = function (f, rt, u, o) {
    if (rt && rt.airHop) return EF.dist(f, EF.P[rt[0]]) / (EF.SPD * EF.T[7][4]);
    const nodes = [f, ...rt.map(i => EF.P[i])];
    let t = EF.etaG(nodes, u, o);
    if (rt.stop) {
      const a = nodes[nodes.length - 1], b = EF.P[rt.stop.nb];
      t += EF.elen(a.id, b.id) * rt.stop.k / (EF.SPD * EF.spd(u, o) * EF.legMul(o, a, b, u));
    }
    return t;
  };
  EF.etaS = (f, rt, u) => EF.etaR(f, rt, u, EF.G.me) / (EF.BASE * (EF.G.sp || 1));
  EF.etaOf = (pts, u) => EF.etaG(pts, u, EF.G.me) / (EF.BASE * (EF.G.sp || 1));

  EF.armyPos = m => (m.airHop ? {
    x: m.f.x + (m.t.x - m.f.x) * m.k,
    y: m.f.y + (m.t.y - m.f.y) * m.k
  } : EF.epos(m.f.id, m.t.id, m.k));

  EF.send = function (p, t, u, o, path, stop, kmax, waypoints, airHop) {
    const sk = EF.stk(p, o);
    u = u.map((x, j) => Math.max(0, Math.min(x, sk[j])));
    if (!EF.tot(u)) return;
    const H = EF.SH(p, o), hp = H.hp, mo = H.mo;
    u.forEach((x, j) => (sk[j] -= x));
    let coastK = null, embState = null;
    const hasLandOrAir = u.slice(0, 8).some(x => x > 0);
    // Only land/crated units embark at the shore; pure naval fleets sail immediately!
    if (p.o0 !== 'SEA' && t.o0 === 'SEA' && hasLandOrAir && !airHop) {
      coastK = EF.getCoastK(p, t);
      embState = 'marching';
    }
    EF.M.push({
      id: ++EF.m_id_seq, f: p, t, u, o, k: 0,
      d: airHop ? EF.dist(p, t) : EF.elen(p.id, t.id),
      s: EF.spd(u, o), halted: false,
      path: path || [], waypoints: waypoints || [],
      stop: stop || null, kmax: kmax || 1,
      hp, mo, autoFire: true, forced: false,
      embark: null, coastK, embState, airHop: !!airHop
    });
  };

  EF.dispatch = function (p, u, o, rt, waypoints) {
    if (rt && rt.airHop) {
      EF.send(p, EF.P[rt[0]], u, o, [], null, 1, waypoints || [], true);
      return true;
    }
    const nx = rt.length ? EF.P[rt[0]] : (rt.stop && EF.P[rt.stop.nb]);
    if (!nx || !(rt.length ? EF.stepOK(o, nx, u, p) : EF.stopOK(o, u, p, nx))) return false;
    if (rt.length) EF.send(p, nx, u, o, rt.slice(1), rt.stop, 1, waypoints || []);
    else EF.send(p, nx, u, o, [], null, rt.stop.k, waypoints || []);
    return true;
  };

  EF.cont = function (m, t, u) {
    if (m.path && m.path.length) {
      const nx = EF.P[m.path[0]];
      if (EF.stepOK(m.o, nx, u, t)) EF.send(t, nx, u.slice(), m.o, m.path.slice(1), m.stop, 1, m.waypoints ? m.waypoints.slice() : []);
      else EF.addTo(t, m.o, u, m.hp, m.mo);
    } else if (m.stop) {
      const nb = EF.P[m.stop.nb];
      if (EF.stopOK(m.o, u, t, nb)) EF.send(t, nb, u.slice(), m.o, [], null, m.stop.k, m.waypoints ? m.waypoints.slice() : []);
      else EF.addTo(t, m.o, u, m.hp, m.mo);
    } else if (m.waypoints && m.waypoints.length) {
      const wp = m.waypoints.shift();
      const dest = wp.edge ? EF.mkDest(wp.edge) : EF.P[wp.id];
      if (dest && dest.id !== t.id) {
        const rt = EF.route(t, dest, u, m.o);
        if (rt) { EF.dispatch(t, u.slice(), m.o, rt, m.waypoints.slice()); return; }
      }
      EF.addTo(t, m.o, u, m.hp, m.mo);
    }
  };

  EF.planArmy = function (m, t) {
    if (m.fight) return null;
    const u = m.u, o = m.o, sp = EF.SPD * EF.spd(u, o) * EF.legMul(o, m.f, m.t, u);
    if (t.edge && ((t.edge.a === m.f.id && t.edge.b === m.t.id) || (t.edge.a === m.t.id && t.edge.b === m.f.id))) {
      const kt = t.edge.a === m.f.id ? t.edge.k : 1 - t.edge.k;
      return {
        e: Math.abs(kt - m.k) * m.d / sp,
        apply: () => {
          if (kt < m.k) {
            [m.f, m.t] = [m.t, m.f];
            m.k = 1 - m.k;
            m.kmax = 1 - kt;
          } else m.kmax = kt;
          m.halted = false; m.path = []; m.stop = null;
          delete m.embark; m.coastK = null; m.embState = null;
        }
      };
    }
    let best = null;
    [[m.t, (1 - m.k) * m.d, false], [m.f, m.k * m.d, true]].forEach(([nx, len, rev]) => {
      if (!EF.stepOK(o, nx, u, rev ? m.t : m.f)) return;
      const rt = nx.id === t.id ? [] : EF.route(nx, t, u, o);
      if (!rt) return;
      const e = len / sp + EF.etaR(nx, rt, u, o);
      if (!best || e < best.e) best = { rt, e, rev };
    });
    if (!best) return null;
    const b = best;
    return {
      e: b.e,
      apply: () => {
        if (b.rev) {
          [m.f, m.t] = [m.t, m.f];
          m.k = 1 - m.k;
        }
        m.kmax = 1; m.halted = false; m.path = [...b.rt]; m.stop = b.rt.stop || null;
        delete m.embark; m.coastK = null; m.embState = null;
        if (m.f.o0 !== 'SEA' && m.t.o0 === 'SEA' && u.slice(0, 8).some(x => x > 0) && !m.airHop) {
          m.coastK = EF.getCoastK(m.f, m.t);
          m.embState = 'marching';
        }
      }
    };
  };

  EF.orderArmy = function (m, t, appendWp) {
    const G = EF.G;
    if (m.fight) { if (m.o === G.me) EF.log('The army is engaged in battle.'); return false; }
    if (appendWp) {
      m.waypoints = m.waypoints || [];
      const wp = t.edge ? { edge: { ...t.edge, x: t.x, y: t.y } } : { id: t.id };
      m.waypoints.push(wp);
      if (m.o === G.me) EF.log(`Waypoint #${m.waypoints.length} added.`);
      if (!m.halted) return true;
      // If halted, start moving toward first waypoint
      const first = m.waypoints.shift();
      t = first.edge ? EF.mkDest(first.edge) : EF.P[first.id];
    } else {
      m.waypoints = [];
    }
    const pl = EF.planArmy(m, t);
    if (!pl) { if (m.o === G.me) EF.log('No route to that destination.'); return false; }
    pl.apply();
    return true;
  };

  EF.splitArmy = function (m, u) {
    if (m.fight) return null;
    u = u.map((x, j) => Math.max(0, Math.min(x, m.u[j])));
    const n = EF.tot(u);
    if (!n || n >= EF.tot(m.u)) return null;
    m.u = m.u.map((x, j) => x - u[j]);
    m.s = EF.spd(m.u, m.o);
    const a = {
      id: ++EF.m_id_seq, f: m.f, t: m.t, u, o: m.o, k: m.k, d: m.d,
      s: EF.spd(u, m.o), halted: true, path: [], waypoints: [], stop: null, kmax: 1,
      hp: m.hp, mo: m.mo, autoFire: true, forced: false,
      embark: m.embark ? { ...m.embark } : null,
      coastK: m.coastK ?? null,
      embState: m.embState || null
    };
    EF.M.push(a);
    return a;
  };

  EF.armyDist = (a, b) => {
    const p = EF.armyPos(a), q = EF.armyPos(b);
    return Math.hypot(p.x - q.x, p.y - q.y);
  };

  EF.mergeInto = function (m, q) {
    const a = EF.tot(m.u), b = EF.tot(q.u), nn = (a + b) || 1;
    m.hp = (m.hp * a + q.hp * b) / nn;
    m.mo = (m.mo * a + q.mo * b) / nn;
    m.u = m.u.map((x, j) => x + q.u[j]);
    const i = EF.M.indexOf(q);
    if (i >= 0) EF.M.splice(i, 1);
    EF.G.ma.delete(q.id);
    m.s = EF.spd(m.u, m.o);
  };

  EF.mergeNear = function (m, r) {
    let c = 0;
    EF.M.slice().forEach(q => {
      if (q === m || q.o !== m.o || q.fight || m.fight || EF.armyDist(q, m) > r) return;
      EF.mergeInto(m, q); c++;
    });
    return c;
  };

  // Visibility per nation (used by both player Fog-of-War and AI auto-fire/targeting)
  EF.visOf = function (o) {
    const G = EF.G, v = new Set();
    const f = q => { v.add(q.id); q.adj.forEach(a => v.add(a)); };
    EF.SD.forEach(q => {
      if (q.o === o || (EF.R[o] && EF.R[o][q.o] === 'ally') || EF.tot(EF.stk(q, o)) > 0) f(q);
    });
    EF.M.forEach(m => {
      if (m.o === o || (EF.R[o] && EF.R[o][m.o] === 'ally')) {
        v.add(m.f.id); v.add(m.t.id);
      }
    });
    // Airplane & Aerodrome 190px recon radius (parity with PRANGE!)
    EF.SD.forEach(q => {
      const u = q.o === o ? q.u : q.al[o];
      if (u && u[7] > 0) {
        const rad = (q.aero || 0) >= 2 ? EF.PRANGE2 : EF.PRANGE;
        EF.SD.forEach(r => { if (EF.dist(q, r) <= rad) v.add(r.id); });
      }
    });
    EF.M.forEach(m => {
      if (m.o === o && m.u[7] > 0) {
        const q2 = EF.armyPos(m);
        EF.SD.forEach(r => { if (Math.hypot(r.x - q2.x, r.y - q2.y) <= EF.PRANGE) v.add(r.id); });
      }
    });
    // Intelligence spy reveals for player
    if (o === G.me && G.intel) {
      Object.entries(G.intel).forEach(([pid, exp]) => { if (exp > G.t) v.add(pid); });
    }
    return v;
  };

  EF.calcVis = function () {
    const G = EF.G, v = EF.visOf(G.me);
    const k = [...v].sort().join();
    if (k !== G.vs) { G.vs = k; G.dirty = 1; }
    G.vis = v;
  };

  EF.isSubStealth = function (m, viewer) {
    const G = EF.G;
    if (m.o === viewer || (EF.R[viewer] && EF.R[viewer][m.o] === 'ally')) return false;
    const isSubOnly = m.u[8] > 0 && m.u.every((x, j) => j === 8 || x === 0);
    if (!isSubOnly || m.fight) return false;
    const pos = EF.armyPos(m);
    // Revealed if inside viewer's Airplane/Aerodrome recon or fighting
    const spottedByAir = EF.SD.some(q => {
      const u = q.o === viewer ? q.u : q.al[viewer];
      return u && u[7] > 0 && Math.hypot(q.x - pos.x, q.y - pos.y) <= ((q.aero || 0) >= 2 ? EF.PRANGE2 : EF.PRANGE);
    }) || EF.M.some(a => a.o === viewer && a.u[7] > 0 && Math.hypot(EF.armyPos(a).x - pos.x, EF.armyPos(a).y - pos.y) <= EF.PRANGE);
    return !spottedByAir;
  };

  EF.seen = m => {
    const G = EF.G;
    if (m.o === G.me || (EF.R[G.me] && EF.R[G.me][m.o] === 'ally')) return true;
    if (EF.isSubStealth(m, G.me)) return false;
    return G.vis.has(m.f.id) || G.vis.has(m.t.id);
  };

  EF.expel = function () {
    EF.SD.forEach(p => {
      Object.keys(p.al).forEach(o => {
        if (!EF.tot(p.al[o]) || ['ally', 'pact'].includes(EF.R[p.o][o])) return;
        const u = p.al[o];
        if (p.o0 === 'SEA') {
          // If war breaks out in a shared sea zone, convert into an attacking naval/sea battle or push out
          if (EF.hostile(p.o, o) && EF.tot(p.u) > 0) {
            EF.BT.push({
              id: ++EF.bt_id, kind: 'prov', p, ao: o, au: u.slice(),
              ah: EF.SH(p, o).hp, am: EF.SH(p, o).mo, lead: null,
              nt: EF.G.t + 0.4, rounds: 0, contrib: { [o]: EF.pwr(u) },
              losses: { [o]: 0 }, stacks: { [o]: { u: u.slice(), hp: EF.SH(p, o).hp, mo: EF.SH(p, o).mo } }
            });
            p.al[o] = new Array(EF.U_LEN).fill(0);
          }
          return;
        }
        // Expelling from land: Ships go only to friendly coastal provinces (or adjacent sea), land units go to nearest friendly land
        const cands = EF.SD.filter(q => q.o === o && q.o0 !== 'SEA' && (!EF.isPureNavy(u) || q.coastal));
        const h = cands.sort((a, b) => EF.dist(a, p) - EF.dist(b, p))[0];
        if (h) EF.addTo(h, o, u, EF.SH(p, o).hp, EF.SH(p, o).mo);
        p.al[o] = new Array(EF.U_LEN).fill(0);
      });
    });
  };

  EF.set = function (a, b, s) {
    EF.R[a][b] = EF.R[b][a] = s;
    if (EF.G) { EF.G.dh = ''; EF.expel(); }
  };

  EF.war = function (a, b) {
    const G = EF.G, R = EF.R;
    if (R[a][b] === 'war') return;
    const before = EF.NS.filter(c => R[G.me][c] === 'war');
    EF.set(a, b, 'war');
    // Mutual automatic trade embargo on war
    G.embargoes[a] = G.embargoes[a] || {}; G.embargoes[a][b] = true;
    G.embargoes[b] = G.embargoes[b] || {}; G.embargoes[b][a] = true;

    Object.keys(EF.NATIONS).forEach(c => {
      if (c === 'NE' || c === 'SEA' || c === a || c === b) return;
      if (R[c][b] === 'ally' && R[c][a] !== 'ally' && R[c][a] !== 'war') EF.set(c, a, 'war');
      if (R[c][a] === 'ally' && R[c][b] !== 'ally' && R[c][b] !== 'war') EF.set(c, b, 'war');
    });
    if (a === G.me || b === G.me) EF.log(`${EF.NATIONS[a][0]} declares war on ${EF.NATIONS[b][0]}.`);
    EF.addNews('war', `${EF.NATIONS[a][0]} Declares War on ${EF.NATIONS[b][0]}!`,
      `Diplomatic ties severed and trade embargoes enacted as armies mobilize along the frontier.`, [a, b]);
    if (a !== G.me) {
      const nw = EF.NS.filter(c => c !== G.me && R[G.me][c] === 'war' && !before.includes(c));
      if (nw.length && EF.warAlert) EF.warAlert(nw, a, b);
    }
  };

  // Fixed Bombardment Damage (no immortal 1-infantry respawn, fractional HP attrition against armor/ships)
  EF.applyDmg = function (t, dmg) {
    let rem = dmg;
    for (let i = 0; i < EF.U_LEN && rem > 0; i++) {
      if (t.u[i] > 0) {
        const effDef = EF.T[i][3] + (t.walls || 0) * 0.5;
        let loss = Math.min(t.u[i], Math.floor(rem / effDef));
        if (loss === 0 && rem >= effDef * 0.55) loss = 1;
        t.u[i] -= loss;
        rem -= loss * effDef;
      }
    }
    if (rem > 0 && EF.tot(t.u) > 0) {
      t.hp = Math.max(0.15, t.hp - Math.min(0.18, rem * 0.025));
      if (t.hp <= 0.2) {
        const idx = t.u.findIndex(x => x > 0);
        if (idx >= 0) { t.u[idx]--; t.hp = 0.65; }
      }
    }
  };

  // Fixed fireTargets: works for ANY nation (AI + Player), targets both land provinces & fleets in sea zones!
  EF.fireTargets = function (src, army, owner) {
    const o = owner || src.o;
    const u = src.u, rg = EF.RNG(u, army ? null : src);
    if (!rg) return [];
    const vis = o === EF.G.me ? EF.G.vis : EF.visOf(o);
    const sp = army ? EF.armyPos(src) : src, out = [];

    EF.SD.forEach(q => {
      if (q === src || !EF.hostile(o, q.o) || !vis.has(q.id)) return;
      if (q.o0 === 'SEA' && !EF.tot(q.u)) return; // Don't shell empty sea nodes
      if (q.o0 !== 'SEA' && !EF.tot(q.u) && q.walls === 0) return;
      const d = Math.hypot(q.x - sp.x, q.y - sp.y);
      if (d <= rg) out.push({ v: 'p:' + q.id, n: q.n + (q.o0 === 'SEA' ? ' (Fleet)' : ''), d });
    });

    EF.M.forEach(m => {
      if (m === src || !EF.hostile(o, m.o)) return;
      if (EF.isSubStealth(m, o)) return;
      const visible = o === EF.G.me ? EF.seen(m) : (vis.has(m.f.id) || vis.has(m.t.id));
      if (!visible) return;
      const q = EF.armyPos(m);
      const d = Math.hypot(q.x - sp.x, q.y - sp.y);
      if (d <= rg) out.push({ v: 'a:' + m.id, n: `Army of ${EF.NATIONS[m.o][0]} (${EF.tot(m.u)})`, d });
    });
    return out.sort((a, b) => a.d - b.d);
  };

  EF.defU = q => q.u.map((x, j) => x + Object.entries(q.al).reduce((a, [o, b]) => a + (EF.R[q.o][o] === 'ally' ? b[j] : 0), 0));
  EF.sumU = a => a.reduce((s, u) => s.map((v, j) => v + u[j]), new Array(EF.U_LEN).fill(0));

  function frontComp(u, vs, d, fw) {
    const s = EF.tot(vs) || 1;
    const v = u.map((n, k) => [EF.T[k][d ? 3 : 2] * (1 + 0.5 * (vs[EF.B[k]] || 0) / s), n, k]).sort((x, y) => y[0] - x[0]);
    const fl = new Array(EF.U_LEN).fill(0);
    let left = fw;
    for (const [, n, k] of v) {
      const c = Math.min(n, left);
      fl[k] = c; left -= c;
      if (left <= 0) break;
    }
    return fl;
  }

  function casualties(stacks, fl, cas) {
    let killed = 0;
    for (let c = 0; c < cas; c++) {
      const tf = EF.tot(fl);
      if (!tf) break;
      let r = Math.random() * tf, k = 0;
      while (k < EF.U_LEN - 1 && r >= fl[k]) { r -= fl[k]; k++; }
      fl[k]--;
      const cand = stacks.filter(s => s[k] > 0);
      if (cand.length) {
        cand[(Math.random() * cand.length) | 0][k]--;
        killed++;
      }
    }
    return killed;
  }

  const lossF = (a, b) => Math.min(0.42, Math.max(0.03, 0.13 * Math.pow(a / b, 0.8)));

  function addCas(o, n) {
    const G = EF.G;
    if (!G.cas) G.cas = {};
    G.cas[o] = (G.cas[o] || 0) + n;
  }

  function loseAtt(b) {
    const t = b.p, i = EF.BT.indexOf(b);
    if (i >= 0) EF.BT.splice(i, 1);
    if (b.reb) {
      t.st = Math.min(1, t.st + 0.12);
      if (t.o === EF.G.me) EF.log(`The garrison crushed the uprising in ${t.n}.`);
    } else if (b.ao === EF.G.me || t.o === EF.G.me) {
      EF.log(`${EF.NATIONS[b.ao][0]} attack on ${t.n} repelled after ${b.rounds} rounds.`);
    }
  }

  function takeProv(b) {
    const G = EF.G, t = b.p, old = t.o, sea = t.o0 === 'SEA';
    const i = EF.BT.indexOf(b);
    if (i >= 0) EF.BT.splice(i, 1);
    const allies = Object.keys(b.contrib || { [b.ao]: 1 });
    let winner = b.ao;
    if (allies.includes(t.o0)) winner = t.o0;
    else if (b.contrib) {
      let bs = -1;
      allies.forEach(o => {
        const sc = (b.contrib[o] || 0) + ((b.losses && b.losses[o]) || 0) * 1.5;
        if (sc > bs) { bs = sc; winner = o; }
      });
    }
    const no = winner;
    if (sea) {
      Object.keys(t.al).forEach(k => { if (EF.R[old][k] === 'ally') { delete t.al[k]; delete t.alq[k]; } });
    } else {
      t.al = {}; t.alq = {};
    }

    // Preserve each allied nation's own surviving troops!
    if (b.stacks && Object.keys(b.stacks).length > 1) {
      const winStack = b.stacks[no];
      t.u = winStack ? winStack.u.slice() : new Array(EF.U_LEN).fill(0);
      t.hp = winStack ? winStack.hp : b.ah;
      t.mo = winStack ? winStack.mo : b.am;
      Object.entries(b.stacks).forEach(([allyO, st]) => {
        if (allyO !== no && EF.tot(st.u) > 0) {
          EF.addTo(t, allyO, st.u, st.hp, st.mo);
        }
      });
    } else {
      t.u = b.au.slice();
      t.hp = b.ah; t.mo = b.am;
    }

    EF.setProvOwner(t, no);
    t.bt = null; t.cons = null; G.dirty = 1; G.dh = '';
    if (!sea) {
      t.st = b.reb ? 0.5 : (t.o0 === no ? 0.55 : 0.18);
      t.walls = 0;
      t.ind = Math.max(0, t.ind - 1);
      t.port = Math.max(0, (t.port || 0) - 1);
      t.aero = Math.max(0, (t.aero || 0) - 1);
      t.q = [];
      t.bar = Math.max(0, t.bar - 1);
    }
    EF.fxAdd('capture', t.x, t.y, EF.NATIONS[no][1]);

    if (old === G.me && t.cap && !sea && EF.showAlert) {
      EF.showAlert({ k: 'loss', kicker: 'Disaster', title: `${t.n} has fallen!`, sub: `${EF.NATIONS[no][0]} has captured your capital.`, rows: [no], front: null });
    }
    if (!sea && (t.cap || b.rounds >= 4)) {
      const totalLost = Object.values(b.losses || {}).reduce((s, x) => s + x, 0) + (b.defLosses || 0);
      EF.addNews(
        'battle',
        t.cap ? `Capital Fall: ${EF.NATIONS[no][0]} Captures ${t.n}!` : `${t.n} Falls to ${EF.NATIONS[no][0]}`,
        `${EF.NATIONS[no][0]} forces secured ${t.n} from ${EF.NATIONS[old][0]} after ${b.rounds} rounds of fighting (~${(totalLost * 1000).toLocaleString()} total casualties).`,
        [no, old]
      );
    }
    if ((no === G.me || old === G.me) && !sea) {
      EF.log(b.reb ? `${t.n} has been lost to rebels.` : `${t.n} falls to ${EF.NATIONS[no][0]} after ${b.rounds} rounds.`);
    }
    if (b.lead && (b.lead.path.length || b.lead.stop)) {
      const u = t.u.slice(), f = u.findIndex(x => x > 0);
      if (f >= 0 && EF.tot(u) > 1) { u[f]--; EF.cont(b.lead, t, u); }
    }
  }

  function endField(b) {
    const G = EF.G;
    [b.m1, b.m2].forEach(m => {
      if (!EF.M.includes(m)) return;
      if (!EF.tot(m.u)) {
        EF.M.splice(EF.M.indexOf(m), 1);
        if (G.sel_m === m.id) G.sel_m = null;
        G.ma.delete(m.id);
      } else {
        m.fight = null;
        m.halted = !m.resume;
      }
    });
    const i = EF.BT.indexOf(b);
    if (i >= 0) EF.BT.splice(i, 1);
    if (b.m1.o === G.me || b.m2.o === G.me) {
      const w = EF.tot(b.m1.u) ? b.m1 : EF.tot(b.m2.u) ? b.m2 : null;
      EF.log(w ? `${EF.NATIONS[w.o][0]} wins the field battle after ${b.rounds} rounds.` : 'Both armies were wiped out.');
    }
  }

  function startField(m1, m2) {
    const b = { id: ++EF.bt_id, kind: 'field', m1, m2, nt: EF.G.t + RND * 0.4, rounds: 0 };
    m1.resume = !m1.halted; m2.resume = !m2.halted;
    m1.halted = m2.halted = true;
    m1.fight = m2.fight = b.id;
    EF.BT.push(b);
    const a = EF.armyPos(m1), c = EF.armyPos(m2);
    EF.fxAdd('clash', (a.x + c.x) / 2, (a.y + c.y) / 2);
    if (m1.o === EF.G.me || m2.o === EF.G.me) EF.log('Armies clash in the field!');
  }

  function round(b) {
    const G = EF.G;
    if (b.kind === 'prov') {
      const t = b.p;
      if (t.o === b.ao || ['ally', 'pact'].includes(EF.R[t.o][b.ao])) {
        EF.addTo(t, b.ao, b.au, b.ah, b.am);
        const i = EF.BT.indexOf(b);
        if (i >= 0) EF.BT.splice(i, 1);
        return;
      }
      const du = EF.defU(t), dn = EF.tot(du), an = EF.tot(b.au);
      if (!an) { loseAtt(b); return; }
      if (!dn) { takeProv(b); return; }
      const seaZone = t.o0 === 'SEA', attCv = EF.isConvoy(b.au, seaZone), defCv = EF.isConvoy(du, seaZone);
      const bkw = Math.min(0.85, (b.au[3] * 0.5 + b.au[4] * 0.7 + b.au[5] + b.au[6] * 0.8) / an);
      const wf = 1 + 0.4 * (t.walls || 0) * (1 - bkw), fwD = 10 + 2 * (t.walls || 0);
      const oilPenaltyA = G.rs[b.ao] && G.rs[b.ao].o <= 0 ? 0.78 : 1;
      const oilPenaltyD = G.rs[t.o] && G.rs[t.o].o <= 0 ? 0.78 : 1;

      let A = Math.max(0.1, EF.pw(b.au, du, 0) * EF.eff(b.ah, b.am) * oilPenaltyA * rnd());
      let Dd = Math.max(0.1, EF.pw(du, b.au, 1, fwD) * wf * 1.2 * EF.eff(t.hp, t.mo) * oilPenaltyD * rnd());
      if (attCv) { A *= 0.25; Dd *= 2.5; }
      if (defCv) { Dd *= 0.25; A *= 2.5; }

      const fa = frontComp(b.au, du, 0, 12), fd = frontComp(du, b.au, 1, fwD);
      let ca = Math.max(1, Math.round(EF.tot(fa) * lossF(Dd, A)));
      let cd = Math.max(1, Math.round(EF.tot(fd) * lossF(A, Dd)));
      if (attCv) ca = Math.min(EF.tot(b.au), Math.round(ca * 2.5));
      if (defCv) cd = Math.min(EF.tot(du), Math.round(cd * 2.5));

      const attStacks = b.stacks ? Object.values(b.stacks).map(s => s.u) : [b.au];
      const killedA = casualties(attStacks, fa, ca);
      // Keep b.au synced with b.stacks
      if (b.stacks) {
        b.au = EF.sumU(Object.values(b.stacks).map(s => s.u));
      }
      const defStacks = [t.u, ...Object.entries(t.al).filter(([o]) => EF.R[t.o][o] === 'ally').map(([, a]) => a)];
      const killedD = casualties(defStacks, fd, cd);

      b.losses = b.losses || {};
      b.losses[b.ao] = (b.losses[b.ao] || 0) + killedA;
      b.defLosses = (b.defLosses || 0) + killedD;
      addCas(b.ao, killedA);
      addCas(t.o, killedD);

      const ra = Math.min(2, Dd / A), rd = Math.min(2, A / Dd);
      b.ah = Math.max(0.2, b.ah - 0.03 * ra);
      b.am = Math.max(0.05, Math.min(1, b.am - 0.035 * ra + 0.012));
      t.hp = Math.max(0.2, t.hp - 0.03 * rd);
      t.mo = Math.max(0.05, Math.min(1, t.mo - 0.035 * rd + 0.012));
      b.rounds++;
      EF.fxAdd('clash', t.x + (Math.random() - 0.5) * 16, t.y + (Math.random() - 0.5) * 12);
      t.hit = performance.now() + 5000;
      if (!EF.tot(b.au)) loseAtt(b);
      else if (!EF.tot(EF.defU(t))) takeProv(b);
    } else {
      const a = b.m1, c = b.m2;
      if (!EF.M.includes(a) || !EF.M.includes(c)) { endField(b); return; }
      const sea1 = a.f.o0 === 'SEA' || a.t.o0 === 'SEA', sea2 = c.f.o0 === 'SEA' || c.t.o0 === 'SEA';
      const cv1 = EF.isConvoy(a.u, sea1), cv2 = EF.isConvoy(c.u, sea2);
      let A = Math.max(0.1, EF.pw(a.u, c.u, 0) * EF.eff(a.hp, a.mo) * rnd());
      let C = Math.max(0.1, EF.pw(c.u, a.u, 0) * EF.eff(c.hp, c.mo) * rnd());
      if (cv1) { A *= 0.25; C *= 2.5; }
      if (cv2) { C *= 0.25; A *= 2.5; }
      const fa = frontComp(a.u, c.u, 0, 12), fc = frontComp(c.u, a.u, 0, 12);
      let ca = Math.max(1, Math.round(EF.tot(fa) * lossF(C, A)));
      let cc = Math.max(1, Math.round(EF.tot(fc) * lossF(A, C)));
      if (cv1) ca = Math.min(EF.tot(a.u), Math.round(ca * 2.5));
      if (cv2) cc = Math.min(EF.tot(c.u), Math.round(cc * 2.5));
      const ka = casualties([a.u], fa, ca);
      const kc = casualties([c.u], fc, cc);
      addCas(a.o, ka); addCas(c.o, kc);
      const ra = Math.min(2, C / A), rc = Math.min(2, A / C);
      a.hp = Math.max(0.2, a.hp - 0.03 * ra); a.mo = Math.max(0.05, Math.min(1, a.mo - 0.035 * ra + 0.012));
      c.hp = Math.max(0.2, c.hp - 0.03 * rc); c.mo = Math.max(0.05, Math.min(1, c.mo - 0.035 * rc + 0.012));
      b.rounds++;
      const pa = EF.armyPos(a), pc = EF.armyPos(c);
      EF.fxAdd('clash', (pa.x + pc.x) / 2 + (Math.random() - 0.5) * 10, (pa.y + pc.y) / 2 + (Math.random() - 0.5) * 8);
      if (!EF.tot(a.u) || !EF.tot(c.u)) endField(b);
    }
  }

  function arrive(m) {
    const G = EF.G, t = m.t, sea = t.o0 === 'SEA';
    const pa = EF.R[t.o] && ['ally', 'pact'].includes(EF.R[t.o][m.o]);
    const empty = sea && (t.o === 'SEA' || !EF.tot(EF.defU(t)));

    // Escorted amphibious landing: land troops storm hostile coast while naval escorts remain offshore in m.f!
    if (!sea && EF.hostile(m.o, t.o) && EF.hasNavy(m.u) && m.f.o0 === 'SEA') {
      const fleet = m.u.map((x, j) => (j === 8 || j === 9 ? x : 0));
      const land = m.u.map((x, j) => (j === 8 || j === 9 ? 0 : x));
      if (EF.tot(fleet) > 0) EF.addTo(m.f, m.o, fleet, m.hp, m.mo);
      m.u = land;
      if (!EF.tot(m.u)) return;
    }

    if (t.o === m.o || pa || empty || (sea && !EF.hostile(m.o, t.o))) {
      if (empty) t.o = m.o;
      EF.addTo(t, m.o, m.u, m.hp, m.mo);
      EF.cont(m, t, m.u);
      return;
    }
    if (!EF.hostile(m.o, t.o)) { EF.addTo(m.f, m.o, m.u, m.hp, m.mo); return; }

    const b = EF.BT.find(x => x.kind === 'prov' && x.p === t && (x.ao === m.o || (EF.R[x.ao] && EF.R[x.ao][m.o] === 'ally')));
    if (b) {
      const an = EF.tot(b.au), mn = EF.tot(m.u), nn = (an + mn) || 1;
      b.ah = (b.ah * an + m.hp * mn) / nn;
      b.am = (b.am * an + m.mo * mn) / nn;
      b.au = b.au.map((x, j) => x + m.u[j]);
      b.contrib = b.contrib || { [b.ao]: an };
      b.contrib[m.o] = (b.contrib[m.o] || 0) + EF.pwr(m.u);
      b.stacks = b.stacks || { [b.ao]: { u: b.au.slice(), hp: b.ah, mo: b.am } };
      if (!b.stacks[m.o]) b.stacks[m.o] = { u: m.u.slice(), hp: m.hp, mo: m.mo };
      else {
        const s = b.stacks[m.o], s0 = EF.tot(s.u), s1 = EF.tot(m.u), sn = (s0 + s1) || 1;
        s.hp = (s.hp * s0 + m.hp * s1) / sn;
        s.mo = (s.mo * s0 + m.mo * s1) / sn;
        s.u = s.u.map((x, j) => x + m.u[j]);
      }
      if (EF.pwr(m.u) > an * 0.7) b.lead = m;
    } else {
      EF.BT.push({
        id: ++EF.bt_id, kind: 'prov', p: t, ao: m.o,
        au: m.u.slice(), ah: m.hp, am: m.mo, lead: m,
        nt: G.t + RND * 0.5, rounds: 0,
        contrib: { [m.o]: EF.pwr(m.u) }, losses: { [m.o]: 0 },
        stacks: { [m.o]: { u: m.u.slice(), hp: m.hp, mo: m.mo } }
      });
      if (m.o === G.me || t.o === G.me) EF.log(`${m.o === G.me ? 'Your army attacks' : EF.NATIONS[m.o][0] + ' attacks'} ${t.n}.`);
    }
    EF.fxAdd('clash', t.x, t.y);
    t.hit = performance.now() + 6000;
  }

  function rebels(q) {
    const n = 2 + Math.round((0.3 - q.st) * 18 + q.v);
    const u = new Array(EF.U_LEN).fill(0); u[0] = n;
    EF.BT.push({
      id: ++EF.bt_id, kind: 'prov', p: q, ao: 'NE', au: u,
      ah: 0.8, am: 0.9, lead: null, nt: EF.G.t + RND * 0.5, rounds: 0, reb: 1
    });
    if (q.o === EF.G.me) EF.log(`Rebels rise up in ${q.n}!`);
    EF.addNews('revolt', `Armed Uprising in ${q.n}!`,
      `Disgruntled militias in ${q.n} have taken up arms against ${EF.NATIONS[q.o][0]} rule.`, [q.o]);
  }

  EF.propose = function (o, q, type) {
    const G = EF.G, R = EF.R;
    if (q === G.me) {
      if (R[o][q] === type || G.offers.some(x => x.from === o)) return;
      G.offers.push({ from: o, type, exp: G.t + 80 });
      G.dh = '';
      EF.log(`${EF.NATIONS[o][0]} proposes ${{ peace: 'a ceasefire', pact: 'a non-aggression pact', ally: 'an alliance' }[type]}.`);
      return;
    }
    const sh = EF.NS.some(e => e !== o && e !== q && R[o][e] === 'war' && R[q][e] === 'war');
    const ok = type === 'peace'
      ? EF.natpow(q) < 1.3 * EF.natpow(o) || Math.random() < 0.2
      : type === 'pact' ? (sh || Math.random() < 0.5) : (sh && Math.random() < 0.8);
    if (ok && R[o][q] !== type) EF.set(o, q, type);
  };

  EF.stats = function (o) {
    const my = EF.mine(o), a = new Array(EF.U_LEN).fill(0);
    EF.SD.forEach(p => { const u = p.o === o ? p.u : p.al[o]; if (u) u.forEach((x, j) => (a[j] += x)); });
    EF.M.forEach(m => { if (m.o === o) m.u.forEach((x, j) => (a[j] += x)); });
    const ind = my.reduce((t, p) => t + (p.ind || 0) + (p.inf || 0) + (p.aero || 0), 0);
    const pow = Math.round(EF.pwr(a));
    const ev = EF.G ? EF.econ(o) : { g: { p: EF.inc(o) * 1.5 } };
    return { prov: my.length, inc: ev.g.p, ind, a, pow, score: my.length * 10 + ind * 6 + pow };
  };

  EF.LAND = () => EF.SD.filter(p => p.o0 !== 'SEA').length;
  EF.need = () => Math.ceil(EF.LAND() * 0.6);
  EF.coal = () => EF.SD.filter(p => p.o0 !== 'SEA' && (p.o === EF.G.me || (EF.R[EF.G.me] && EF.R[EF.G.me][p.o] === 'ally'))).length;
  EF.ranks = () => EF.NS.filter(o => EF.mine(o).length).sort((x, y) => EF.stats(y).score - EF.stats(x).score);

  function vcCheck() {
    const G = EF.G, n = EF.mine(G.me).length, tl = EF.LAND();
    if (!n) { EF.end(0, 'You lost your last province.'); return; }
    if (G.vc === 'maj' && EF.coal() >= EF.need()) EF.end(1, 'Your coalition controls 60% of Europe.');
    else if (G.vc === 'dom' && n >= EF.need()) EF.end(1, 'You dominate Europe on your own.');
    else if (G.vc === 'tot' && n >= tl) EF.end(1, 'Total conquest: every province is yours.');
  }

  EF.tick = function (dt) {
    const G = EF.G;
    if (!G || G.over || !G.sp) return;
    dt *= G.sp * EF.BASE;
    G.t += dt;
    const dayDt = dt / EF.DAY_T;

    // Daily rollover: Spies + Newspaper Surveys + Expired Market Orders
    const curDay = EF.dayNum(G.t);
    if (curDay > (G.lastDay ?? -1)) {
      G.lastDay = curDay;
      if (curDay > 0) {
        if (EF.resolveDailySpies) EF.resolveDailySpies();
        if (curDay % 4 === 0 && curDay !== G.lastSurveyDay) {
          G.lastSurveyDay = curDay;
          if (EF.publishDailySurvey) EF.publishDailySurvey(curDay);
        }
      }
      if (G.mktOrders) G.mktOrders = G.mktOrders.filter(x => x.exp > G.t);
    }

    // Ranged Bombardment (AI & Player)
    const checkShoot = (s, army) => {
      const u = s.u, o = s.o, sp = army ? EF.armyPos(s) : s;
      const rg = EF.RNG(u, army ? null : s);
      if (!rg) return;
      let tp = null, tx = null, ty = null, targetId = null;
      if (s.bt) {
        if (s.bt.k === 'p') {
          const q = EF.P[s.bt.id];
          if (q && EF.hostile(o, q.o) && (q.o0 !== 'SEA' || EF.tot(q.u) > 0)) {
            if (Math.hypot(q.x - sp.x, q.y - sp.y) <= rg) { tp = q; tx = q.x; ty = q.y; targetId = q.id; }
          }
        } else {
          const m = EF.M.find(a => String(a.id) === s.bt.id);
          if (m && EF.hostile(o, m.o) && !EF.isSubStealth(m, o)) {
            const q2 = EF.armyPos(m);
            if (Math.hypot(q2.x - sp.x, q2.y - sp.y) <= rg) { tx = q2.x; ty = q2.y; targetId = m.id; }
          }
        }
        if (tx == null && ty == null) s.bt = null;
      }
      if (tx == null && ty == null && s.autoFire !== false) {
        const tg = EF.fireTargets(s, army, o);
        if (tg.length) {
          const best = tg.find(t => t.v.startsWith('a:')) || tg[0];
          if (best.v.startsWith('p:')) {
            const q = EF.P[best.v.slice(2)];
            if (q) { tp = q; tx = q.x; ty = q.y; targetId = q.id; }
          } else {
            const m = EF.M.find(a => String(a.id) === best.v.slice(2));
            if (m) { const q2 = EF.armyPos(m); tx = q2.x; ty = q2.y; targetId = m.id; }
          }
        }
      }
      if (tx != null && ty != null) {
        const d = Math.hypot(tx - sp.x, ty - sp.y);
        const airRange = !army && (s.aero || 0) >= 2 ? EF.PRANGE2 : EF.PRANGE;
        const dmg =
          (d <= EF.ARANGE ? u[3] * 1.6 : 0) +
          (d <= EF.RRANGE ? u[6] * 2.6 : 0) +
          (!army && (s.aero || 0) >= 1 && d <= airRange ? u[7] * 1.2 : 0) +
          (d <= EF.SRANGE ? u[9] * 1.6 : 0);
        if (dmg > 0) {
          const reloadMul = !army && (s.aero || 0) >= 2 && u[7] > 0 ? 0.77 : 1;
          s.cd = G.t + EF.ACD * reloadMul;
          EF.BOMBS.push({
            f: { x: sp.x, y: sp.y, o }, t: { x: tx, y: ty },
            tp, a: tp ? null : targetId, st: G.t, et: G.t + 0.9, dmg,
            air: !army && u[7] > 0 && d > EF.ARANGE
          });
          EF.fxAdd('muzzle', sp.x, sp.y);
        }
      }
    };

    for (let i = 0; i < EF.SD.length; i++) {
      const p = EF.SD[i];
      if ((p.u[3] || p.u[6] || (p.aero >= 1 && p.u[7]) || (p.coastal && p.u[9]) || (p.o0 === 'SEA' && p.u[9])) && (p.cd || 0) <= G.t) {
        checkShoot(p, false);
      }
    }
    for (let i = 0; i < EF.M.length; i++) {
      const m = EF.M[i];
      if (m.halted && !m.fight && !m.embark && (m.u[3] || m.u[6] || m.u[9]) && (m.cd || 0) <= G.t) {
        checkShoot(m, true);
      }
    }

    // Resolve incoming shells
    for (let i = EF.BOMBS.length - 1; i >= 0; i--) {
      const b = EF.BOMBS[i];
      if (G.t >= b.et) {
        if (b.tp) {
          EF.applyDmg(b.tp, b.dmg);
          if (b.f.o === G.me || b.tp.o === G.me) EF.log(`Bombardment struck ${b.tp.n}!`);
        } else {
          const m = EF.M.find(a => String(a.id) === String(b.a));
          if (m) {
            let l = b.dmg;
            if (EF.isConvoy(m.u, m.f.o0 === 'SEA' || m.t.o0 === 'SEA')) l *= 2.5;
            m.u = m.u.map((x, j) => {
              const k = Math.min(x, Math.floor(l / EF.T[j][3]));
              l -= k * EF.T[j][3];
              return x - k;
            });
            if (l > 0 && EF.tot(m.u) > 0) {
              m.hp = Math.max(0.15, m.hp - Math.min(0.18, l * 0.025));
              if (m.hp <= 0.2) {
                const idx = m.u.findIndex(x => x > 0);
                if (idx >= 0) { m.u[idx]--; m.hp = 0.65; }
              }
            }
            if (!EF.tot(m.u)) {
              EF.M.splice(EF.M.indexOf(m), 1);
              if (G.sel_m === m.id) G.sel_m = null;
              G.ma.delete(m.id);
              if (b.f.o === G.me) EF.log('Bombardment destroyed an enemy army!');
            }
          }
        }
        EF.fxAdd('boom', b.t.x, b.t.y);
        if (b.tp) b.tp.hit = performance.now() + 9000;
        EF.BOMBS.splice(i, 1);
        G.dirty = 1;
      }
    }

    // Pending synchronized dispatches
    for (let i = G.pend.length - 1; i >= 0; i--) {
      const q = G.pend[i];
      if (G.t >= q.at) {
        G.pend.splice(i, 1);
        if (q.army != null) {
          const m = EF.M.find(a => a.id === q.army);
          if (m && !m.fight) EF.orderArmy(m, q.de ? EF.mkDest(q.de) : EF.P[q.to]);
        } else {
          const f = EF.P[q.from], sk = EF.stk(f, q.o), u = q.u.map((x, j) => Math.min(x, sk[j]));
          if (EF.tot(u)) EF.dispatch(f, u, q.o, q.rt);
        }
      }
    }

    // Construction completion
    EF.SD.forEach(q => {
      if (q.cons && G.t >= q.cons.end) {
        const c = q.cons; q.cons = null;
        if (c.k === 'wall') q.walls = c.n;
        else if (c.k === 'ind') q.ind = c.n;
        else if (c.k === 'bar') q.bar = c.n;
        else if (c.k === 'port') q.port = c.n;
        else if (c.k === 'aero') q.aero = c.n;
        else q.inf = c.n;
        G.dirty = 1;
        if (q.o === G.me) {
          const lbl = { wall: 'Fortress', ind: 'Industry', bar: 'Barracks', port: 'Naval Port', aero: 'Aerodrome' }[c.k] || ['', 'Road', 'Rail'][c.n];
          EF.log(`${lbl} completed in ${q.n}.`);
        }
      }
    });

    // Army movement, Embarkation & Forced March
    for (let i = EF.M.length - 1; i >= 0; i--) {
      const m = EF.M[i];
      if (m.embState === 'marching' && m.coastK != null && m.k >= m.coastK) {
        m.k = m.coastK; m.halted = true; m.embState = 'embarking'; m.coastK = null;
        const dur = (m.f.port >= 2) ? 1.8 : (m.f.port === 1) ? 3.2 : 7.5;
        m.embark = { end: G.t + dur, max: dur, port: m.f.port || 0 };
        if (m.o === G.me) EF.log(`Troops from ${m.f.n} began embarkation (${m.embark.port ? 'naval port' : 'beach'}).`);
        EF.fxAdd('water', EF.armyPos(m).x, EF.armyPos(m).y);
      }
      if (m.embark) {
        if (G.t < m.embark.end) { m.halted = true; continue; }
        else {
          delete m.embark; m.embState = 'done'; m.halted = false;
          if (m.o === G.me) EF.log(`Troops finished embarkation and set sail from ${m.f.n}!`);
        }
      }
      if (!m.halted) {
        const fmMul = m.forced ? 1.5 : 1;
        if (m.forced) {
          m.mo = Math.max(0.1, m.mo - 0.045 * dayDt);
          m.hp = Math.max(0.15, m.hp - 0.02 * dayDt);
          if (m.hp <= 0.2) {
            m.forced = false;
            if (m.o === G.me) EF.log('Forced march halted: troops exhausted!');
          }
        }
        m.s = EF.spd(m.u, m.o);
        const lm = m.airHop ? 1 : EF.legMul(m.o, m.f, m.t, m.u);
        m.k += dt * EF.SPD * m.s * fmMul * lm / m.d;
        if (m.k >= (m.kmax || 1)) {
          if ((m.kmax || 1) < 1) {
            m.k = m.kmax; m.halted = true; m.park = G.t; m.kmax = 1; m.path = []; m.stop = null;
            if (m.waypoints && m.waypoints.length) {
              const wp = m.waypoints.shift();
              const dest = wp.edge ? EF.mkDest(wp.edge) : EF.P[wp.id];
              if (dest) EF.orderArmy(m, dest, false);
            } else if (m.o === G.me) EF.log('Army in position.');
          } else {
            EF.M.splice(i, 1);
            arrive(m);
          }
        }
      }
    }

    // Field clashes on shared links
    for (let i = 0; i < EF.M.length; i++) {
      for (let j = i + 1; j < EF.M.length; j++) {
        const m1 = EF.M[i], m2 = EF.M[j];
        if (m1.fight || m2.fight || m1.airHop || m2.airHop || !EF.hostile(m1.o, m2.o)) continue;
        if ((m1.f.id === m2.t.id && m1.t.id === m2.f.id) || (m1.f.id === m2.f.id && m1.t.id === m2.t.id)) {
          const p1 = m1.f.id < m1.t.id ? m1.k : 1 - m1.k;
          const p2 = m2.f.id < m2.t.id ? m2.k : 1 - m2.k;
          if (Math.abs(p1 - p2) < 0.05) startField(m1, m2);
        }
      }
    }

    for (let i = EF.BT.length - 1; i >= 0; i--) {
      const b = EF.BT[i];
      if (b && G.t >= b.nt) { b.nt = G.t + RND; round(b); }
    }

    // Province ticks, production, healing & stability
    EF.SD.forEach(q => {
      if (q.o0 === 'SEA') {
        if (!EF.BT.some(b => b.p === q)) {
          q.hp = Math.min(1, q.hp + 0.015 * dayDt);
          q.mo = Math.min(1, q.mo + 0.025 * dayDt);
        }
        return;
      }
      if (q.o !== 'NE') EF.runQ(q);
      if (EF.BT.some(b => b.p === q)) return;
      const sh = G.shortages[q.o] || {};
      if (q.o !== 'NE' && !sh.f) {
        q.ap += dt * EF.autoRate(q);
        if (q.ap >= 1) {
          if (G.rs[q.o] && G.rs[q.o].f >= 1 && G.g[q.o] > 1) {
            q.ap -= 1;
            G.rs[q.o].f -= 1; // Single exact 1-Food cost per militia!
            const u = new Array(EF.U_LEN).fill(0); u[0] = 1;
            EF.addTo(q, q.o, u, 1, Math.max(0.6, q.st));
          } else q.ap = 1;
        }
      }
      const canRepair = !sh.s && !sh.w;
      if (canRepair) q.hp = Math.min(1, q.hp + 0.018 * dayDt * (1 + (q.ind || 0) * 0.5));
      if (!sh.f) q.mo = Math.min(1, q.mo + 0.03 * dayDt);
      const acBonus = 1 + Math.min(1.5, ((q.u[2] || 0) * 2 + EF.tot(q.u)) / 8);
      const stMul = sh.g ? -0.03 : (canRepair ? 0.008 * acBonus : 0.004 * acBonus);
      q.st = Math.max(0.1, Math.min(1, q.st + dayDt * stMul));
      Object.values(q.alq).forEach(h => {
        if (canRepair) h.hp = Math.min(1, h.hp + 0.01 * dayDt);
        if (!sh.f) h.mo = Math.min(1, h.mo + 0.018 * dayDt);
      });
      if (q.st < 0.3 && q.o !== 'NE' && Math.random() < dt * (0.3 - q.st) * 0.05) rebels(q);
    });

    EF.M.forEach(m => {
      if (m.fight || m.forced) return;
      const sh = G.shortages[m.o] || {};
      if (m.halted) {
        if (!sh.s && !sh.w) m.hp = Math.min(1, m.hp + 0.01 * dayDt);
        if (!sh.f) m.mo = Math.min(1, m.mo + 0.02 * dayDt);
      } else if (!sh.f) {
        m.mo = Math.min(1, m.mo + 0.006 * dayDt);
      }
    });

    if ((G.pht = (G.pht || 0) - dt) < 0) {
      G.pht = 1.5;
      EF.RK.forEach(r => {
        const a = G.ph[r] || (G.ph[r] = []);
        a.push(G.px[r]);
        if (a.length > 40) a.shift();
      });
    }

    if ((G.et = (G.et || 0) - dt) < 0) { G.et = 0.5; EF.refreshEco(); }

    // Nation economy integration (exact per-day rate * dayDt) & Shortage Penalties
    EF.NS.forEach(o => {
      const ev = EF.econ(o), rs = G.rs[o];
      G.g[o] = Math.max(0, G.g[o] + (ev.g.p - ev.g.c) * dayDt);
      EF.RK.forEach(r => { rs[r] = Math.max(0, rs[r] + (ev.R[r].p - ev.R[r].c) * dayDt); });
      const sh = (G.shortages[o] = EF.computeShortages(o));

      // Food shortage: decays morale on BOTH garrisons and field armies, and ONLY human troops (Infantry/Cavalry) desert
      if (sh.f && ev.n > 0) {
        EF.mine(o).forEach(q => { q.mo = Math.max(0.08, q.mo - 0.08 * dayDt); });
        EF.M.forEach(m => { if (m.o === o) m.mo = Math.max(0.08, m.mo - 0.08 * dayDt); });
        const desertRate = ev.n * 0.004 * dayDt;
        let nd = Math.floor(desertRate) + (Math.random() < desertRate % 1 ? 1 : 0);
        while (nd-- > 0) {
          const ps = EF.mine(o).filter(q => q.mo <= 0.25 && (q.u[0] > 1 || q.u[1] > 0));
          if (!ps.length) break;
          const q = ps[(Math.random() * ps.length) | 0];
          if (q.u[1] > 0) q.u[1]--;
          else if (q.u[0] > 1) q.u[0]--;
        }
      }
      if (o !== G.me && (G.at[o] -= dt) <= 0) {
        if (EF.ai) EF.ai(o);
        G.at[o] = EF.DF[G.df].per * (0.8 + Math.random() * 0.4);
      }
    });

    EF.RK.forEach(r => { G.px[r] += (EF.BP[r] - G.px[r]) * 0.03 * dt; });
    const no = G.offers.length;
    G.offers = G.offers.filter(x => G.t < x.exp);
    if (G.offers.length !== no) G.dh = '';
    if ((G.vt = (G.vt || 0) - dt) < 0) { G.vt = 0.4; EF.calcVis(); }
    vcCheck();
  };
})();
