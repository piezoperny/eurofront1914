(function () {
  const EF = (window.EF = window.EF || {});

  EF.ai = function (o) {
    const G = EF.G, P = EF.P, R = EF.R;
    const D = EF.DF[G.df], my = EF.mine(o);
    if (!my.length) return;
    const rs = G.rs[o];
    const bst = (a, f) => a.reduce((x, y) => (!x || f(y) > f(x) ? y : x), null);
    const hn = p => p.adj.some(b => P[b].o0 !== 'SEA' && EF.hostile(o, P[b].o));
    const thr = p =>
      p.adj.reduce((s, b) => {
        const q = P[b];
        return s + (q.o0 !== 'SEA' && EF.hostile(o, q.o) ? EF.pwr(q.u) * 1.1 : 0);
      }, 0) +
      EF.M.reduce((s, m) => s + (m.t === p && EF.hostile(o, m.o) ? EF.pwr(m.u) : 0), 0);
    const front = my.filter(hn);

    // 1. Proactive AI Construction (including Aerodromes!)
    if (G.g[o] >= 35 && Math.random() > D.mis * 0.7) {
      const ip = bst(my.filter(p => p.ind < 2 && !hn(p)), p => (p.cap ? 6 : p.v) - p.ind * 2);
      if (ip && EF.canCons(o, ip, 'ind')) EF.startCons(o, ip, 'ind');

      const pp = bst(my.filter(p => p.coastal && p.port < 2), p => (p.cap ? 5 : p.v));
      if (pp && EF.canCons(o, pp, 'port')) EF.startCons(o, pp, 'port');

      const ap = bst(my.filter(p => p.aero < 2 && p.ind >= 1 && !hn(p)), p => (p.cap ? 5 : p.v));
      if (ap && EF.canCons(o, ap, 'aero')) EF.startCons(o, ap, 'aero');

      const wp = bst(front.filter(p => p.walls < 3), thr);
      if (wp && thr(wp) > EF.pwr(wp.u) * 0.4 && EF.canCons(o, wp, 'wall')) EF.startCons(o, wp, 'wall');

      const rp = bst(front.filter(p => p.inf < 2), p => p.v);
      if (rp && EF.canCons(o, rp, 'inf')) EF.startCons(o, rp, 'inf');

      const bp = bst(my.filter(x => x.bar < 2 && x.st > 0.5 && !hn(x)), x => x.v);
      if (bp && rs.f > 25 && G.g[o] > 60 && EF.canCons(o, bp, 'bar')) EF.startCons(o, bp, 'bar');
    }

    // 2. Stock Market Order Board + Neutral Merchant Trading
    const NEEDR = { f: 45, s: 38, o: 32, c: 32, w: 32 };
    EF.RK.forEach(r => {
      const have = rs[r], want = NEEDR[r];
      if (have < want * 0.5 && G.g[o] > 30) {
        // First try filling cheap non-embargoed sell orders
        const sellOrd = (G.mktOrders || [])
          .filter(x => x.r === r && x.side === 'sell' && x.o !== o && !EF.isEmbargoed(o, x.o) && x.px <= G.px[r] * 1.15)
          .sort((a, b) => a.px - b.px)[0];
        if (sellOrd) {
          EF.fillOrder(o, sellOrd.id, Math.min(sellOrd.qty, Math.floor(G.g[o] / sellOrd.px), 15));
        } else if (G.px[r] < EF.BP[r] * 2.2 && G.g[o] > 40 + G.px[r] * 6) {
          EF.trade(o, r, Math.min(12, Math.ceil((want - have) / 2)));
        }
      } else if (have > want * 2.1) {
        if (Math.random() < 0.45 && G.mktOrders.length < 18) {
          EF.postOrder(o, r, 'sell', Math.min(20, Math.floor((have - want * 1.5) / 2)), Math.max(1.5, G.px[r] * 0.92));
        } else if (G.px[r] > EF.BP[r] * 0.65) {
          EF.trade(o, r, -Math.min(20, Math.ceil((have - want * 1.8) / 3)));
        }
      }
    });

    // 3. Smart Recruitment across all 10 units
    const pool = (front.length ? front : my).slice().sort((a, b) => thr(b) - thr(a));
    for (let i = 0; i < 6; i++) {
      const ip2 = my.filter(q => q.ind > 0 || q.aero > 0);
      const src = (i % 2 && ip2.length) ? ip2 : pool;
      const p = src[Math.min(i % 3, src.length - 1)];
      if (!p || p.q.length >= EF.slotsOf(p) + 2) continue;
      if (rs.f < 6) break;
      const ok = EF.T.map((_, k) => k).filter(k => EF.canRecruit(o, p, k));
      if (!ok.length) continue;
      const bag = [];
      ok.forEach(k => {
        // 0:Inf, 1:Cav, 2:ArmCar, 3:Art, 4:LTank, 5:HTank, 6:Railgun, 7:Plane, 8:Sub, 9:Battleship
        let w = [2, 2, 3, 4, 4, 4, 3, 4, 3, 3][k];
        if (p.ind >= 2 && (k === 5 || k === 6 || k === 7)) w += 3;
        if (p.aero >= 1 && k === 7) w += 3;
        if (p.coastal && p.port >= 1 && (k === 8 || k === 9)) w += 3;
        for (let n = 0; n < w; n++) bag.push(k);
      });
      const k = bag[(Math.random() * bag.length) | 0];
      EF.queueU(o, p, k);
    }

    // 4. Naval patrol & shore bombardment
    my.forEach(p => {
      if (p.coastal && (p.u[8] + p.u[9]) > 1 && Math.random() < 0.35) {
        const sq = p.adj.map(a => P[a]).filter(q => q.o0 === 'SEA' && q.adj.some(a => P[a].o0 !== 'SEA' && EF.hostile(o, P[a].o)));
        if (sq.length) {
          const u = new Array(EF.U_LEN).fill(0);
          u[8] = p.u[8]; u[9] = Math.max(0, p.u[9] - 1);
          if (EF.tot(u) > 0) EF.send(p, sq[(Math.random() * sq.length) | 0], u, o);
        }
      }
    });

    // 5. Frontline attacks & reinforcements
    const sendable = p => {
      const f = Math.max(0.25, Math.min(1, 1 - thr(p) * 0.7 / (EF.pwr(p.u) + 1)));
      const u = p.u.map((x, j) => (j === 7 || j === 8 || j === 9 ? 0 : Math.floor(x * f)));
      if (u[0] >= p.u[0] && p.u[0] > 0) u[0]--;
      return u;
    };

    const tg = {};
    front.forEach(p => p.adj.forEach(b => {
      if (P[b].o0 !== 'SEA' && EF.hostile(o, P[b].o)) (tg[b] = tg[b] || []).push(p);
    }));
    Object.entries(tg).map(([b, srcs]) => {
      const q = P[b], su = srcs.map(sendable);
      const ae = srcs.reduce((s2, w) => s2 + EF.eff(w.hp, w.mo), 0) / srcs.length;
      const ap = EF.pw(EF.sumU(su), EF.defU(q), 0) * 0.9 * ae;
      const dp = EF.pw(EF.defU(q), EF.sumU(su), 1, 10 + 2 * q.walls) * (1 + 0.25 * q.walls) * 1.2 * EF.eff(q.hp, q.mo) + 1;
      return { q, srcs, su, r: ap / dp };
    })
      .filter(x => x.r > D.thr && Math.random() > D.mis)
      .sort((a, b) => b.r * b.q.v - a.r * a.q.v)
      .slice(0, 2)
      .forEach(x => {
        const es = x.srcs.map((q, i) => EF.etaG([q, x.q], x.su[i], o)), mx = Math.max(...es);
        x.srcs.forEach((q, i) => {
          const u = x.su[i]; if (!EF.tot(u)) return;
          const d = mx - es[i];
          if (d > 0.5) G.pend.push({ at: G.t + d, from: q.id, u, o, rt: [x.q.id] });
          else EF.send(q, x.q, u, o);
        });
      });

    const fp = bst(front, p => thr(p) - EF.pwr(p.u));
    if (fp && thr(fp) > EF.pwr(fp.u) * 0.5) {
      my.filter(p => !hn(p) && EF.tot(p.u) > 1 && Math.random() > D.mis).forEach(p => {
        const u = sendable(p);
        if (!EF.tot(u)) return;
        const rt = EF.route(p, fp, u, o);
        if (rt && rt.length) EF.dispatch(p, u, o, rt);
      });
    }

    if (G.g[o] > 150) {
      const q = bst(my.filter(x => x.st < 0.5), x => x.v);
      if (q) EF.restore(o, q);
    }

    // 6. Reposition idle field armies & artillery standoff
    EF.M.filter(m => m.o === o && m.halted && !m.fight).forEach(m => {
      const a = EF.armyPos(m);
      if (!m.bt && G.t - (m.park || 0) > 35) {
        const h = bst(my.filter(q => q.o0 !== 'SEA'), q => -EF.dist(q, a));
        if (h) EF.orderArmy(m, h);
      }
    });

    if (Math.random() > D.mis) {
      my.forEach(p => {
        if (p.u[3] < 2 || p.bt) return;
        const t = bst(EF.SD.filter(q => q.o0 !== 'SEA' && EF.hostile(o, q.o) && EF.dist(p, q) > EF.ARANGE * 0.95 && EF.dist(p, q) < EF.ARANGE * 1.9), q => -EF.dist(p, q));
        if (!t) return;
        const rt = EF.route(p, t, [0, 0, 0, 1, 0, 0, 0, 0, 0, 0], o);
        if (!rt || !rt.length) return;
        const n1 = P[rt[0]];
        if (n1.o0 === 'SEA' || !(n1.o === o || R[n1.o][o] === 'ally')) return;
        let bk = null, bv = 1e9;
        for (let kx = 0.2; kx <= 0.91; kx += 0.1) {
          const q2 = EF.epos(p.id, n1.id, kx), d2 = Math.hypot(q2.x - t.x, q2.y - t.y);
          if (d2 < bv) { bv = d2; bk = kx; }
        }
        if (bv > EF.ARANGE * 0.9) return;
        const u = new Array(EF.U_LEN).fill(0);
        u[0] = Math.min(3, Math.max(0, p.u[0] - 1));
        u[3] = p.u[3];
        EF.send(p, n1, u, o, [], null, bk);
      });
    }

    // 7. Escorted naval invasions
    if (Math.random() > D.mis) {
      EF.SD.filter(s2 => s2.o0 === 'SEA').forEach(s2 => {
        const lu = EF.stk(s2, o).map((x, j) => (j < 6 ? x : 0));
        if (!EF.tot(lu)) return;
        const best = bst(s2.adj.map(id => P[id]).filter(q => q.o0 !== 'SEA' && EF.hostile(o, q.o)), q => EF.pwr(lu) * 0.9 / (EF.pwr(EF.defU(q)) * 1.25 + 1));
        if (best && EF.pwr(lu) * 0.9 / (EF.pwr(EF.defU(best)) * 1.25 + 1) > D.thr * 0.85) EF.send(s2, best, lu, o);
      });
      if (!EF.M.some(m => m.o === o && m.u[9] > 0 && !m.halted)) {
        const port = bst(my.filter(q => q.coastal && q.u[9] >= 1), q => q.u[9]);
        if (port) {
          const gu = new Array(EF.U_LEN).fill(0);
          let room = Math.min(port.u[9] * 6, 14);
          [3, 5, 4, 2, 1, 0].forEach(k => {
            const c = Math.max(0, Math.min(port.u[k] - (k === 0 ? 1 : 0), room));
            gu[k] = c; room -= c;
          });
          if (EF.tot(gu) >= 3) {
            gu[9] = port.u[9];
            let pick = null;
            EF.SD.filter(q => q.o0 !== 'SEA' && q.coastal && EF.hostile(o, q.o) && !port.adj.includes(q.id)).forEach(q => {
              q.adj.map(id => P[id]).filter(w => w.o0 === 'SEA').forEach(w => {
                const rt = EF.route(port, w, gu, o);
                if (!rt) return;
                const r2 = EF.pwr(gu) * 0.9 / (EF.pwr(EF.defU(q)) * 1.25 + 1) / (1 + EF.etaG([port, ...rt.map(i => P[i])], gu, o) / 60);
                if (!pick || r2 > pick.r) pick = { q, w, rt, r: r2 };
              });
            });
            if (pick && pick.r > D.thr * 0.5) EF.dispatch(port, gu, o, pick.rt);
          }
        }
      }
    }

    // 8. Espionage (Counter-spies & Sabotage on Hard/Brutal)
    if (G.g[o] > 80 && Math.random() < D.spy && (G.spies || []).filter(s => s.o === o).length < 3) {
      const mySpies = (G.spies || []).filter(s => s.o === o);
      const cap = my.find(p => p.cap);
      if (cap && !mySpies.some(s => s.mission === 'counter')) {
        EF.hireSpy(o, cap.id, 'counter');
      } else {
        const foes = EF.NS.filter(e => e !== o && R[o][e] === 'war' && EF.mine(e).length);
        if (foes.length) {
          const tgtN = foes[(Math.random() * foes.length) | 0];
          const tgtP = EF.mine(tgtN)[0];
          if (tgtP) EF.hireSpy(o, tgtP.id, Math.random() < 0.5 ? 'eco' : 'mil');
        }
      }
    }

    // 9. Diplomacy
    const en = EF.NS.filter(q => q !== o && EF.mine(q).length && R[o][q] === 'war');
    if (Math.random() < D.dip) {
      const c = EF.NS.filter(q => q !== o && EF.mine(q).length), q = c[(Math.random() * c.length) | 0];
      if (q) {
        const st = R[o][q], a = EF.natpow(o), b = EF.natpow(q);
        const nb = my.some(p => p.adj.some(x => P[x].o === q)), sh = en.some(e => R[q][e] === 'war');
        if (st === 'war') { if (a < 0.7 * b || Math.random() < 0.06) EF.propose(o, q, 'peace'); }
        else if (st === 'peace') {
          if (sh && Math.random() < 0.7) EF.propose(o, q, 'ally');
          else if (nb && (en.length || a < 1.6 * b) && Math.random() < 0.7) EF.propose(o, q, 'pact');
          else if (nb && !en.length && a > D.thr * 1.3 * b && Math.random() < D.war) EF.war(o, q);
        } else if (st === 'pact' && nb && !en.length && a > 2.5 * b && Math.random() < D.betray) {
          EF.set(o, q, 'peace'); EF.war(o, q);
          if (q === G.me) EF.log(`${EF.NATIONS[o][0]} betrays your pact!`);
        }
      }
    }
  };
})();
