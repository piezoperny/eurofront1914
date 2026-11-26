(function () {
  const EF = (window.EF = window.EF || {});

  EF.SPY_HIRE_COST = 30;
  EF.SPY_COST = { counter: 0.8, intel: 0.8, eco: 1.5, mil: 2.0 };
  EF.SPY_LABEL = {
    counter: 'Counter-Espionage',
    intel: 'Intelligence',
    eco: 'Economic Sabotage',
    mil: 'Military Sabotage'
  };

  EF.addNews = function (cat, title, body, nations = [], anonymous = false) {
    const G = EF.G;
    if (!G) return;
    if (!G.news) G.news = [];
    G.news.unshift({
      id: ++EF.news_id,
      day: EF.dayNum(G.t) + 1,
      dateStr: EF.dayStr(G.t),
      cat,
      title,
      body,
      nations: [...new Set(nations.filter(Boolean))],
      anonymous: !!anonymous
    });
    if (G.news.length > 60) G.news.length = 60;
  };

  EF.logSpy = function (msg) {
    const G = EF.G;
    if (!G) return;
    G.spyLog = G.spyLog || [];
    G.spyLog.unshift(`Day ${EF.dayNum(G.t) + 1}: ${msg}`);
    if (G.spyLog.length > 25) G.spyLog.length = 25;
  };

  EF.hireSpy = function (o, provId, mission) {
    const G = EF.G, p = EF.P[provId];
    if (!G || !p || p.o0 === 'SEA') return false;
    if (mission === 'counter' && p.o !== o) return false;
    if (mission !== 'counter' && p.o === o) return false;
    if (G.g[o] < EF.SPY_HIRE_COST) return false;
    if ((G.spies || []).filter(s => s.o === o).length >= 10) return false;
    G.g[o] -= EF.SPY_HIRE_COST;
    G.spies.push({ id: ++EF.spy_id, o, targetProv: provId, mission, hiredAt: G.t });
    if (o === G.me) EF.logSpy(`Operative deployed to ${p.n} (${EF.SPY_LABEL[mission]}).`);
    return true;
  };

  EF.reassignSpy = function (o, spyId, provId, mission) {
    const G = EF.G, s = (G.spies || []).find(x => x.id === spyId && x.o === o);
    const p = EF.P[provId];
    if (!s || !p || p.o0 === 'SEA') return false;
    if (mission === 'counter' && p.o !== o) return false;
    if (mission !== 'counter' && p.o === o) return false;
    s.targetProv = provId;
    s.mission = mission;
    if (o === G.me) EF.logSpy(`Operative reassigned to ${p.n} (${EF.SPY_LABEL[mission]}).`);
    return true;
  };

  EF.dismissSpy = function (o, spyId) {
    const G = EF.G;
    const idx = (G.spies || []).findIndex(x => x.id === spyId && x.o === o);
    if (idx < 0) return false;
    G.spies.splice(idx, 1);
    return true;
  };

  EF.resolveDailySpies = function () {
    const G = EF.G;
    if (!G || !G.spies || !G.spies.length) return;

    // Prune expired intelligence
    if (G.intel) {
      Object.keys(G.intel).forEach(pid => {
        if (G.intel[pid] <= G.t) delete G.intel[pid];
      });
    }

    // Group counter-spies by province
    const counterByProv = {};
    G.spies.forEach(s => {
      const p = EF.P[s.targetProv];
      if (!p) return;
      if (s.mission === 'counter' && p.o === s.o && G.g[s.o] > 0) {
        counterByProv[p.id] = (counterByProv[p.id] || 0) + 1;
      }
    });

    for (let i = G.spies.length - 1; i >= 0; i--) {
      const s = G.spies[i];
      if (s.mission === 'counter') continue;
      const p = EF.P[s.targetProv];
      if (!p || p.o === s.o || p.o === 'NE') continue;
      if (G.g[s.o] <= 0) {
        if (s.o === G.me) EF.logSpy(`Operative in ${p.n} paused (no gold for salary).`);
        continue;
      }

      const victim = p.o;
      const counters = counterByProv[p.id] || 0;
      const baseRisk = s.mission === 'intel' ? 0.08 : s.mission === 'eco' ? 0.16 : 0.22;
      const catchChance = Math.min(0.88, baseRisk + counters * 0.34);

      if (Math.random() < catchChance) {
        G.spies.splice(i, 1);
        EF.modRel(victim, s.o, -15);
        if (victim !== G.me && EF.DF[G.df].spy >= 0.35) {
          G.embargoes[victim] = G.embargoes[victim] || {};
          G.embargoes[victim][s.o] = true;
        }
        if (s.o === G.me) {
          EF.logSpy(`CRITICAL: Your spy in ${p.n} was captured and executed by ${EF.NATIONS[victim][0]}!`);
          EF.log(`Your spy in ${p.n} was captured!`);
        }
        if (victim === G.me) {
          EF.logSpy(`Counter-espionage in ${p.n} captured an agent of ${EF.NATIONS[s.o][0]}!`);
          EF.log(`Enemy spy from ${EF.NATIONS[s.o][0]} caught in ${p.n}!`);
        }
        EF.addNews(
          'espionage',
          `${EF.NATIONS[s.o][0]} Spy Ring Exposed in ${p.n}!`,
          `Security forces in ${p.n} apprehended an espionage operative working for ${EF.NATIONS[s.o][0]} during a ${EF.SPY_LABEL[s.mission].toLowerCase()} operation.`,
          [victim, s.o]
        );
        continue;
      }

      // Mission succeeds
      if (s.mission === 'intel') {
        if (s.o === G.me) {
          G.intel[p.id] = G.t + 3 * EF.DAY_T;
          const resSummary = EF.RK.map(r => `${EF.RNm[r]} ${Math.floor(G.rs[victim][r])}`).join(', ');
          EF.logSpy(`Intel from ${p.n} (${EF.NATIONS[victim][0]}): ${EF.tot(p.u)} troops, Stability ${Math.round(p.st * 100)}%, Treasury ${Math.floor(G.g[victim])}g (${resSummary}).`);
        }
      } else if (s.mission === 'eco') {
        const resLoss = Math.min(G.rs[victim][p.r], 6 + Math.floor(Math.random() * 8));
        const goldLoss = Math.min(G.g[victim], 10 + Math.floor(Math.random() * 14));
        G.rs[victim][p.r] -= resLoss;
        G.g[victim] -= goldLoss;
        p.st = Math.max(0.15, p.st - 0.14);
        G.dirty = 1;
        if (s.o === G.me) {
          EF.logSpy(`Economic sabotage in ${p.n}: destroyed ${Math.round(resLoss)} ${EF.RNm[p.r]}, ${Math.round(goldLoss)}g, stability -14%.`);
        }
        if (victim === G.me) {
          EF.log(`Sabotage in ${p.n}! Stockpiles raided and unrest rising.`);
        }
        EF.addNews(
          'espionage',
          `Economic Sabotage Reported in ${p.n}`,
          `Unidentified saboteurs struck supply depots and tax offices in ${p.n}, causing local unrest and material losses.`,
          [victim],
          true
        );
      } else if (s.mission === 'mil') {
        const blds = ['walls', 'inf', 'aero', 'port', 'ind'].filter(k => (p[k] || 0) > 0);
        let detail = '';
        if (blds.length && Math.random() < 0.7) {
          const bk = blds[(Math.random() * blds.length) | 0];
          p[bk] = Math.max(0, p[bk] - 1);
          const bName = { walls: 'Fortress', inf: 'Railway/Road', aero: 'Aerodrome', port: 'Naval Port', ind: 'Industry' }[bk];
          detail = `damaged ${bName} (-1 level)`;
        } else if (p.q && p.q.length && p.q[0].end != null) {
          p.q[0].end += 2 * EF.DAY_T;
          detail = 'delayed military production by 2 days';
        } else {
          p.mo = Math.max(0.25, p.mo - 0.18);
          detail = 'demoralized the local garrison (-18% morale)';
        }
        if (s.o === G.me) {
          G.intel[p.id] = G.t + 2 * EF.DAY_T;
          EF.logSpy(`Military sabotage in ${p.n}: ${detail}.`);
        }
        if (victim === G.me) {
          EF.log(`Military sabotage in ${p.n}: ${detail}!`);
        }
        G.dirty = 1;
        EF.addNews(
          'espionage',
          `Military Sabotage Strikes ${p.n}!`,
          `Explosions rocked military installations in ${p.n}; authorities report agents ${detail}.`,
          [victim],
          true
        );
      }
    }
  };

  EF.publishDailySurvey = function (day) {
    const G = EF.G;
    if (!G || !EF.stats) return;
    const list = EF.NS.filter(o => EF.mine(o).length > 0).map(o => ({ o, s: EF.stats(o) }));
    if (!list.length) return;
    const byPow = list.slice().sort((a, b) => b.s.pow - a.s.pow).slice(0, 3)
      .map((x, i) => `${i + 1}. ${EF.NATIONS[x.o][0]} (${x.s.pow} pwr)`).join(' · ');
    const byEco = list.slice().sort((a, b) => b.s.inc - a.s.inc).slice(0, 3)
      .map((x, i) => `${i + 1}. ${EF.NATIONS[x.o][0]} (${x.s.inc.toFixed(0)}g/d)`).join(' · ');
    EF.addNews(
      'survey',
      `Day ${day + 1} Intelligence Survey: Great Power Rankings`,
      `Mightiest Armies: ${byPow}. Wealthiest Empires: ${byEco}.`,
      list.slice(0, 3).map(x => x.o)
    );
  };

  EF.publishCommunique = function (o, title, body, anonymous, targetNation) {
    const G = EF.G;
    if (!title || !body) return false;
    const sender = anonymous ? 'Anonymous Source' : EF.NATIONS[o][0];
    EF.addNews(
      'communique',
      `${sender}: ${title.trim().slice(0, 72)}`,
      body.trim().slice(0, 320),
      anonymous ? (targetNation ? [targetNation] : []) : [o, targetNation].filter(Boolean),
      anonymous
    );
    if (!anonymous && targetNation && targetNation !== o) {
      EF.modRel(o, targetNation, -5);
    }
    return true;
  };
})();
