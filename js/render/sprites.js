(function () {
  const EF = (window.EF = window.EF || {});

  // 10 WWI side-profile unit silhouettes
  const ICO = [
    // 0: Infantry
    g => {
      g.beginPath(); g.arc(-1, -5, 2.3, 0, 7); g.fill();
      g.fillRect(-3.5, -2.5, 5, 7.5);
      g.fillRect(-3.2, 5, 1.8, 3); g.fillRect(0.2, 5, 1.8, 3);
      g.beginPath(); g.moveTo(2, -1); g.lineTo(8, -5); g.stroke();
    },
    // 1: Cavalry
    g => {
      g.beginPath(); g.ellipse(-1, 1.5, 6.2, 3, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(3, 0); g.lineTo(6.5, -5.5); g.lineTo(9.5, -3.5); g.lineTo(6, 1); g.fill();
      g.beginPath(); g.arc(-1, -4.5, 2, 0, 7); g.fill();
      g.beginPath(); g.moveTo(-5, 4); g.lineTo(-6, 8); g.moveTo(3, 4); g.lineTo(4, 8); g.stroke();
    },
    // 2: Armored Car
    g => {
      g.beginPath(); g.roundRect(-8, -1, 16, 5.5, 2); g.fill();
      g.fillRect(-4, -4.5, 7, 3.8);
      g.fillRect(3, -3.5, 6, 1.4);
      g.fillStyle = '#0f172a';
      g.beginPath(); g.arc(-5, 5.5, 2.4, 0, 7); g.arc(5, 5.5, 2.4, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(-5, 5.5, 2.4, 0, 7); g.stroke();
      g.beginPath(); g.arc(5, 5.5, 2.4, 0, 7); g.stroke();
    },
    // 3: Artillery
    g => {
      g.beginPath(); g.arc(-2, 3.5, 3.8, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(-9, 6.5); g.lineTo(-2, 3.5); g.stroke();
      g.save(); g.rotate(-0.35); g.fillRect(-4, -2.5, 14, 3); g.restore();
    },
    // 4: Light Tank (FT-17 style)
    g => {
      g.beginPath(); g.roundRect(-9, 1, 18, 5.5, 2.8); g.fill();
      g.fillRect(-3.5, -3.5, 7, 4.8);
      g.fillRect(3.5, -2.2, 7.5, 1.8);
    },
    // 5: Heavy Tank (Rhomboid Mk IV style)
    g => {
      g.beginPath();
      g.moveTo(-10, 5.5); g.lineTo(-11.5, 0); g.lineTo(-6, -4.5); g.lineTo(7, -4.5);
      g.lineTo(11.5, 0.5); g.lineTo(9.5, 5.5); g.closePath(); g.fill();
      g.fillRect(-2, -6.5, 5, 2.5);
      g.fillRect(6, -2.5, 6.5, 1.8);
    },
    // 6: Railgun
    g => {
      g.fillRect(-11, 4.5, 22, 2);
      g.fillRect(-9, 1.5, 18, 3);
      g.save(); g.translate(-2, 1.5); g.rotate(-0.42); g.fillRect(-3, -2, 16, 3.2); g.restore();
    },
    // 7: Airplane (Biplane)
    g => {
      g.beginPath(); g.ellipse(0, 0.5, 9.5, 2, 0, 0, 7); g.fill();
      g.fillRect(-4, -5.5, 10, 2);
      g.fillRect(-3, 2.5, 8, 1.8);
      g.beginPath(); g.moveTo(-9, 0.5); g.lineTo(-11, -4); g.lineTo(-7.5, -4); g.closePath(); g.fill();
    },
    // 8: Submarine (U-Boat)
    g => {
      g.beginPath(); g.moveTo(-11, 2.5); g.quadraticCurveTo(0, -1, 11, 2.5);
      g.lineTo(9, 5.5); g.lineTo(-9, 5.5); g.closePath(); g.fill();
      g.fillRect(-2.5, -2.5, 5, 3.5);
      g.fillRect(-0.5, -6, 1.2, 4);
    },
    // 9: Battleship (Dreadnought)
    g => {
      g.beginPath(); g.moveTo(-11.5, 1.5); g.lineTo(11.5, 1.5); g.lineTo(8, 6.5); g.lineTo(-9, 6.5); g.closePath(); g.fill();
      g.fillRect(-5, -2.5, 9, 4);
      g.fillRect(-3.5, -6.5, 2, 4); g.fillRect(0.5, -6, 2, 3.5);
      g.fillRect(5, -0.5, 5, 1.4); g.fillRect(-9.5, -0.5, 4, 1.4);
    }
  ];

  EF.SPR = ICO.map(fn => {
    const c = document.createElement('canvas');
    c.width = 28; c.height = 20;
    const g = c.getContext('2d');
    g.fillStyle = '#17202a';
    g.beginPath(); g.roundRect(0, 0, 28, 20, 5); g.fill();
    g.translate(14, 10);
    g.fillStyle = g.strokeStyle = '#fff';
    g.lineWidth = 1.6; g.lineCap = 'round';
    fn(g);
    return c;
  });
  EF.SU = EF.SPR.map(c => c.toDataURL());

  // 1914 Historical National Flags (18x12)
  function drawFlag(o) {
    const c = document.createElement('canvas');
    c.width = 18; c.height = 12;
    const g = c.getContext('2d');
    if (o === 'UK') {
      g.fillStyle = '#012169'; g.fillRect(0, 0, 18, 12);
      g.strokeStyle = '#fff'; g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(18, 12); g.moveTo(18, 0); g.lineTo(0, 12); g.stroke();
      g.strokeStyle = '#C8102E'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(18, 12); g.moveTo(18, 0); g.lineTo(0, 12); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(7.2, 0, 3.6, 12); g.fillRect(0, 4.2, 18, 3.6);
      g.fillStyle = '#C8102E'; g.fillRect(8, 0, 2, 12); g.fillRect(0, 5, 18, 2);
    } else if (o === 'FR') {
      g.fillStyle = '#002395'; g.fillRect(0, 0, 6, 12);
      g.fillStyle = '#fff'; g.fillRect(6, 0, 6, 12);
      g.fillStyle = '#ED2939'; g.fillRect(12, 0, 6, 12);
    } else if (o === 'DE') {
      g.fillStyle = '#111827'; g.fillRect(0, 0, 18, 4);
      g.fillStyle = '#f8fafc'; g.fillRect(0, 4, 18, 4);
      g.fillStyle = '#b91c1c'; g.fillRect(0, 8, 18, 4);
    } else if (o === 'RU') {
      g.fillStyle = '#f8fafc'; g.fillRect(0, 0, 18, 4);
      g.fillStyle = '#0039A6'; g.fillRect(0, 4, 18, 4);
      g.fillStyle = '#D52B1E'; g.fillRect(0, 8, 18, 4);
    } else if (o === 'AH') {
      g.fillStyle = '#D52B1E'; g.fillRect(0, 0, 18, 4);
      g.fillStyle = '#fff'; g.fillRect(0, 4, 18, 4);
      g.fillStyle = '#D52B1E'; g.fillRect(0, 8, 9, 4);
      g.fillStyle = '#15803d'; g.fillRect(9, 8, 9, 4);
    } else if (o === 'IT') {
      g.fillStyle = '#009246'; g.fillRect(0, 0, 6, 12);
      g.fillStyle = '#fff'; g.fillRect(6, 0, 6, 12);
      g.fillStyle = '#CE2B37'; g.fillRect(12, 0, 6, 12);
      g.fillStyle = '#0039A6'; g.fillRect(7.8, 4.5, 2.4, 3);
    } else if (o === 'OT') {
      g.fillStyle = '#b91c1c'; g.fillRect(0, 0, 18, 12);
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(7.5, 6, 3.2, 0, 7); g.fill();
      g.fillStyle = '#b91c1c';
      g.beginPath(); g.arc(8.6, 6, 2.5, 0, 7); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(11.8, 6, 1.1, 0, 7); g.fill();
    } else {
      g.fillStyle = EF.NATIONS[o] ? EF.NATIONS[o][1] : '#94a3b8';
      g.fillRect(0, 0, 18, 12);
    }
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 17, 11);
    return c;
  }

  EF.FLAGS = {};
  EF.FLAG_U = {};
  Object.keys(EF.NATIONS).forEach(o => {
    const c = drawFlag(o);
    EF.FLAGS[o] = c;
    EF.FLAG_U[o] = c.toDataURL();
  });
  EF.fi = (o, w = 18) => `<img src="${EF.FLAG_U[o] || EF.FLAG_U.NE}" width="${w}" height="${Math.round(w * 12 / 18)}" style="vertical-align:middle;border-radius:2px">`;

  // Resource icons
  const RIG = {
    s: [g => { g.beginPath(); g.moveTo(-7, 4); g.lineTo(7, 4); g.lineTo(5, -3); g.lineTo(-5, -3); g.closePath(); g.fill(); g.fillRect(-3, -6, 6, 3); }, '#1f2937'],
    c: [g => { g.beginPath(); g.moveTo(-6, 3); g.lineTo(-4, -4); g.lineTo(1, -6); g.lineTo(6, -2); g.lineTo(5, 4); g.lineTo(-1, 6); g.closePath(); g.fill(); }, '#f3f4f6'],
    o: [g => { g.beginPath(); g.moveTo(0, -7); g.bezierCurveTo(6, 0, 6, 6, 0, 6); g.bezierCurveTo(-6, 6, -6, 0, 0, -7); g.fill(); }, '#0b0b0b'],
    f: [g => { g.beginPath(); g.moveTo(0, 7); g.lineTo(0, -6); g.stroke(); for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(-3, -3 + i * 3, 1.6, 2.8, -0.7, 0, 7); g.fill(); g.beginPath(); g.ellipse(3, -3 + i * 3, 1.6, 2.8, 0.7, 0, 7); g.fill(); } }, '#78350f'],
    w: [g => { g.fillRect(-7, -1, 14, 4); g.fillRect(-5, -6, 10, 4); g.fillRect(-5, 4, 10, 3); }, '#f5e6c8'],
    g: [g => { g.beginPath(); g.arc(0, 0, 5, 0, 7); g.stroke(); g.fillRect(-1, -3, 2, 6); }, '#78350f']
  };
  EF.RSP = {}; EF.RU = {};
  Object.keys(RIG).forEach(r => {
    const c = document.createElement('canvas'); c.width = c.height = 20;
    const g = c.getContext('2d');
    g.fillStyle = EF.RCl[r];
    g.beginPath(); g.arc(10, 10, 9.5, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
    g.translate(10, 10);
    g.fillStyle = g.strokeStyle = RIG[r][1];
    g.lineWidth = 1.6; g.lineCap = 'round';
    RIG[r][0](g);
    EF.RSP[r] = c; EF.RU[r] = c.toDataURL();
  });
  EF.ri = (r, z = 14) => `<img src="${EF.RU[r]}" width="${z}" height="${z}" style="vertical-align:middle">`;
  EF.cs = k => EF.ri('g', 13) + EF.T[k][1] + ' ' + Object.entries(EF.CST[k]).map(([r, n]) => EF.ri(r, 13) + n).join(' ');

  // 6 Building + Restore icons
  const BIC = {
    bar: g => { g.beginPath(); g.moveTo(-8, 5); g.lineTo(0, -6); g.lineTo(8, 5); g.closePath(); g.fill(); g.fillRect(-1.5, -9, 1.5, 5); },
    rest: g => { g.fillRect(-1, -8, 2, 16); g.beginPath(); g.moveTo(1, -8); g.lineTo(8, -5); g.lineTo(1, -2); g.fill(); },
    wall: g => { g.fillRect(-7, -6, 14, 3); g.fillRect(-7, -2, 6, 3); g.fillRect(0, -2, 7, 3); g.fillRect(-7, 2, 14, 3); g.fillRect(-7, 6, 5, 2); },
    ind: g => { g.fillRect(-7, 0, 14, 7); g.fillRect(-6, -6, 3, 6); g.beginPath(); g.moveTo(-3, 0); g.lineTo(2, -4); g.lineTo(2, 0); g.lineTo(7, -4); g.lineTo(7, 0); g.fill(); },
    inf: g => { g.lineWidth = 1.8; g.beginPath(); g.moveTo(-3, -8); g.lineTo(-5, 8); g.moveTo(3, -8); g.lineTo(5, 8); g.stroke(); for (let y = -5; y <= 5; y += 5) { g.beginPath(); g.moveTo(-4, y); g.lineTo(4, y); g.stroke(); } },
    port: g => { g.lineWidth = 1.8; g.beginPath(); g.arc(0, -6, 2.5, 0, 7); g.stroke(); g.beginPath(); g.moveTo(0, -3.5); g.lineTo(0, 7); g.stroke(); g.beginPath(); g.moveTo(-5, -1); g.lineTo(5, -1); g.stroke(); g.beginPath(); g.arc(0, 3, 6.5, 0.25, Math.PI - 0.25); g.stroke(); },
    aero: g => { g.beginPath(); g.moveTo(-9, 0); g.lineTo(9, 0); g.lineTo(5, 2.5); g.lineTo(-5, 2.5); g.closePath(); g.fill(); g.fillRect(-1.5, -6, 3, 12); g.fillRect(-4, 5, 8, 1.8); }
  };
  EF.BSP = {}; EF.BU = {};
  Object.keys(BIC).forEach(k => {
    const c = document.createElement('canvas'); c.width = c.height = 26;
    const g = c.getContext('2d');
    g.fillStyle = '#17202a';
    g.beginPath(); g.roundRect(0, 0, 26, 26, 7); g.fill();
    g.translate(13, 13);
    g.fillStyle = g.strokeStyle = '#f4b740';
    g.lineWidth = 1.6; g.lineCap = 'round';
    BIC[k](g);
    EF.BSP[k] = c; EF.BU[k] = c.toDataURL();
  });
})();
