(function () {
  const EF = (window.EF = window.EF || {});
  EF.MAPS = EF.MAPS || {};

  // Logical map dimensions & simulation time constants
  EF.W = 868;
  EF.H = 872;
  EF.BASE = 0.0625; // G.t units per real second at 1x speed
  EF.DAY_T = 1.5;   // 1 in-game day = 1.5 G.t units (24 real seconds at 1x)
  EF.INC = 0.4;
  EF.SPD = 18;
  EF.U_LEN = 10;

  // Ranges & bombardment cooldown (in G.t; 1.5 G.t = 1 game day)
  EF.ARANGE = 100;   // Artillery
  EF.RRANGE = 240;   // Railgun
  EF.PRANGE = 190;   // Airplane (from Aerodrome)
  EF.PRANGE2 = 215;  // Airplane from Aerodrome Lv2
  EF.AIR_HOP = 380;  // Max direct air-rebase hop between Aerodromes
  EF.SRANGE = 95;    // Battleship
  EF.ACD = 3.0;      // Bombardment salvo cooldown in G.t (2 game days = 48s at 1x)

  EF.NATIONS = {
    UK: ['Britain', '#c9605a'],
    FR: ['France', '#5b8bd6'],
    DE: ['Germany', '#707a88'],
    RU: ['Russia', '#5fae7b'],
    AH: ['Austria-Hungary', '#dcb64f'],
    IT: ['Italy', '#a583c9'],
    OT: ['Ottomans', '#e0914f'],
    NE: ['Neutral', '#aeb59f'],
    SEA: ['Sea', '#476b8a']
  };
  EF.NS = ['UK', 'FR', 'DE', 'RU', 'AH', 'IT', 'OT'];

  // Unit table: [Name, GoldCost, Attack, Defense, BaseSpeed, MinIndustry]
  EF.T = [
    ['Infantry',    10, 1.0, 1.2, 1.0,  0],
    ['Cavalry',     18, 1.8, 0.9, 2.2,  0],
    ['Armored Car', 24, 1.4, 2.2, 2.8,  1],
    ['Artillery',   28, 2.4, 1.0, 0.6,  1],
    ['Light Tank',  42, 3.5, 2.2, 1.7,  1],
    ['Heavy Tank',  75, 6.0, 4.2, 0.9,  2],
    ['Railgun',     95, 4.5, 1.2, 0.45, 2],
    ['Airplane',    60, 4.0, 1.2, 5.5,  2],
    ['Submarine',   52, 4.8, 2.0, 1.8,  1],
    ['Battleship',  85, 5.5, 5.5, 1.4,  2]
  ];

  // Counter target index B[k]: unit k gets +50% bonus against unit B[k]
  // Inf->Cav, Cav->Art, ArmCar->Air, Art->Inf, L.Tank->Inf, H.Tank->L.Tank, Railgun->H.Tank, Air->H.Tank, Sub->Battleship, Battleship->Air
  EF.B = [1, 3, 7, 0, 0, 4, 5, 5, 9, 7];

  EF.DESC = [
    'Line troops. Hold ground, fill frontage, and capture provinces.',
    'Fast shock raiders (Barracks 1). Strong vs. Artillery & Infantry.',
    'Fast scout car (Ind 1). High defense vs. Infantry & Planes; calms unrest.',
    'Siege guns (Ind 1). 100 px range, shreds Infantry & Fortresses.',
    'Fast armored breakthrough (Ind 1). Crushes Infantry & Armored Cars.',
    'Heavy siege tank (Ind 2). Ignores most fortress bonuses.',
    'Extreme-range siege gun (Ind 2 + Rail). 240 px range; moves only on Rails.',
    'Air recon & strikes (Ind 2 + Aerodrome). 190 px range; flies between Aerodromes.',
    'Stealthed U-Boat (Ind 1 + Port 1). Invisible at sea; 2× vs. Battleships & Convoys.',
    'Capital warship (Ind 2 + Port 1). Escorts convoys, blockades, shells 95 px.'
  ];

  EF.CST = [
    { f: 1 },
    { f: 2, w: 1 },
    { s: 2, o: 1 },
    { s: 2, c: 1 },
    { s: 3, o: 2 },
    { s: 6, o: 4, c: 2 },
    { s: 7, c: 4, o: 2 },
    { s: 3, o: 3, w: 2 },
    { s: 4, o: 3 },
    { s: 5, c: 3, w: 2 }
  ];

  // Training duration in G.t (1.5 G.t = 1 day)
  EF.TT = [2.4, 4.0, 4.5, 6.0, 8.5, 13.5, 16.0, 11.0, 9.5, 16.5];

  // True per-day upkeep in Gold and Resources
  EF.UP = [0.03, 0.05, 0.06, 0.07, 0.10, 0.16, 0.18, 0.12, 0.11, 0.16];
  EF.UP_RES = [
    { f: 0.025 },
    { f: 0.035, w: 0.005 },
    { o: 0.015, s: 0.005 },
    { f: 0.02, c: 0.015 },
    { o: 0.025, c: 0.01 },
    { o: 0.045, c: 0.02 },
    { c: 0.04, o: 0.015, s: 0.01 },
    { o: 0.035, w: 0.01 },
    { o: 0.025, c: 0.01 },
    { c: 0.035, o: 0.02, w: 0.005 }
  ];

  EF.RK = ['s', 'c', 'o', 'f', 'w'];
  EF.RNm = { s: 'Steel', c: 'Coal', o: 'Oil', f: 'Food', w: 'Wood' };
  EF.RCl = { s: '#cbd5e1', c: '#374151', o: '#b45309', f: '#facc15', w: '#16a34a', g: '#f59e0b' };
  EF.BP = { s: 4, c: 3, o: 6, f: 2, w: 3 };

  // Passive militia generation period (in G.t) by Barracks level
  EF.PERIOD = [36, 18, 10];

  // Buildings
  EF.MXL = { wall: 3, ind: 2, inf: 2, bar: 2, port: 2, aero: 2 };
  EF.CDUR = {
    wall: n => 6 * n,
    ind:  n => 12 * n,
    inf:  n => (n === 1 ? 10 : 20),
    bar:  n => 8 * n,
    port: n => 10 * n,
    aero: n => 9 * n
  };
  EF.cCost = (k, n) => {
    if (k === 'wall') return { g: 50 * n };
    if (k === 'ind')  return { g: 100 * n };
    if (k === 'bar')  return { g: 60 * n, w: 3 * n };
    if (k === 'port') return { g: 70 * n, w: 3 * n, s: 2 * n };
    if (k === 'aero') return { g: 65 * n, w: 3 * n, s: 2 * n };
    return n === 1 ? { g: 60, w: 3 } : { g: 120, s: 4, c: 2 };
  };
  EF.IM = [1, 1.4, 2.2];

  // AI difficulty presets
  EF.DF = [
    { inc: 0.75, thr: 1.75, per: 10,  mis: 0.30, dip: 0.25, war: 0.10, betray: 0.00, spy: 0.08 },
    { inc: 1.00, thr: 1.35, per: 7,   mis: 0.12, dip: 0.40, war: 0.25, betray: 0.00, spy: 0.20 },
    { inc: 1.15, thr: 1.18, per: 5,   mis: 0.04, dip: 0.55, war: 0.45, betray: 0.03, spy: 0.35 },
    { inc: 1.35, thr: 1.05, per: 3.5, mis: 0.00, dip: 0.70, war: 0.70, betray: 0.08, spy: 0.55 }
  ];
})();
