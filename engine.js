/* ============================================================
 * WinTrek web port — ENGINE
 * Faithful port of WinTrek 1.9 by Joe Jaworski (1992-96)
 * (original C sources: ST.C/INIT.C/LOADSAVE.C/SRS.C/COM.C/PANEL.C/...)
 * All constants, formulas, quirks and message strings are from
 * the original source code and manual. See FAITHFULNESS.md.
 * ============================================================ */
"use strict";

/* ---------- constants (ST.H / JOES.H) ---------- */
const OBJ_NONE = 0x00, OBJ_ENTL = 0x01, OBJ_ENTR = 0x02, OBJ_BASE = 0x04;
const OBJ_STAR0 = 0x08, OBJ_STAR1 = 0x10, OBJ_STAR2 = 0x18;
const OBJ_KLINGON = 0x20, OBJ_ROMULAN = 0x40, OBJ_FARENG = 0x60, OBJ_BORG = 0x80;
const OBJ_STARMASK = 0x18, OBJ_ALIENMASK = 0xE0;
const QFLAG_LRS = 1, QFLAG_RIC = 2;
const SKILL_NAMES = ["Crewman", "Yeoman", "Officer", "1stOfficer", "Captain", "Admiral"];
const SYS_ORDER = ["NAV", "SRS", "LRS", "SHE", "PHA", "PHO", "COM", "DAM", "PAN", "MSG"];
const EXPLSEQ = 8;

/* ---------- message strings (ST.RC, verbatim) ---------- */
const MSG = {
  IENGAGE: "Impulse Engines Engaged...",
  WENGAGE: "Warp Engines Engaged...",
  STOPPED: "All Stop at Sector %d,%d",
  BLOCKST: "Blocked by Star at %d,%d",
  BLOCKSB: "Blocked by StarBase at %d,%d",
  BLOCKKL: "Blocked by Klingon Ship at %d,%d",
  BLOCKFA: "Blocked by Farengi Ship at %d,%d",
  BLOCKRO: "Blocked by Romulan Ship at %d,%d",
  BLOCKBO: "Blocked by Borg Ship at %d,%d",
  DOCKED: "Enterprise is docked, Sir.",
  PHOFIRE: "Firing Photon Torpedo...",
  PHOSTAR: "Torpedo consumed by Star at %d,%d",
  PHOSHIP: "Torpedo hit at %d,%d  %d Units",
  PHOBASE: "real smart move, Captain.",
  PHOLOST: "Torpedo lost in space.",
  PHOEMPTY: "All Photon Tubes empty, Captain.",
  PHODEST: "Alien Destroyed.",
  FATAL: "Internal Error: %s%d",
  PHAFIRE: "Firing Phasers...",
  PHAHIT: "Direct hit at %d,%d  %d Units",
  PHANONE: "No target hit.",
  ENTHIT: "%d Units hit Enterprise",
  SHEHOLD: "Shields power reduced %u%%",
  SHEDOWN: "Shields are down, Captain.",
  ONSRS: "Short Range Sensors repaired.",
  ONLRS: "Long Range Sensors repaired.",
  ONNAV: "Warp Drive back on line.",
  ONSHE: "Shields repaired.",
  ONPHO: "Torpedo Control restored.",
  ONPHA: "Phaser Banks repaired.",
  ONCOM: "Computer repaired.",
  ONDAM: "Damage Report Systems repaired.",
  ONPAN: "Bridge Status Panel repaired.",
  ONMSG: "Message Display back on line.",
  INIMSG1: "MDS Diagnostics v734.3",
  INIMSG2: "Ready",
  YELLOW: "Warning- Condition Yellow.",
  GREEN: "Condition Green, Sir.",
  RED: "Sounding Red Alert.",
  RESUME: "Resuming Saved Game.",
  SAVED: "Game Successfully Saved.",
  STARHIT: "Star at %d,%d consumes %d Units",
  SHEHLD2: "Shields still holding."
};
const DM_MINOR = [
  "No damage reported", "Minor damage to Aft Cargo Bay",
  "Minor damage to Engineering Section", "Minor damage to Computer Core",
  "Minor damage to Transporter 3", "Hull breach in Shuttle Bay 2",
  "Structural damage to 2nd level Decks", "Minor hit on Computer Control",
  "Minor hit on Phaser Banks", "Minor hit on Photon Control",
  "Minor hit on Shield Control", "Minor damage to Deck 4",
  "Minor damage to Science Lab", "Minor damage to Navigation",
  "Minor damage to Dilithium Chamber", "Minor hit on Short Range Sensors",
  "Minor hit on Long Range Sensors", "Minor hit on Bridge Control",
  "Radiation leak on Deck 17", "Fire reported in Access Port 12",
  "Minor damage to TurboLift 4", "Minor damage to Medical Section",
  "Secondary Hull damaged on Decks 12-23"
];
/* indexed by RandomDamage nRes order: NAV SRS LRS SHE PHA PHO COM DAM PAN MSG */
const DM_MAJ = [
  "Warp Drive Seriously Damaged", "Major Damage to Short Range Sensors",
  "Major Damage to Long Range Sensors", "Shield Control Is Not Responding",
  "Phasers Are Now Inoperative", "Photon Torpedo Control is gone",
  "Major Damage to Central Computer", "Damage Report Systems are down",
  "Bridge Status Panel down", "Bridge Message Display is down"];
const DM_ADD = [
  "Another direct hit on Warp Engines", "More damage to Short Range Sensors",
  "More damage to Long Range Sensors", "Additional damage to Shields",
  "More damage to Phasers", "Additional Photon Tube damage",
  "Direct hit on Central Computer", "Damage report systems hit again",
  "More damage to Bridge Status Panel", "More damage to Message Display System"];
const DM_KIL = [
  "Warp Engines have been destroyed", "Short Range Sensors destroyed",
  "Long Range Sensors beyond repair", "Shields now beyond repair",
  "Phaser Banks have been destroyed", "Photon Tubes damaged beyond repair",
  "Central Computer Core is destroyed", "Damage Report Systems destroyed",
  "Bridge Status Panel circuits destroyed", "Message Display System destroyed"];
const COMSTR = {
  INIT: "BridgeNet Ver1021.047\nNeural %d connected\n\n>",
  CURRLOC: "\nQuadrant %d,%d  Sector %d,%d\n>",
  INVALID: "huh?\n>",
  MANUAL: "\nSee 'COMPUTER COMMAND SUMMARY' in\nthe WinTrek manual for a complete\nlist of commands.\n>",
  STARDATE: "\n  Stardate Now: % -4.1f\nMission Length: % -4.1f\n  End Stardate: % -4.1f\n     Time Used: % -4.1f\n     Time Left: % -4.1f\n>",
  POWER: "\n  Dilithium: %d\n    Shields: %d\nTotal Power: %d\n>",
  ALIEN: "\nTotal Aliens: %d\n   Destroyed: %d\n        Left: %d\n>",
  NORIC: "Scanning...\nNo qualifying stars in Quadrant\n>",
  NORIC2: "Scanning...\nNo stars in Quadrant\n>",
  COMRIC: "Scanning...\nComputing ricochet coordinates...\n",
  BASELOC: "Starbase found at Quadrant %d,%d\n",
  BASEERR: "Starbase possible at Quadrant %d,%d\n",
  BASEDIR: "- Warp %d, %d Degrees\n",
  SCAN1: "Scanning Sector...\n\n",
  SCANBAS: "StarBase found at %d,%d\n",
  SCANSTR: "Class %c Star at %d,%d\n",
  SCANKLI: "Klingon at %d,%d  %d energy level\n",
  SCANROM: "Romulan at %d,%d  %d energy level\n",
  SCANBRG: "Borg at %d,%d  %d energy level\n",
  SCANFRG: "Farengi at %d,%d  %d energy level\n",
  PHODATA: "%d Degrees, Distance: %d\n\n",
  RICCOUNT: "[%d]\n",
  SCANSTR2: " -Gravity Ricochet Compatible\n",
  XYERR: "Invalid X or Y coordinates.\n>",
  SECTDIR: "- Impulse %d, %d Degrees\n",
  REROUTE: "Rerouting Message Panel to Computer\n>",
  UNROUTE: "Enabling normal Message Panel\n>",
  MSGRER: "*** All Messages rerouted to Computer ***",
  MSGUNR: "Message Panel Enabled",
  SRSBUSY: "System Busy- Try again later.",
  DAMMSG: "Message Display:     %s\n",
  DAMPAN: "Status Panel:        %s\n",
  DAMSRS: "Short Range Sensors: %s\n",
  DAMLRS: "Long Range Sensors:  %s\n",
  DAMNAV: "Warp Drive:          %s\n",
  DAMSHE: "Shield Control:      %s\n",
  DAMPHA: "Phaser Banks:        %s\n",
  DAMPHO: "Photon Banks:        %s\n",
  DAMDAM: "Damage Control:      %s\n>",
  BADADV: "Invalid time entry.\n>",
  DOSCMD: "Get Serious.\n>",
  ANAHEAD: "Time per Alien Analysis:\n",
  ANAGAM: "Mission Requirement: %1.2f\n",
  ANANOW1: "     Current rating: %1.2f\n",
  ANANOW2: "     Current rating: n/a\n",
  ANAREQ: "    Required to win: %1.2f\n",
  ANAANA1: "You're doing very well.\n>",
  ANAANA2: "You're falling behind.\n>"
};
/* StarFleet memos (STDLL1.RC RCDATA, verbatim; \n line breaks) */
const MEMO_OPEN = "INTERSTELLAR COMM UID#%d\n**** SECURITY CODE: 1 ****\nTO:  U.S.S. ENTERPRISE\n\n%d alien vessels have invaded the galaxy. Our estimates indicate that Federation Headquarters will be attacked on stardate %.1f. This gives you %d Earth days to carry out your mission.\nSo that you may resupply your ship and make repairs, we have placed %d Starbases in your area.\n\nGood Luck, Jim.";
const MEMO_ENERGY = "INTERSTELLAR COMM UID#%d\n**** SECURITY CODE: 2 ****\nTO:  All Federation Vessels\n\nThe USS Enterprise has failed in its mission. On stardate %.1f, The Enterprise ran out of Dilithium power, and remains dead in space.\nThe commander of the Enterprise was obviously too inexperienced for this mission. Dilithium Power Management is one of the most basic Academy training courses.";
const MEMO_TIME = "INTERSTELLAR COMM UID#%d\n**** SECURITY CODE: 3 ****\nTO:  U.S.S. ENTERPRISE\n\nYou have failed to complete your mission in the time alloted. Although you have had some honorable battles, no accomodations can be given at this time.\nReport back to federation headquarters immediately so that we may begin hearings on your performance in this mission.";
const MEMO_SYS = "INTERSTELLAR COMM UID#%d\n**** SECURITY CODE: 2 ****\nTO:  All Federation Vessels\n\nThe USS Enterprise has failed in its mission. On stardate %.1f, The Enterprise was destroyed in battle.\nAlthough its commander had some honorable battles, no accomodations can be given at this time.";
const MEMO_WIN = "INTERSTELLAR COMM UID#%d\n**** SECURITY CODE: 2 ****\nTO:  All Federation Vessels\n\nThe USS Enterprise has sucessfully completed its mission. Exceptional courage and skill has resulted in the quick demise of all alien forces threatening the Federation. The Federation and all its member planets are eternally grateful. Highest accommodations to the commander of the Enterprise and its crew.\n\nJob well done!";

/* ---------- minimal wvsprintf subset (%d %u %s %c %f with -/space flags, width, .prec) ---------- */
function spf(fmt) {
  let out = "", ai = 1;
  for (let i = 0; i < fmt.length;) {
    const ch = fmt[i];
    if (ch !== "%") { out += ch; i++; continue; }
    let j = i + 1, flags = "", w = "", prec = "";
    while (j < fmt.length && "- 0".includes(fmt[j])) { flags += fmt[j]; j++; }
    while (j < fmt.length && fmt[j] >= "0" && fmt[j] <= "9") { w += fmt[j]; j++; }
    if (fmt[j] === ".") { j++; while (j < fmt.length && fmt[j] >= "0" && fmt[j] <= "9") { prec += fmt[j]; j++; } }
    const conv = fmt[j];
    let s = "";
    const arg = arguments[ai++];
    if (conv === "d" || conv === "u") {
      let n = Math.abs(Math.trunc(arg)) || 0;
      if (conv === "d" && arg < 0) s = "-" + n; else s = String(n);
    } else if (conv === "s") s = String(arg);
    else if (conv === "c") s = String(arg)[0] || " ";
    else if (conv === "f" || conv === "g") {
      const p = prec === "" ? 6 : parseInt(prec, 10);
      s = Number(arg).toFixed(p);
    } else if (conv === "%") { out += "%"; i = j + 1; continue; }
    else { out += ch; i++; ai--; continue; }
    const width = w ? parseInt(w, 10) : 0;
    const left = flags.includes("-");
    if (s.length < width) s = left ? s + " ".repeat(width - s.length) : " ".repeat(width - s.length) + s;
    out += s;
    i = j + 1;
  }
  return out;
}

/* ---------- global game state (mirrors ST.H globals) ---------- */
const G = {
  nSkill: 0,
  qd: null,                 /* 64 quadrants: {Stars,Bases,Aliens,Flags,Obj[8][8]} */
  pAL: null,                /* alien list */
  nStarBaseCnt: 0, nTotStars: 0,
  fStarDStart: 0, fStarDNow: 0,
  nAlienTotal: 0, nAlienCnt: 0,
  nDilithium: 0, nShields: 0, nPhotonCnt: 0,
  rep: {},                  /* fXXXRepair by system key */
  repAt: {},                /* fXXXRep by system key */
  fMissionL: 0,
  nEntQ: 0, nEntX: 0, nEntY: 0,
  bReRoute: false,
  Condition: "no",          /* no|blue|green|redon|redoff|yon|yoff|over */
  GameOverType: "",         /* ""|NoEnergy|NoTimeLeft|PlayerWon|NoSystems */
  bPaused: false, bSRSBusy: false, bNeedSave: false, bResetTick: false,
  bAbortProc: false, bInWarp: false, bFirst: false,
  /* options (WINTREK.INI defaults per LoadINI) */
  nINIAutoSRS: 1, nINISingle: 1, nINIPauseI: 0, nINISounds: 1
};

/* ---------- helpers ---------- */
const getRand = n => n ? Math.floor(Math.random() * n) : 0;   /* JOES.H: rand() % n */
const XQUAD = q => q % 8;
const YQUAD = q => q >> 3;
function adjQuad(nQuad, dx, dy) {   /* UTILS.C AdjQuad verbatim */
  let q = nQuad + dx;
  if (q > 63) q -= 64;
  else if (q < 0) q += 64;
  else if ((q >> 3) > (nQuad >> 3)) q -= 8;
  else if ((q >> 3) < (nQuad >> 3)) q += 8;
  q += dy * 8;
  if (q > 63) q -= 64; else if (q < 0) q += 64;
  return q;
}
function objOf(q, y, x) { return G.qd[q].Obj[y][x] & 0xff; }
function incOf(q, y, x) { return (G.qd[q].Obj[y][x] >> 8) & 0xff; }
function setObj(q, obj, y, x) { G.qd[q].Obj[y][x] = (obj & 0xff) | ((incOf(q, y, x) & 0xff) << 8); }
function incObjInc(q, y, x) { G.qd[q].Obj[y][x] = (G.qd[q].Obj[y][x] & 0xff) | (((((G.qd[q].Obj[y][x] >> 8) & 0xff) + 1) & 0xff) << 8); }
function subtractEnergy(n) {
  if (G.nDilithium - n <= 0) { G.nDilithium = 0; return 0; }
  G.nDilithium -= n; return 1;
}
function subtractTime(t) { G.fStarDNow += t; }  /* macro adds t; time-out is checked in setCondition */
function getQObj(y, x) { return objOf(G.nEntQ, y, x); }
function setQObj(obj, y, x) { setObj(G.nEntQ, obj, y, x); }
function findAlien(nQuad, nX, nY) {
  for (let i = 0; i < G.nAlienTotal; i++)
    if (G.pAL[i].Quad === nQuad && G.pAL[i].SecX === nX && G.pAL[i].SecY === nY) return i;
  return -1;
}
function randomXY(nQuad, wObj) {   /* UTILS.C RandomXY */
  let x, y;
  for (;;) {
    x = getRand(8); y = getRand(8);
    if (!G.qd[nQuad].Obj[y][x]) break;
  }
  if (wObj !== -1) G.qd[nQuad].Obj[y][x] = wObj & 0xff;
  return { x, y };
}

/* LineDDA — Windows/Wine bug-compatible algorithm (start included, end excluded) */
function ddaPoints(x1, y1, x2, y2) {
  const pts = [];
  let xadd = 1, yadd = 1, dx = x2 - x1, dy = y2 - y1;
  if (dx < 0) { dx = -dx; xadd = -1; }
  if (dy < 0) { dy = -dy; yadd = -1; }
  if (dx > dy) {
    let err = 2 * dy - dx, erradd = 2 * dy - 2 * dx;
    for (let cnt = 0; cnt < dx; cnt++) {
      pts.push({ x: x1, y: y1 });
      if (err > 0) { y1 += yadd; err += erradd; } else err += 2 * dy;
      x1 += xadd;
    }
  } else {
    let err = 2 * dx - dy, erradd = 2 * dx - 2 * dy;
    for (let cnt = 0; cnt < dy; cnt++) {
      pts.push({ x: x1, y: y1 });
      if (err > 0) { x1 += xadd; err += erradd; } else err += 2 * dx;
      y1 += yadd;
    }
  }
  return pts;
}
function getWarpFromPoints(x1, y1, x2, y2) { return ddaPoints(x1, y1, x2, y2).length; }

/* DegToCoords / CoordsToDeg — UTILS.C verbatim (int truncation kept) */
function degToCoords(nDeg, nRadius) {
  nDeg -= 90; if (nDeg < 0) nDeg += 360;
  const a = nDeg * Math.PI / 180;
  return { x: Math.trunc(nRadius * Math.cos(a)), y: Math.trunc(nRadius * Math.sin(a)) };
}
function coordsToDeg(px, py) {
  if (!px && py >= 0) return 180;
  if (!px && py < 0) return 0;
  if (!py && px >= 0) return 90;
  if (!py && px < 0) return 270;
  if (px > 0) return Math.trunc(Math.atan(py / px) * 180 / Math.PI) + 90;
  const fDeg = Math.atan(px / py) * 180 / Math.PI;
  if (py < 0) return Math.trunc(360 - fDeg);
  return Math.trunc(180 - fDeg);
}

/* BlockedByStar — UTILS.C: LineDDA callbacks over intermediate sectors only
   (end point excluded); returns blocked sector or null */
function blockedByStar(nXStart, nYStart, nXEnd, nYEnd) {
  for (const p of ddaPoints(nXStart, nYStart, nXEnd, nYEnd)) {
    const o = getQObj(p.y, p.x);
    if (o === OBJ_STAR0 || o === OBJ_STAR1 || o === OBJ_STAR2)
      return { x: p.x, y: p.y };
  }
  return null;
}

/* ---------- NewGame — LOADSAVE.C verbatim ---------- */
function newGame() {
  if (G.Condition !== "no") destroyGame();   /* game was in play */
  Snd.play("code1", false);
  G.bReRoute = false;
  G.fStarDStart = G.fStarDNow = getRand(7000) + 1000.0;
  G.fMissionL = 34.0 + getRand(10);
  let nOddsK, nOddsR, nOddsF;
  switch (G.nSkill) {
    case 0: G.nStarBaseCnt = getRand(4) + 2; G.nTotStars = getRand(100) + 50;
      G.nAlienCnt = G.nAlienTotal = 20 + getRand(10); nOddsK = 55; nOddsR = 80; nOddsF = 98; break;
    case 1: G.nStarBaseCnt = getRand(3) + 2; G.nTotStars = getRand(100) + 65;
      G.nAlienCnt = G.nAlienTotal = 25 + getRand(10); nOddsK = 50; nOddsR = 80; nOddsF = 97; break;
    case 2: G.nStarBaseCnt = getRand(3) + 1; G.nTotStars = getRand(100) + 80;
      G.nAlienCnt = G.nAlienTotal = 30 + getRand(10); nOddsK = 50; nOddsR = 80; nOddsF = 96; break;
    case 3: G.nStarBaseCnt = getRand(3) + 1; G.nTotStars = getRand(100) + 95;
      G.nAlienCnt = G.nAlienTotal = 35 + getRand(10); nOddsK = 45; nOddsR = 80; nOddsF = 95; break;
    case 4: G.nStarBaseCnt = (Math.random() < 0.5 ? 0 : 1) + 1; G.nTotStars = getRand(100) + 110;
      G.nAlienCnt = G.nAlienTotal = 35 + getRand(10); nOddsK = 40; nOddsR = 80; nOddsF = 94; break;
    default: G.nStarBaseCnt = (Math.random() < 0.5 ? 0 : 1) + 1; G.nTotStars = getRand(100) + 125;
      G.nAlienCnt = G.nAlienTotal = 40 + getRand(10); nOddsK = 40; nOddsR = 80; nOddsF = 94; break;
  }
  G.qd = [];
  for (let i = 0; i < 64; i++) G.qd.push({ Stars: 0, Bases: 0, Aliens: 0, Flags: 0,
    Obj: Array.from({ length: 8 }, () => new Uint16Array(8)) });

  /* stars */
  for (let i = 0; i < G.nTotStars; i++) {
    let nQ; do { nQ = getRand(64); } while (G.qd[nQ].Stars > 8);
    ++G.qd[nQ].Stars;
    let yObj;
    switch (getRand(3)) {
      case 0: yObj = OBJ_STAR0; break;
      case 1: yObj = OBJ_STAR1; break;
      case 2: yObj = OBJ_STAR2;
        if (Math.random() < 0.5) G.qd[nQ].Flags |= QFLAG_RIC; break;
    }
    randomXY(nQ, yObj | ((getRand(4)) << 8));
  }
  /* starbases */
  for (let i = 0; i < G.nStarBaseCnt; i++) {
    let nQ; do { nQ = getRand(64); } while (G.qd[nQ].Bases > 2);
    ++G.qd[nQ].Bases;
    randomXY(nQ, OBJ_BASE | (getRand(4) << 8));
  }
  /* aliens */
  G.pAL = [];
  let nQ;                                  /* C: function-scoped; see ENT quirk below */
  for (let i = 0; i < G.nAlienTotal; i++) {
    do { nQ = getRand(64); } while (G.qd[nQ].Aliens > 7);
    ++G.qd[nQ].Aliens;
    const nOdds = getRand(100);
    let yObj, dwFT, dwMT, nEnergy;
    if (nOdds < nOddsK) {
      yObj = OBJ_KLINGON; dwFT = getRand(25000) + 25000; dwMT = getRand(25000) + 15000;
      nEnergy = 150 + getRand(150);
    } else if (nOdds < nOddsR) {
      yObj = OBJ_ROMULAN; dwFT = getRand(25000) + 30000; dwMT = getRand(25000) + 20000;
      nEnergy = 200 + getRand(150);
    } else if (nOdds < nOddsF) {
      yObj = OBJ_FARENG; dwFT = getRand(20000) + 20000; dwMT = getRand(20000) + 15000;
      nEnergy = 50 + getRand(100);
    } else {
      yObj = OBJ_BORG; dwFT = getRand(30000) + 35000; dwMT = getRand(25000) + 35000;
      nEnergy = 500 + getRand(500);
    }
    if (G.nSkill > 2) {
      if (Math.random() < 0.5) nEnergy += 75;
      if (getRand(4) === 0) dwFT >>= 1;
    }
    const pt = randomXY(nQ, yObj);
    G.pAL.push({ Quad: nQ, SecX: pt.x, SecY: pt.y, Obj: yObj, Energy: nEnergy,
      MTick: dwMT, FTick: dwFT, MStartTick: 0, FStartTick: 0 });
  }
  /* Enterprise — NOTE: the original validates the sector against the LAST
     ALIEN's quadrant (stale nQ), not nEntQ. Authentic bug, reproduced. */
  G.nEntQ = getRand(64);
  const pt = randomXY(nQ, -1);            /* nQ = last alien's quadrant */
  G.qd[G.nEntQ].Obj[pt.y][pt.x] = (pt.x > 3 ? OBJ_ENTL : OBJ_ENTR);
  G.nEntX = pt.x; G.nEntY = pt.y;

  G.nDilithium = 3000; G.nShields = 0; G.nPhotonCnt = 10;
  for (const s of SYS_ORDER) { G.rep[s] = 0.0; G.repAt[s] = 0.0; }
  G.bResetTick = true;
  /* the memo is modal: shown before the windows exist, as in the original */
  UI.memo(spf(MEMO_OPEN, getRand(32767), G.nAlienCnt, G.fStarDStart + G.fMissionL,
    Math.trunc(G.fMissionL), G.nStarBaseCnt));
  updateLRS(G.nEntQ);
  H.createGameUI();
  setCondition();                       /* Status panel WM_CREATE -> SetCondition() */
  comOut(spf(COMSTR.INIT, getRand(32767)));
  showMsg("INIMSG1"); showMsg("INIMSG2");
  G.bNeedSave = true;
}

/* ---------- LRS (LRS.C UpdateLRS) ---------- */
function updateLRS(nQuad) {
  if (G.rep.LRS) return;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      G.qd[adjQuad(nQuad, dx, dy)].Flags |= QFLAG_LRS;
  H.invalidateLRS();
}

/* ---------- movement (SRS.C) ---------- */
async function moveEntImpulse(nDeg, nFactor) {
  showMsg("IENGAGE");
  if (!subtractEnergy(10)) return;
  let nMovement = nFactor;
  Snd.playEx("imp", true);
  const ptEnd = degToCoords(nDeg, 12);
  const face = ptEnd.x > G.nEntX ? OBJ_ENTR : OBJ_ENTL;
  setQObj(face, G.nEntY, G.nEntX);       /* Obj only; sprite updates on move/repaint, as in the original */
  G.bAbortProc = false;
  const pts = ddaPoints(G.nEntX, G.nEntY, ptEnd.x + G.nEntX, ptEnd.y + G.nEntY);
  for (const p of pts) {
    if (G.bAbortProc) continue;
    let { x, y } = p;
    if (x > 7 || x < 0 || y > 7 || y < 0) {         /* beyond sector -> adjacent quadrant */
      let nQX = 0, nQY = 0;
      if (x > 7) nQX = 1; else if (x < 0) nQX = -1;
      if (y > 7) nQY = 1; else if (y < 0) nQY = -1;
      nMovement = 1;
      await warpToQuad(adjQuad(G.nEntQ, nQX, nQY));
      G.fStarDNow -= 1.0;
      G.bAbortProc = true;
      continue;
    }
    const o = getQObj(y, x);
    if (o === OBJ_BASE) { showMsg("BLOCKSB", x + 1, y + 1); G.bAbortProc = true; continue; }
    if (o & OBJ_STARMASK) { showMsg("BLOCKST", x + 1, y + 1); G.bAbortProc = true; continue; }
    if (o === OBJ_KLINGON) { showMsg("BLOCKKL", x + 1, y + 1); G.bAbortProc = true; continue; }
    if (o === OBJ_ROMULAN) { showMsg("BLOCKRO", x + 1, y + 1); G.bAbortProc = true; continue; }
    if (o === OBJ_FARENG) { showMsg("BLOCKFA", x + 1, y + 1); G.bAbortProc = true; continue; }
    if (o === OBJ_BORG) { showMsg("BLOCKBO", x + 1, y + 1); G.bAbortProc = true; continue; }
    if (o === OBJ_ENTL || o === OBJ_ENTR) continue;
    if (!subtractEnergy(5)) { G.bAbortProc = true; continue; }
    if (G.nShields) G.nShields = Math.max(0, G.nShields - 10);
    H.eraseSector(G.nEntX, G.nEntY);
    const cur = getQObj(G.nEntY, G.nEntX);
    setQObj(cur, y, x);
    H.drawSector(x, y);
    setQObj(OBJ_NONE, G.nEntY, G.nEntX);
    G.nEntX = x; G.nEntY = y;
    G.fStarDNow += 0.1;
    if (--nMovement === 0) G.bAbortProc = true;
    await sleep(700);
  }
  G.bAbortProc = false;
  showMsg("STOPPED", G.nEntX + 1, G.nEntY + 1);
  H.panel(); Snd.kill(); updateLRS(G.nEntQ); setCondition();
  H.checkGameOver();
}

async function moveEntWarp(nDeg, nFactor) {
  showMsg("WENGAGE");
  if (!subtractEnergy(10)) return;
  const ptEnd = degToCoords(nDeg, 12);
  const pts = ddaPoints(XQUAD(G.nEntQ), YQUAD(G.nEntQ),
    ptEnd.x + XQUAD(G.nEntQ), ptEnd.y + YQUAD(G.nEntQ));
  const idx = Math.min(nFactor, pts.length - 1);   /* nMovement = nFactor+1 decrements */
  const dest = pts[idx];
  const nNewQ = adjQuad(G.nEntQ, dest.x - XQUAD(G.nEntQ), dest.y - YQUAD(G.nEntQ));
  await warpToQuad(nNewQ, nFactor);
  showMsg("STOPPED", G.nEntX + 1, G.nEntY + 1);
  H.panel(); updateLRS(G.nEntQ); setCondition();
  H.checkGameOver();
}

async function warpToQuad(nNewQuad, nMovement) {
  G.bAbortProc = true;
  setQObj(OBJ_NONE, G.nEntY, G.nEntX);
  G.nEntQ = nNewQuad;
  const pt = randomXY(G.nEntQ, -1);
  G.qd[G.nEntQ].Obj[pt.y][pt.x] = (pt.x > 3 ? OBJ_ENTL : OBJ_ENTR);
  G.nEntX = pt.x; G.nEntY = pt.y;
  await H.warpStars(nMovement);          /* Stars() animation */
  G.bAbortProc = false;
  H.invalidateSRS();
  subtractTime(nMovement);
  subtractEnergy(nMovement * 20);
  if (G.nShields) G.nShields = Math.max(0, G.nShields - nMovement * 20);
}

async function ricochetToQuad() {
  G.bAbortProc = true;
  setQObj(OBJ_NONE, G.nEntY, G.nEntX);
  G.nEntQ = getRand(64);
  const pt = randomXY(G.nEntQ, -1);
  G.qd[G.nEntQ].Obj[pt.y][pt.x] = (pt.x > 3 ? OBJ_ENTL : OBJ_ENTR);
  G.nEntX = pt.x; G.nEntY = pt.y;
  await H.warpStars(0);                  /* zero warp = ricochet effect */
  G.bAbortProc = false;
  H.invalidateSRS();
  updateLRS(G.nEntQ);
  G.nShields = 0;
  H.panel(); setCondition();
  H.checkGameOver();
}

/* ---------- weapons (SRS.C) ---------- */
async function firePhoton(nDeg, nFactor) {
  showMsg("PHOFIRE");
  let nMovement = nFactor;
  G.nPhotonCnt--;
  const ptEnd = degToCoords(nDeg, 12);
  G.bAbortProc = false;
  let oldX = -10, oldY = -10;
  const pts = ddaPoints(G.nEntX, G.nEntY, ptEnd.x + G.nEntX, ptEnd.y + G.nEntY);
  for (const p of pts) {
    const { x, y } = p;
    if (oldX !== -10 && !G.rep.SRS) H.erasePhoton(oldX, oldY);
    if (G.bAbortProc) continue;
    if (x > 7 || x < 0 || y > 7 || y < 0) { showMsg("PHOLOST"); G.bAbortProc = true; continue; }
    const o = getQObj(y, x);
    if (o === OBJ_BASE) {
      showMsg("PHOSHIP", x + 1, y + 1, 250);
      await H.explodeSequence(x, y, true);
      G.qd[G.nEntQ].Bases--;
      showMsg("PHOBASE");
      G.qd[G.nEntQ].Obj[y][x] = 0;
      G.bAbortProc = true; continue;
    }
    if (o & OBJ_STARMASK) { showMsg("PHOSTAR", x + 1, y + 1); G.bAbortProc = true; continue; }
    if (o === OBJ_KLINGON || o === OBJ_ROMULAN || o === OBJ_FARENG || o === OBJ_BORG) {
      let nEnergy;
      switch (G.nSkill) {
        case 0: case 1: nEnergy = getRand(80) + 200; break;
        case 2: case 3: nEnergy = getRand(80) + 150; break;
        default: nEnergy = getRand(80) + 100; break;
      }
      if (nMovement === 1) nEnergy += 70;          /* exact distance factor */
      const nA = findAlien(G.nEntQ, x, y);
      if (nA === -1) { fatal(); G.bAbortProc = true; continue; }
      G.pAL[nA].Energy -= nEnergy;
      if (G.pAL[nA].Energy <= 0) {
        showMsg("PHOSHIP", x + 1, y + 1, nEnergy);
        await H.explodeSequence(x, y, true);
        G.qd[G.nEntQ].Aliens--;
        G.pAL[nA].Quad = -1;
        G.qd[G.nEntQ].Obj[y][x] = 0;
        showMsg("PHODEST");
        G.nAlienCnt--;
      } else {
        showMsg("PHOSHIP", x + 1, y + 1, nEnergy);
        await H.explodeSequence(x, y, false);
      }
      G.bAbortProc = true; continue;
    }
    if (o === OBJ_ENTL || o === OBJ_ENTR) continue;
    /* empty sector: move the photon */
    H.drawPhoton(x, y);
    oldX = x; oldY = y;
    --nMovement;
    await sleep(500);
  }
  G.bAbortProc = false;
  H.panel(); setCondition();
  H.checkGameOver();
}

async function firePhasers(nPower, bSingle) {
  if (G.qd[G.nEntQ].Aliens === 1) bSingle = true;
  showMsg("PHAFIRE");
  const idx = [];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const a = findAlien(G.nEntQ, x, y);
      if (a !== -1) idx.push(a);
    }
  if (idx.length) {
    if (bSingle) idx.length = 1;
    const nPowerD = Math.floor(nPower / idx.length);
    for (const a of idx) {
      let nXEnd = G.pAL[a].SecX, nYEnd = G.pAL[a].SecY;
      const blk = blockedByStar(G.nEntX, G.nEntY, nXEnd, nYEnd);
      if (blk) { nXEnd = blk.x; nYEnd = blk.y; }
      let nDist = ((Math.abs(G.nEntX - nXEnd)) + (Math.abs(G.nEntY - nYEnd))) >> 1;
      nDist *= getRand(5) + 5;
      const nPower2 = Math.max(0, nPowerD - nDist);
      await H.animatePhasers(G.nEntX, G.nEntY, nXEnd, nYEnd, nPower2 * 10, false);
      if (blk) {
        showMsg("STARHIT", nXEnd + 1, nYEnd + 1, nPower2);
      } else {
        G.pAL[a].Energy -= nPower2;
        if (G.pAL[a].Energy <= 0) {
          showMsg("PHAHIT", nXEnd + 1, nYEnd + 1, nPower2);
          await H.explodeSequence(nXEnd, nYEnd, true);
          G.qd[G.nEntQ].Aliens--;
          G.pAL[a].Quad = -1;
          G.qd[G.nEntQ].Obj[nYEnd][nXEnd] = 0;
          showMsg("PHODEST");
          G.nAlienCnt--;
        } else {
          showMsg("PHAHIT", nXEnd + 1, nYEnd + 1, nPower2);
          await H.explodeSequence(nXEnd, nYEnd, false);
        }
      }
    }
  } else {
    await H.animatePhasersRandom(nPower * 10);
    showMsg("PHANONE");
  }
  H.panel(); setCondition();
  H.checkGameOver();
}

/* ---------- alien AI (SRS.C ProcessRed / RandomAlienMove / AlienFires) ---------- */
async function processRed() {
  if (G.bPaused || G.bRedBusy) return;
  G.bRedBusy = true;
  try {
    const dwTick = performance.now();
    if (G.bResetTick) {
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++)
          if (getQObj(y, x) & OBJ_ALIENMASK) {
            const nA = findAlien(G.nEntQ, x, y);
            if (nA === -1) continue;
            G.pAL[nA].MStartTick = dwTick;
            G.pAL[nA].FStartTick = dwTick;
          }
      G.bResetTick = false; G.bFirst = true;
      return;
    }
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (getQObj(y, x) & OBJ_ALIENMASK) {
          const nA = findAlien(G.nEntQ, x, y);
          if (nA === -1) continue;
          const al = G.pAL[nA];
          if ((dwTick > al.MStartTick + al.MTick) || (G.bFirst && getRand(100) > 94)) {
            if (!G.bSRSBusy) {
              G.bSRSBusy = true;
              randomAlienMove(nA);
              al.MStartTick = performance.now();
              G.bSRSBusy = false;
            }
          }
          if ((dwTick > al.FStartTick + al.FTick) || (G.bFirst && getRand(100) > 94)) {
            if (!G.bSRSBusy) {
              if (dwTick > (al.FStartTick + al.FTick + 15000)) {
                al.FStartTick = dwTick;              /* >15s overdue: just reset */
              } else {
                G.bSRSBusy = true;
                await alienFires(nA);
                al.FStartTick = performance.now();
                G.bSRSBusy = false;
              }
            }
          }
        }
      }
    }
    G.bFirst = false;
  } finally { G.bRedBusy = false; }
}

function randomAlienMove(nA) {
  const al = G.pAL[nA];
  const pt = [];
  for (let x = al.SecX - 1; x < al.SecX + 2; x++) {
    if (x < 0 || x > 7) continue;
    for (let y = al.SecY - 1; y < al.SecY + 2; y++) {
      if (y > 7 || y < 0) continue;
      if (x === al.SecX && y === al.SecY) continue;
      if (getQObj(y, x) === OBJ_NONE) pt.push({ x, y });
    }
  }
  if (!pt.length) return;
  const d = pt[getRand(pt.length)];
  H.eraseSector(al.SecX, al.SecY);
  setQObj(OBJ_NONE, al.SecY, al.SecX);
  setQObj(al.Obj, d.y, d.x);
  H.drawSector(d.x, d.y);
  al.SecX = d.x; al.SecY = d.y;
}

async function alienFires(nA) {
  const al = G.pAL[nA];
  const nPower = getRand(Math.floor(al.Energy / 2)) + Math.floor(al.Energy / 2);
  const blk = blockedByStar(al.SecX, al.SecY, G.nEntX, G.nEntY);
  if (blk) return;                       /* blocked: silent, no shot */
  await H.alienBeam(al.SecX, al.SecY, nPower);
  await H.explodeEnt();
  showMsg("ENTHIT", nPower);
  if (G.nShields > nPower) {
    showMsg("SHEHOLD", Math.floor((nPower / G.nShields) * 100));
    showMsg("SHEHLD2");
    G.nShields -= nPower;
    H.panel();
    return;
  }
  if (G.nShields && G.nShields < nPower) {
    G.nShields -= nPower;
    randomDamage(Math.abs(G.nShields));
    G.nShields = 0;
    showMsg("SHEDOWN");
    H.panel(); setCondition(); H.checkGameOver();
    return;
  }
  randomDamage(nPower);
  H.panel(); setCondition(); H.checkGameOver();
}

/* ---------- damage (SRS.C RandomDamage / UTILS.C RepairShip) ---------- */
function randomDamage(nHit) {
  const nP = G.nSkill * getRand(15) + nHit;
  if (nP < 75 || getRand(20) < 2) {
    showMsgId(getRand(DM_MINOR.length), DM_MINOR);         /* minor damage only */
    return;
  }
  let bKil;
  if (nP < 150) bKil = getRand(22) < 2;
  else if (nP < 250) bKil = getRand(20) < 3;
  else if (nP < 350) bKil = getRand(20) < 4;
  else if (nP < 450) bKil = getRand(15) < 5;
  else bKil = true;
  let fDays = (nHit / 12) / 10.0;
  let nRes = getRand(10);
  if (nRes === 7 && getRand(10) > 4) nRes = getRand(10);
  const key = SYS_ORDER[nRes];
  if (bKil && G.rep[key] !== -1.0) {
    showMsgId(nRes, DM_KIL);
    G.rep[key] = -1.0; G.repAt[key] = 0.0;
    H.systemHit(key);
  } else if (G.rep[key] > 0.0) {
    showMsgId(nRes, DM_ADD);
    G.rep[key] += fDays; G.repAt[key] += fDays;
  } else if (G.rep[key] === 0.0) {
    showMsgId(nRes, DM_MAJ);
    G.rep[key] = fDays;
    G.repAt[key] = fDays + G.fStarDNow;
    H.systemHit(key);
  }
}

function repairShip() {
  for (const s of SYS_ORDER) {
    if (G.rep[s] > 0.0 && G.repAt[s] <= G.fStarDNow) {
      G.rep[s] = 0.0;
      showMsg("ON" + s);
      H.systemRepaired(s);
    }
  }
}

/* ---------- condition / game over (PANEL.C SetCondition) ---------- */
function setCondition() {
  repairShip();
  const flashOff = () => H.flashOff();
  if (G.nDilithium <= 0) {
    flashOff(); G.GameOverType = "NoEnergy"; G.Condition = "over"; return;
  }
  if (G.fStarDNow >= G.fStarDStart + G.fMissionL) {
    flashOff(); G.GameOverType = "NoTimeLeft"; G.Condition = "over"; return;
  }
  if (!G.nAlienCnt) {
    flashOff(); G.GameOverType = "PlayerWon"; G.Condition = "over"; return;
  }
  let allBroke = true;
  for (const s of SYS_ORDER) if (!G.rep[s]) { allBroke = false; break; }
  if (allBroke) { flashOff(); G.GameOverType = "NoSystems"; G.Condition = "over"; return; }

  /* red alert */
  let red = false;
  for (let i = 0; i < 8 && !red; i++)
    for (let j = 0; j < 8; j++)
      if (G.qd[G.nEntQ].Obj[i][j] & OBJ_ALIENMASK) { red = true; break; }
  if (red) {
    if (G.Condition === "redon" || G.Condition === "redoff") return G.Condition;
    G.bResetTick = true;
    showMsg("RED");
    H.menuRedAlert(true);
    Snd.play("reda", false);
    if (!H.flashActive()) { H.flashOn(); return (G.Condition = "redoff"); }
  }
  /* blue (docked) */
  let docked = false;
  for (let i = 1; i <= 8; i++) {
    let nX, nY;
    switch (i) {
      case 1: nX = -1; nY = -1; break; case 2: nX = 0; nY = -1; break;
      case 3: nX = 1; nY = -1; break;  case 4: nX = -1; nY = 0; break;
      case 5: nX = 1; nY = 0; break;   case 6: nX = -1; nY = 1; break;
      case 7: nX = 0; nY = 1; break;   case 8: nX = 1; nY = 1; break;
    }
    nX += G.nEntX; nY += G.nEntY;
    if (nX > 7 || nX < 0 || nY > 7 || nY < 0) continue;
    if (getQObj(nY, nX) === OBJ_BASE) { docked = true; break; }
  }
  if (docked) {
    if (G.Condition !== "blue") {
      flashOff();
      G.bReRoute = false;
      G.nDilithium = 3000; G.nShields = 0; G.nPhotonCnt = 10;
      for (const s of SYS_ORDER) if (G.rep[s]) G.rep[s] = 0.1;
      for (const s of SYS_ORDER) G.repAt[s] = G.fStarDNow;
      H.menuRedAlert(false);
      showMsg("DOCKED");
      H.panel();
      repairShip();
      updateLRS(G.nEntQ);
      H.lockedOff();
    }
    return (G.Condition = "blue");
  }
  /* yellow */
  if (G.nDilithium <= 300) {
    if (G.Condition === "yon" || G.Condition === "yoff") return G.Condition;
    H.lockedOff();
    H.menuRedAlert(false);
    showMsg("YELLOW");
    if (!H.flashActive()) { H.flashOn(); return (G.Condition = "yoff"); }
  }
  /* green */
  if (G.Condition === "green") return G.Condition;
  H.lockedOff();
  H.menuRedAlert(false);
  if (H.flashActive()) flashOff();
  showMsg("GREEN");
  H.panel();
  return (G.Condition = "green");
}

function gameOverCheck() {
  if (G.Condition === "over") { H.gameIsOver(G.GameOverType); return true; }
  return false;
}
function fatal() { showMsg("FATAL", "engine.js:", 0); }

/* ---------- computer (COM.C ExecuteCommand verbatim incl. strstr order) ---------- */
function comExecute(cmdRaw) {
  const cmd = cmdRaw.toUpperCase();
  if (cmd.startsWith("  ")) { comCursor(); return -1; }
  if (cmd.includes("BAS")) {
    for (let i = 0; i < 64; i++) if (G.qd[i].Bases) displayBaseInfo(i);
    comCursor();
  } else if (cmd.includes("SCA")) {
    comOut(COMSTR.SCAN1);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) displayObjectInfo(i, j);
    comCursor();
  } else if (cmd.includes("RIC")) {
    if (G.qd[G.nEntQ].Stars) {
      if (G.qd[G.nEntQ].Flags & QFLAG_RIC) {
        comOut(COMSTR.COMRIC);
        doRicochet();
        return 0;
      } else comOut(COMSTR.NORIC);
    } else comOut(COMSTR.NORIC2);
  } else if (cmd.includes("LOC")) {
    comOut(spf(COMSTR.CURRLOC, XQUAD(G.nEntQ) + 1, YQUAD(G.nEntQ) + 1, G.nEntX + 1, G.nEntY + 1));
  } else if (cmd.includes("STA")) {
    comOut(spf(COMSTR.STARDATE, G.fStarDNow, G.fMissionL, G.fStarDStart + G.fMissionL,
      G.fStarDNow - G.fStarDStart, (G.fStarDStart + G.fMissionL) - G.fStarDNow));
  } else if (cmd.includes("POW")) {
    comOut(spf(COMSTR.POWER, G.nDilithium, G.nShields, G.nDilithium + G.nShields));
  } else if (cmd.includes("ALI")) {
    comOut(spf(COMSTR.ALIEN, G.nAlienTotal, G.nAlienTotal - G.nAlienCnt, G.nAlienCnt));
  } else if (cmd.includes("CD") || cmd.includes("DIR")) {
    comOut(COMSTR.DOSCMD);
  } else if (cmd.includes("HEL")) {
    comOut(COMSTR.MANUAL);
  } else if (cmd.includes("SKI")) {
    comOut(SKILL_NAMES[G.nSkill] + "\n>");
  } else if (cmd.includes("GETQ")) {
    const p = cmd.indexOf("GETQ") + 5;
    const nX = cmd.charCodeAt(p) - 0x31, nY = cmd.charCodeAt(p + 2) - 0x31;
    if (nX > 7 || nX < 0 || nY > 7 || nY < 0) { comOut(COMSTR.XYERR); return -1; }
    const dx = nX - XQUAD(G.nEntQ), dy = nY - YQUAD(G.nEntQ);
    let nDeg = 0, nDist = 0;
    if (dx || dy) { nDeg = coordsToDeg(dx, dy); nDist = getWarpFromPoints(XQUAD(G.nEntQ), YQUAD(G.nEntQ), nX, nY); }
    comOut(spf(COMSTR.BASEDIR, nDist, nDeg));
    comCursor();
  } else if (cmd.includes("ADV")) {
    let p = cmd.indexOf("ADV") + 4, fAdv = 0.0;
    let i = cmd.charCodeAt(p);
    if (i !== 46 && i !== 48) {          /* not '.' or '0' */
      i -= 48;
      if (i > 9 || i < 0) { comOut(COMSTR.BADADV); return -1; }
      fAdv += i;
    }
    if (i !== 46) p++;
    if (cmd.charCodeAt(p) === 46) {
      p++;
      i = cmd.charCodeAt(p) - 48;
      if (i > 9 || i < 0) { comOut(COMSTR.BADADV); return -1; }
      fAdv += i / 10.0;
    }
    if (fAdv) {
      subtractTime(fAdv);
      repairShip();
      H.panel(); G.bNeedSave = true;
      comCursor(); H.checkGameOver();
    } else { comOut(COMSTR.BADADV); return -1; }
  } else if (cmd.includes("GETS")) {
    const p = cmd.indexOf("GETS") + 5;
    const nX = cmd.charCodeAt(p) - 0x31, nY = cmd.charCodeAt(p + 2) - 0x31;
    if (nX > 7 || nX < 0 || nY > 7 || nY < 0) { comOut(COMSTR.XYERR); return -1; }
    const dx = nX - G.nEntX, dy = nY - G.nEntY;
    let nDeg = 0, nDist = 0;
    if (dx || dy) { nDeg = coordsToDeg(dx, dy); nDist = getWarpFromPoints(G.nEntX, G.nEntY, nX, nY); }
    comOut(spf(COMSTR.SECTDIR, nDist, nDeg));
    comCursor();
  } else if (cmd.includes("RER")) {
    showMsgIdStr(COMSTR.MSGRER);
    comOut(COMSTR.REROUTE);
    G.bReRoute = true;
  } else if (cmd.includes("UNR")) {
    G.bReRoute = false;
    showMsgIdStr(COMSTR.MSGUNR);
    comOut(COMSTR.UNROUTE);
  } else if (cmd.includes("DAM")) {
    damReport();
  } else if (cmd.includes("ANA")) {
    analysisReport();
  } else if (cmd.includes("BYE") || cmd.includes("EXI")) {
    comCursor(); Snd.play("exec", false);
    return 0;
  } else if (cmd.includes("> ")) {
    comCursor();
  } else {
    comErr();
  }
  return -1;
}
let comErrCount = 0;
function comErr() {
  if (++comErrCount === 8) { comOut(COMSTR.MANUAL); comErrCount = 0; }
  else comOut(COMSTR.INVALID);
}
function displayBaseInfo(nQuad) {
  const nEX = XQUAD(G.nEntQ) + 1, nEY = YQUAD(G.nEntQ) + 1;
  let pt;
  if (G.qd[nQuad].Flags & QFLAG_LRS) {
    comOut(spf(COMSTR.BASELOC, XQUAD(nQuad) + 1, YQUAD(nQuad) + 1));
    pt = { x: XQUAD(nQuad) + 1, y: YQUAD(nQuad) + 1 };
  } else {
    pt = { x: XQUAD(nQuad) + getRand(4), y: YQUAD(nQuad) + getRand(4) };
    if (!pt.x) pt.x++;
    if (!pt.y) pt.y++;
    if (pt.x > 8) pt.x = 8;
    if (pt.y > 8) pt.y = 8;
    comOut(spf(COMSTR.BASEERR, pt.x, pt.y));
  }
  let nDeg = 0, nWarp = 0;
  if (nQuad !== G.nEntQ) {
    nDeg = coordsToDeg(pt.x - nEX, pt.y - nEY);
    nWarp = getWarpFromPoints(nEX, nEY, pt.x, pt.y);
  }
  comOut(spf(COMSTR.BASEDIR, nWarp, nDeg));
}
function displayObjectInfo(nY, nX) {
  const o = getQObj(nY, nX);
  let nA;
  switch (o) {
    case OBJ_BASE: comOut(spf(COMSTR.SCANBAS, nX + 1, nY + 1)); break;
    case OBJ_STAR0: comOut(spf(COMSTR.SCANSTR, "A", nX + 1, nY + 1)); break;
    case OBJ_STAR1: comOut(spf(COMSTR.SCANSTR, "B", nX + 1, nY + 1)); break;
    case OBJ_STAR2:
      comOut(spf(COMSTR.SCANSTR, "X", nX + 1, nY + 1));
      if (G.qd[G.nEntQ].Flags & QFLAG_RIC) comOut(COMSTR.SCANSTR2);
      break;
    case OBJ_KLINGON: case OBJ_ROMULAN: case OBJ_FARENG: case OBJ_BORG:
      nA = findAlien(G.nEntQ, nX, nY);
      if (nA === -1) { fatal(); break; }
      comOut(spf(o === OBJ_KLINGON ? COMSTR.SCANKLI : o === OBJ_ROMULAN ? COMSTR.SCANROM :
        o === OBJ_BORG ? COMSTR.SCANBRG : COMSTR.SCANFRG, nX + 1, nY + 1, G.pAL[nA].Energy));
      comOut(spf(COMSTR.PHODATA, coordsToDeg(nX - G.nEntX, nY - G.nEntY),
        getWarpFromPoints(G.nEntX, G.nEntY, nX, nY)));
      break;
  }
}
function damReport() {
  const fmt = (key, s) => {
    if (G.rep[s] > 0.0) return Number(G.repAt[s]).toFixed(1);
    if (!G.rep[s]) return "OK";
    return "DESTROYED";
  };
  comOut(spf(COMSTR.DAMMSG, fmt(0, "MSG")));
  comOut(spf(COMSTR.DAMPAN, fmt(0, "PAN")));
  comOut(spf(COMSTR.DAMSRS, fmt(0, "SRS")));
  comOut(spf(COMSTR.DAMLRS, fmt(0, "LRS")));
  comOut(spf(COMSTR.DAMNAV, fmt(0, "NAV")));
  comOut(spf(COMSTR.DAMSHE, fmt(0, "SHE")));
  comOut(spf(COMSTR.DAMPHA, fmt(0, "PHA")));
  comOut(spf(COMSTR.DAMPHO, fmt(0, "PHO")));
  comOut(spf(COMSTR.DAMDAM, fmt(0, "DAM")));
}
function analysisReport() {
  const fMissionReq = G.fMissionL / G.nAlienTotal;
  const destroyed = G.nAlienTotal - G.nAlienCnt;
  const fCurr = destroyed > 5 ? (G.fStarDNow - G.fStarDStart) / destroyed : 0.0;
  const fWin = ((G.fStarDStart + G.fMissionL) - G.fStarDNow) / G.nAlienCnt;
  comOut(COMSTR.ANAHEAD);
  comOut(spf(COMSTR.ANAGAM, fMissionReq));
  if (fCurr) comOut(spf(COMSTR.ANANOW1, fCurr)); else comOut(COMSTR.ANANOW2);
  comOut(spf(COMSTR.ANAREQ, fWin));
  if (destroyed >= Math.floor(G.nAlienTotal / 4)) {
    if (fCurr) {
      if (fCurr > fMissionReq) comOut(COMSTR.ANAANA2);
      else comOut(COMSTR.ANAANA1);
    } else comCursor();
  } else comCursor();
}
function doRicochet() {
  if (G.bSRSBusy) { comOut(COMSTR.SRSBUSY); return; }
  let i = 10;
  const tick = () => {
    comOut(spf(COMSTR.RICCOUNT, i));
    if (--i < 0) { ricochetToQuad(); return; }
    setTimeout(tick, 500);
  };
  tick();
}

/* ---------- messages (MSG.C) ---------- */
const msgLines = new Array(30).fill("");
function showMsg(id, ...args) { pushMsg(spf(MSG[id], ...args)); }
function showMsgId(i, arr) { pushMsg(arr[i]); }
function showMsgIdStr(s) { pushMsg(s); }
function pushMsg(s) {
  if (G.bReRoute) { comOut(s + "\n"); return; }
  if (G.rep.MSG) return;                    /* message window damaged */
  for (let i = 1; i < 30; i++) msgLines[i - 1] = msgLines[i];
  msgLines[29] = s;
  H.invalidateMSG();
}
function comOut(s) { H.comOut(s); }
function comCursor() { H.comChar(">"); }

/* ---------- save / load (LOADSAVE.C) ---------- */
function serializeGame() {
  return {
    sig: "STW", nSkill: G.nSkill,
    qd: G.qd.map(q => ({ S: q.Stars, B: q.Bases, A: q.Aliens, F: q.Flags,
      O: q.Obj.map(row => Array.from(row)) })),
    pAL: G.pAL, nStarBaseCnt: G.nStarBaseCnt, nTotStars: G.nTotStars,
    fStarDStart: G.fStarDStart, fStarDNow: G.fStarDNow,
    nAlienTotal: G.nAlienTotal, nAlienCnt: G.nAlienCnt,
    nDilithium: G.nDilithium, nShields: G.nShields, nPhotonCnt: G.nPhotonCnt,
    rep: G.rep, repAt: G.repAt, fMissionL: G.fMissionL,
    nEntQ: G.nEntQ, nEntX: G.nEntX, nEntY: G.nEntY, bReRoute: G.bReRoute
  };
}
function deserializeGame(d) {
  if (!d || d.sig !== "STW") return false;
  G.nSkill = d.nSkill;
  G.qd = d.qd.map(q => ({ Stars: q.S, Bases: q.B, Aliens: q.A, Flags: q.F,
    Obj: q.O.map(r => Uint16Array.from(r)) }));
  G.pAL = d.pAL;
  G.nStarBaseCnt = d.nStarBaseCnt; G.nTotStars = d.nTotStars;
  G.fStarDStart = d.fStarDStart; G.fStarDNow = d.fStarDNow;
  G.nAlienTotal = d.nAlienTotal; G.nAlienCnt = d.nAlienCnt;
  G.nDilithium = d.nDilithium; G.nShields = d.nShields; G.nPhotonCnt = d.nPhotonCnt;
  G.rep = d.rep; G.repAt = d.repAt; G.fMissionL = d.fMissionL;
  G.nEntQ = d.nEntQ; G.nEntX = d.nEntX; G.nEntY = d.nEntY; G.bReRoute = d.bReRoute;
  msgLines.fill(""); H.clearMsgBuffer();
  G.bResetTick = true;
  updateLRS(G.nEntQ);
  H.createGameUI();
  setCondition();                       /* Status panel WM_CREATE -> SetCondition */
  showMsg("RESUME");
  G.bNeedSave = false;
  comOut("\n>");
  return true;
}
function destroyGame() {
  Snd.kill();
  H.destroyGameUI();
  G.nSkill = G.nINISkill || G.nSkill;
  G.pAL = null; G.qd = null;
  G.Condition = "no"; G.bResetTick = true; G.GameOverType = "";
  msgLines.fill(""); H.clearMsgBuffer();
  H.menuNoGame();
}

/* ---------- scoring (INIT.C GameIsOver) ---------- */
function computeScore() {
  let nScore = Math.trunc((G.fMissionL - (G.fStarDNow - G.fStarDStart)) * 100.0)
    + G.nAlienTotal * 10 - G.nStarBaseCnt * 12;
  if (G.nStarBaseCnt === 1) nScore += 100;
  return nScore;
}
function loadScores() {
  try { return JSON.parse(localStorage.getItem("wintrek.scr")) || null; } catch (e) { return null; }
}
function emptyScores() { return Array.from({ length: 10 }, () => ["-", "-", "-"]); }
function submitScore(nScore, cb) {
  const scr = loadScores() || emptyScores();
  let placed = -1;
  for (let i = 0; i < 10; i++) {
    if (nScore > (parseInt(scr[i][2], 10) || 0)) { placed = i; break; }
  }
  if (placed === -1) { cb(false); return; }
  UI.hiScoreDialog(name => {
    name = (name || "-").split(/[\t ]/)[0].slice(0, 15) || "-";
    scr[placed] = [name, SKILL_NAMES[G.nSkill], String(nScore)];
    localStorage.setItem("wintrek.scr", JSON.stringify(scr));
    cb(true);
  });
}

/* ---------- misc ---------- */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
