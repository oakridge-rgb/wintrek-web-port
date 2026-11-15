/* ============================================================
 * WinTrek web port — UI / windows / sound / input
 * Windows 3.1 MDI look; all geometry from the original sources.
 * ============================================================ */
"use strict";

/* ---------- assets ---------- */
const IMG = {};
const AUDIO = {};
let audioCtx = null, audioUnlocked = false;

async function loadAssets() {
  const names = ["alert","base","borg","btncom","btndam","btnlrs","btnnav","btnpha","btnpho",
    "btnshe","btnsrs","checked","course","dam","distance","entl","entr","execute","explbasd","explbrg",
    "explbrgd","explentl","explentr","explfar","explfard","explklg","explklgd","explrom",
    "explromd","fareng","impulse","klingon","lineart","lrblock","memo","numeric","numericg",
    "openent","phasbox","photon","romulan","score","shedil","sheshe","ship","singwide",
    "star0","star1","star2","stpanel","tlockbox","tlockon","unchcked","warp",
    "main.ico","panel.ico","msg.ico","btn.ico","srs.ico","lrs.ico","nav.ico","pho.ico",
    "pha.ico","she.ico","dam.ico","com.ico"];
  await Promise.all(names.map(n => new Promise(res => {
    const im = new Image();
    im.onload = () => { IMG[n] = im; res(); };
    im.onerror = () => { console.warn("missing asset", n); res(); };
    im.src = "assets/" + n + ".png";
  })));
  const wavs = ["back","code1","exec","explo","imp","open","phas","phot","phx","phx2","reda","song"];
  await Promise.all(wavs.map(async n => {
    try {
      const r = await fetch("assets/" + n + ".wav");
      AUDIO[n] = await r.arrayBuffer();
    } catch (e) { console.warn("missing wav", n); }
  }));
}

function ensureAudio() {
  if (audioCtx) { if (audioCtx.state === "suspended") audioCtx.resume(); return; }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioUnlocked = true;
    Snd.decodeAll();
  } catch (e) { /* no audio */ }
}

/* ---------- sound (SOUND.C single-channel model) ---------- */
const Snd = {
  bufs: {}, cur: null, curId: "", wantBack: false,
  decodeAll() {
    for (const k in AUDIO) {
      if (!AUDIO[k]) continue;
      audioCtx.decodeAudioData(AUDIO[k].slice(0)).then(b => { this.bufs[k] = b; if (k === "back" && this.wantBack) { this.wantBack = false; this.play("back", true); } }).catch(() => {});
    }
  },
  stop() {
    if (this.cur) { try { this.cur.stop(); } catch (e) {} this.cur = null; this.curId = ""; }
  },
  play(id, loop) {
    if (!G.nINISounds || !audioCtx || !this.bufs[id]) return;
    if (this.curId === id) return;                    /* C: wPlaying == id -> return */
    this.stop();
    this.start(id, loop);
  },
  playEx(id, loop) {                                   /* SND_NOSTOP: start only when free */
    if (!G.nINISounds || !audioCtx || !this.bufs[id]) return;
    if (this.cur) return;
    this.start(id, loop);
  },
  start(id, loop) {
    const src = audioCtx.createBufferSource();
    src.buffer = this.bufs[id];
    src.loop = !!loop;
    src.onended = () => { if (this.cur === src) { this.cur = null; this.curId = ""; } };
    src.connect(audioCtx.destination);
    src.start();
    this.cur = src; this.curId = id;
  },
  kill() { this.stop(); },
  resumeBackground() {                                 /* ResumeBackground() */
    if (!G.nINISounds || this.curId === "back") return;
    if (G.Condition === "no" || G.Condition === "over" || G.bPaused) return;
    if (!this.cur) this.start("back", true);
    else this.wantBack = true;                          /* start ambient when channel frees */
  }
};

/* ---------- window geometry (ST.H defaults, client sizes) ---------- */
const DEFW = 800, DEFH = 600;
const WINGEO = {
  panel:  { x: 10,  y: 5,   w: 189, h: 236 },
  msg:    { x: 10,  y: 266, w: 320, h: 82  },
  btn:    { x: 350, y: 262, w: 263, h: 90  },
  srs:    { x: 250, y: 5,   w: 315, h: 235 },
  lrs:    { x: 250, y: 5,   w: 360, h: 230 },
  nav:    { x: 250, y: 5,   w: 340, h: 225 },
  pho:    { x: 250, y: 5,   w: 340, h: 225 },
  pha:    { x: 250, y: 5,   w: 340, h: 225 },
  she:    { x: 250, y: 5,   w: 340, h: 225 },
  dam:    { x: 250, y: 5,   w: 340, h: 225 },
  com:    { x: 250, y: 5,   w: 360, h: 230 }
};
const WINTITLE = {
  panel: "Status", msg: "Messages", btn: "Controls", srs: "Short Range Scan",
  lrs: "Long Range Scan", nav: "Navigation", pho: "Photon Torpedoes",
  pha: "Phasers", she: "Shields", dam: "Damage Report", com: "Computer"
};
const CONTROLS = ["srs", "lrs", "nav", "she", "pho", "pha", "dam", "com"];
const SRSX = WINGEO.srs.w, SRSY = WINGEO.srs.h;
const XBM = 36, YBM = 27, XOFF = SRSX - XBM * 8, YOFF = SRSY - YBM * 8;   /* 27, 19 */
const CLR = { black: "#000000", dkred: "#800000", red: "#ff0000", green: "#00ff00",
  yellow: "#ffff00", blue: "#0000ff", purple: "#ff00ff", aqua: "#00ffff",
  gray: "#c0c0c0", dkgray: "#808080", white: "#ffffff", navy: "#000080",
  dkpurple: "#800080", dkyellow: "#808000", dkaqua: "#008080", dkgreen: "#008000" };

const client = document.getElementById("client");
const desk = document.getElementById("desk");
let zTop = 10;
const wins = {};             /* id -> {el, body, cv, ctx, minimized, id} */
let focusedWin = null;
let iconStrip = document.getElementById("iconbar");

/* ---------- MDI child window ---------- */
function makeWin(id) {
  const g = WINGEO[id];
  const el = document.createElement("div");
  el.className = "wt-win";
  el.style.left = g.x + "px"; el.style.top = g.y + "px";
  el.style.width = (g.w + 8) + "px"; el.style.height = (g.h + 26) + "px";
  el.innerHTML =
    '<div class="wt-tbar"><div class="sys">-</div><div class="ttl">' + WINTITLE[id] +
    '</div><div class="min">\u25BC</div></div><div class="wt-body"></div>';
  client.appendChild(el);
  const body = el.querySelector(".wt-body");
  const cv = document.createElement("canvas");
  cv.width = g.w; cv.height = g.h;                /* canvas == original client size */
  body.appendChild(cv);
  const w = { id, el, body, cv, ctx: cv.getContext("2d"), minimized: false };
  wins[id] = w;

  el.addEventListener("pointerdown", () => { activateWin(id, false); }, true);
  const tbar = el.querySelector(".wt-tbar");
  tbar.addEventListener("pointerdown", ev => {
    if (ev.target.classList.contains("sys") || ev.target.classList.contains("min")) return;
    startDrag(ev, w);
  });
  el.querySelector(".sys").addEventListener("click", () => minimizeWin(id));
  el.querySelector(".min").addEventListener("click", () => minimizeWin(id));
  return w;
}
function startDrag(ev, w) {
  const sx = ev.clientX, sy = ev.clientY;
  const ox = w.el.offsetLeft, oy = w.el.offsetTop;
  w.el.setPointerCapture && ev.target.setPointerCapture(ev.pointerId);
  const move = e => {
    const nx = ox + e.clientX - sx, ny = oy + e.clientY - sy;
    w.el.style.left = Math.max(-w.el.offsetWidth + 60, Math.min(client.clientWidth - 30, nx)) + "px";
    w.el.style.top = Math.max(0, Math.min(client.clientHeight - 22, ny)) + "px";
  };
  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
function activateWin(id, viaButton) {
  const w = wins[id];
  if (!w) return;
  if (w.minimized) restoreWin(id);
  if (viaButton && G.nINISingle && CONTROLS.includes(id)) {
    for (const c of CONTROLS) {
      if (c === id || !wins[c] || wins[c].minimized) continue;
      if (c === "com" && G.bReRoute) continue;
      minimizeWin(c);
    }
  }
  w.el.style.zIndex = ++zTop;
  w.el.querySelector(".wt-tbar").classList.add("active");
  for (const k in wins) if (k !== id) wins[k].el.querySelector(".wt-tbar").classList.remove("active");
  focusedWin = id;
  if (id === "com") { comFocus(true); } else { comFocus(false); }
  if (id === "pha" && wins.pha) {               /* WM_MDIACTIVATE */
    PHA.nTmpDil = G.nDilithium - PHA.nTmpPha;
    if (PHA.nTmpDil <= 50) { PHA.nTmpDil = G.nDilithium; PHA.nTmpPha = 0; }
    phaSetLocked(); paintPHA();
  }
  if (id === "she" && wins.she && (SHE.nTmpShe !== G.nShields || SHE.nTmpDil !== G.nDilithium)) {
    sheRefresh();
  }
}
function minimizeWin(id) {
  const w = wins[id];
  if (!w || w.minimized) return;
  w.minimized = true;
  w.el.style.display = "none";
  const ic = document.createElement("div");
  ic.className = "mdi-icon"; ic.dataset.for = id;
  ic.innerHTML = '<img src="assets/' + id + '.ico.png" alt=""><div class="lbl">' + WINTITLE[id] + "</div>";
  ic.addEventListener("click", () => restoreWin(id));
  iconStrip.appendChild(ic);
  if (focusedWin === id) focusedWin = null;
  if (id === "pha") phaLockTimerOff();
  if (id === "she") sheOvalTimerOff();
}
function restoreWin(id) {
  const w = wins[id];
  if (!w || !w.minimized) return;
  w.minimized = false;
  w.el.style.display = "flex";
  const ic = iconStrip.querySelector('[data-for="' + id + '"]');
  if (ic) ic.remove();
  repaintWin(id);
  activateWin(id, false);
  if (id === "pha") phaSetLocked();
  if (id === "she") sheSetOval();
}
function repaintWin(id) { Paint[id] && Paint[id](); }

/* ---------- desktop background stars (ST.C PaintMain) ---------- */
let deskStars = [];
function paintDeskStars() {
  desk.querySelectorAll("canvas.stars").forEach(c => c.remove());
  const n = Math.floor(client.clientWidth / 16) * Math.floor(client.clientHeight / 16);
  const cv = document.createElement("canvas");
  cv.className = "stars";
  cv.width = client.clientWidth; cv.height = client.clientHeight;
  const ctx = cv.getContext("2d");
  for (let i = 0; i < n; i++) {
    const x = Math.floor(Math.random() * cv.width), y = Math.floor(Math.random() * cv.height);
    const c = (x & 3) === 1 ? CLR.white : (x & 3) === 2 ? CLR.gray : CLR.dkgray;
    ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
    deskStars.push({ x, y });
  }
  desk.prepend(cv);
}

/* ---------- no-game screen (line art + prompt) ---------- */
function showNoGame() {
  let ng = document.getElementById("no-game");
  if (!ng) {
    ng = document.createElement("div");
    ng.id = "no-game";
    ng.innerHTML = '<img src="assets/lineart.png" width="188" height="64">' +
      '<div class="prompt">Choose NEW or OPEN from the File Menu to begin...</div>';
    desk.appendChild(ng);
  }
  ng.style.display = "flex";
}
function hideNoGame() { const ng = document.getElementById("no-game"); if (ng) ng.style.display = "none"; }

/* ---------- LED digit rendering (UTILS.C DrawNumber) ---------- */
const DIGMAP = { "-": 0, "9": 2, "8": 3, "7": 4, "6": 5, "5": 6, "4": 7, "3": 8,
  "2": 9, "1": 10, "0": 11, ".": 12 };
function drawNumber(ctx, s, x, y, bmp) {
  let xoff = 0;
  for (const ch of s) {
    const idx = DIGMAP[ch] === undefined ? 1 : DIGMAP[ch];
    if (idx === 12) {                 /* decimal overlays previous cell (SRCPAINT) */
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(bmp, 0, 12 * 18, 13, 18, x + xoff - 13, y, 13, 18);
      ctx.restore();
    } else {
      ctx.drawImage(bmp, 0, idx * 18, 13, 18, x + xoff, y, 13, 18);
      xoff += 13;
    }
  }
}

/* ---------- Status panel (PANEL.C) ---------- */
const XY_STARDATE = [110, 15], XY_QUAD = [110, 42], XY_SECTOR = [110, 69],
  XY_DILITH = [110, 96], XY_SHE = [110, 123], XY_PHO = [110, 150],
  XY_ALIENS = [110, 204], XY_COND = [121, 173];
function paintPanel() {
  const w = wins.panel; if (!w) return;
  const c = w.ctx;
  c.fillStyle = CLR.black; c.fillRect(0, 0, w.cv.width, w.cv.height);
  if (IMG.stpanel) c.drawImage(IMG.stpanel, 0, 0);
  if (G.rep.PAN) return;                       /* panel damaged: no digits */
  const D = IMG.numeric;
  drawNumber(c, spf("%5.1f", G.fStarDNow), XY_STARDATE[0], XY_STARDATE[1], D);
  drawNumber(c, spf("  %d-%d", XQUAD(G.nEntQ) + 1, YQUAD(G.nEntQ) + 1), XY_QUAD[0], XY_QUAD[1], D);
  drawNumber(c, spf("  %d-%d", G.nEntX + 1, G.nEntY + 1), XY_SECTOR[0], XY_SECTOR[1], D);
  drawNumber(c, spf("%5d", G.nDilithium), XY_DILITH[0], XY_DILITH[1], D);
  drawNumber(c, spf("%5d", G.nShields), XY_SHE[0], XY_SHE[1], D);
  drawNumber(c, spf("%5d", G.nPhotonCnt), XY_PHO[0], XY_PHO[1], D);
  drawNumber(c, spf("%5d", G.nAlienCnt), XY_ALIENS[0], XY_ALIENS[1], D);
  drawConditionLamp(c);
}
function drawConditionLamp(c) {
  let nY;
  switch (G.Condition) {
    case "green": nY = 0; break; case "blue": nY = 25; break;
    case "redoff": nY = 50; break; case "redon": nY = 75; break;
    case "yoff": nY = 100; break; case "yon": nY = 125; break;
    default: return;
  }
  if (IMG.alert) c.drawImage(IMG.alert, 0, nY, 40, 25, XY_COND[0], XY_COND[1], 40, 25);
}

/* ---------- Messages window (MSG.C) ---------- */
function paintMSG() {
  const w = wins.msg; if (!w) return;
  const c = w.ctx;
  c.fillStyle = CLR.black; c.fillRect(0, 0, w.cv.width, w.cv.height);
  if (G.rep.MSG) return;
  c.font = "13px Arial, Helvetica, sans-serif";
  c.textBaseline = "top";
  const lh = 15;
  const vis = Math.floor(w.cv.height / lh);
  const first = Math.max(0, 30 - vis);
  for (let i = first; i < 30; i++) {
    if (!msgLines[i]) continue;
    if (G.Condition === "redon" || G.Condition === "redoff") c.fillStyle = CLR.red;
    else if (G.Condition === "yon" || G.Condition === "yoff") c.fillStyle = CLR.yellow;
    else c.fillStyle = CLR.green;
    c.fillText(msgLines[i], 3, (i - first) * lh + 1);
  }
}

/* ---------- Controls window (BTN.C) ---------- */
const BTNPOS = [[10,10],[72,10],[134,10],[196,10],[10,48],[72,48],[134,48],[196,48]];
let btnPressed = -1;
function paintBTN() {
  const w = wins.btn; if (!w) return;
  const c = w.ctx;
  c.fillStyle = CLR.gray; c.fillRect(0, 0, w.cv.width, w.cv.height);
  for (let i = 0; i < 8; i++) {
    const bmp = IMG["btn" + CONTROLS[i]];
    if (!bmp) continue;
    const x = BTNPOS[i][0] + 3, y = BTNPOS[i][1] + 3;
    if (btnPressed === i) {
      c.save();
      c.globalCompositeOperation = "difference";
      c.drawImage(bmp, x, y);
      c.restore();
    } else c.drawImage(bmp, x, y);
  }
}
function initBTN() {
  const w = wins.btn; if (!w) return;
  const hit = ev => {
    const r = w.cv.getBoundingClientRect();
    const x = (ev.clientX - r.left) * (w.cv.width / r.width);
    const y = (ev.clientY - r.top) * (w.cv.height / r.height);
    for (let i = 0; i < 8; i++) {
      if (x >= BTNPOS[i][0] && x < BTNPOS[i][0] + 60 && y >= BTNPOS[i][1] && y < BTNPOS[i][1] + 36)
        return i;
    }
    return -1;
  };
  w.cv.addEventListener("pointerdown", ev => {
    const i = hit(ev);
    if (i < 0 || G.bSRSBusy) return;
    btnPressed = i; paintBTN();
    const up = () => { btnPressed = -1; paintBTN();
      window.removeEventListener("pointerup", up); };
    window.addEventListener("pointerup", up);
  });
  w.cv.addEventListener("pointerup", ev => {
    const i = hit(ev);
    if (i >= 0 && btnPressed === i) activateWin(CONTROLS[i], true);
  });
}

/* ---------- SRS window (SRS.C) ---------- */
function sectorRect(x, y) {   /* GetSectorRect: +2 offsets */
  return { x: XOFF + x * XBM + 2, y: YOFF + y * YBM + 2, w: 34, h: 25 };
}
function paintSRS() {
  const w = wins.srs; if (!w) return;
  const c = w.ctx;
  c.fillStyle = CLR.black; c.fillRect(0, 0, w.cv.width, w.cv.height);
  if (!G.qd) return;
  if (G.bInWarp && !G.rep.SRS) return;
  /* grid frame + ticks (red) */
  c.strokeStyle = CLR.red; c.lineWidth = 1;
  const right = w.cv.width, bottom = w.cv.height;
  c.beginPath();
  c.moveTo(XOFF + .5, YOFF + .5); c.lineTo(right, YOFF + .5);
  c.moveTo(XOFF + .5, YOFF + .5); c.lineTo(XOFF + .5, bottom);
  for (let i = 0; i < 8; i++) {
    c.moveTo(XOFF + XBM * i + .5, YOFF + .5); c.lineTo(XOFF + XBM * i + .5, YOFF + 4.5);
    c.moveTo(XOFF + XBM * i + .5, bottom - 3.5); c.lineTo(XOFF + XBM * i + .5, bottom);
    c.moveTo(XOFF + .5, YOFF + YBM * i + .5); c.lineTo(XOFF + 4.5, YOFF + YBM * i + .5);
    c.moveTo(right - 3.5, YOFF + YBM * i + .5); c.lineTo(right, YOFF + YBM * i + .5);
  }
  c.stroke();
  if (G.rep.SRS || G.bInWarp) return;          /* broken sensors: frame only */
  c.font = "13px Arial, Helvetica, sans-serif";
  c.fillStyle = CLR.red; c.textAlign = "center"; c.textBaseline = "middle";
  for (let i = 0; i < 8; i++) {
    c.fillText(String(i + 1), XOFF + XBM * i + XBM / 2, YOFF / 2);
    c.fillText(String(i + 1), XOFF / 2, YOFF + YBM * i + YBM / 2);
  }
  c.textAlign = "left";
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      drawObjAt(c, j, i, 1);                  /* PaintSRS draws at +1 */
  /* lingering photon, if any */
  if (PHO_LINGER) c.drawImage(IMG.photon, XOFF + PHO_LINGER.x * XBM + 2 + 15,
    YOFF + PHO_LINGER.y * YBM + 2 + 9);
}
function drawObjAt(c, x, y, off) {
  const o = G.qd ? (G.qd[G.nEntQ].Obj[y][x] & 0xff) : 0;
  const bmp = objToBmp(o);
  if (!bmp) return;
  const inc = incOf(G.nEntQ, y, x);
  let sy = 0;
  if (o === OBJ_BASE || (o & OBJ_STARMASK)) sy = (inc & 3) * 25;
  c.drawImage(bmp, 0, sy, 34, 25, XOFF + x * XBM + off, YOFF + y * YBM + off, 34, 25);
}
function objToBmp(o) {
  switch (o) {
    case OBJ_ENTL: return IMG.entl; case OBJ_ENTR: return IMG.entr;
    case OBJ_BASE: return IMG.base;
    case OBJ_STAR0: return IMG.star0; case OBJ_STAR1: return IMG.star1;
    case OBJ_STAR2: return IMG.star2;
    case OBJ_KLINGON: return IMG.klingon; case OBJ_ROMULAN: return IMG.romulan;
    case OBJ_FARENG: return IMG.fareng; case OBJ_BORG: return IMG.borg;
    default: return null;
  }
}
/* 200ms animation tick (AnimProc): stars/base 4-frame cycle */
function srsAnimTick() {
  if (!wins.srs || wins.srs.minimized || G.rep.SRS || G.bAbortProc || G.bPaused) return;
  if (!G.qd || (!G.qd[G.nEntQ].Bases && !G.qd[G.nEntQ].Stars)) return;
  const c = wins.srs.ctx;
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const o = G.qd[G.nEntQ].Obj[i][j] & 0xff;
      if (o === OBJ_BASE || (o & OBJ_STARMASK)) {
        if (o === OBJ_BASE && G.bSRSBusy) continue;
        const inc = incOf(G.nEntQ, i, j) & 3;
        const bmp = objToBmp(o);
        c.drawImage(bmp, 0, inc * 25, 34, 25, XOFF + j * XBM + 1, YOFF + i * YBM + 1, 34, 25);
        incObjInc(G.nEntQ, i, j);
        if (((G.qd[G.nEntQ].Obj[i][j] >> 8) & 0xff) > 3)
          G.qd[G.nEntQ].Obj[i][j] &= 0x00ff;
      }
    }
}
const Paint = { panel: paintPanel, msg: paintMSG, btn: paintBTN, srs: paintSRS,
  lrs: paintLRS, nav: paintNAV, pho: paintPHO, pha: paintPHA, she: paintSHE,
  dam: paintDAM, com: paintCOM };
let PHO_LINGER = null;

/* ---------- LRS window (LRS.C) ---------- */
function paintLRS() {
  const w = wins.lrs; if (!w) return;
  const c = w.ctx;
  c.fillStyle = CLR.black; c.fillRect(0, 0, w.cv.width, w.cv.height);
  const xs = Math.floor(w.cv.width / 9), ys = Math.floor(w.cv.height / 9);
  const right = w.cv.width, bottom = w.cv.height;
  c.strokeStyle = CLR.blue; c.lineWidth = 1;
  c.beginPath();
  for (let i = 8; i >= 0; i--) {
    c.moveTo(right, bottom - ys * i + .5); c.lineTo(right - xs * 8, bottom - ys * i + .5);
  }
  for (let i = 1; i < 9; i++) {
    c.moveTo(right - xs * i + .5, bottom); c.lineTo(right - xs * i + .5, bottom - ys * 8);
  }
  c.stroke();
  if (G.rep.LRS || !G.qd) return;
  c.font = "13px Arial, Helvetica, sans-serif";
  c.textAlign = "center"; c.textBaseline = "middle";
  c.fillStyle = CLR.blue;
  let sz = 1;
  for (let i = 8; i > 0; i--) c.fillText(String(sz++), right - xs * i + xs / 2, ys / 2);
  sz = 8;
  for (let i = 1; i < 9; i++) c.fillText(String(sz--), xs / 2, bottom - ys * i + ys / 2);
  c.fillStyle = CLR.red;
  for (let i = 63; i >= 0; i--) {
    if (G.qd[i].Flags & QFLAG_LRS) {
      const qx = i % 8, qy = i >> 3;
      const cx = right - (8 - qx) * xs + xs / 2, cy = bottom - (8 - qy) * ys + ys / 2;
      const s = String(G.qd[i].Aliens % 10) + String(G.qd[i].Bases % 10) + String(G.qd[i].Stars % 10);
      const flash = (qx === XQUAD(G.nEntQ) && qy === YQUAD(G.nEntQ) && lrsFlashTog);
      c.fillStyle = flash ? CLR.dkred : CLR.red;
      c.fillText(s, cx, cy);
    }
  }
  c.textAlign = "left";
}
let lrsFlashTog = false;
function lrsFlashTick() {
  lrsFlashTog = !lrsFlashTog;
  if (!wins.lrs || wins.lrs.minimized || G.rep.LRS || G.bPaused || !G.qd) return;
  paintLRS();                       /* cheap full repaint, matches visible effect */
}

/* ---------- NAV / PHO windows (NAV.C, PHO.C) ---------- */
const NAVEXEC = 6, XYEXEC = [16, 166], XYCOURS = [150, 6], XCENTER = 240, YCENTER = 84,
  XYCOURSDIG = [220, 166];
const NAVBTN = { warpup: [41, 29, 56, 45], warpdn: [94, 29, 108, 45],
  impup: [41, 104, 56, 120], impdn: [94, 104, 108, 120],
  couup: [195, 167, 211, 183], coudn: [267, 167, 283, 183] };
function paintNavShared(c, W) {
  c.fillStyle = CLR.black; c.fillRect(0, 0, W.cv.width, W.cv.height);
}
function paintNAV() {
  const w = wins.nav; if (!w) return;
  const c = w.ctx;
  paintNavShared(c, w);
  c.drawImage(IMG.execute, XYEXEC[0], XYEXEC[1]);
  if (!G.rep.NAV) {
    c.drawImage(IMG.warp, 16, 16);
    drawNumber(c, String(NAV.nWarpNum), 69, 28, IMG.numericg);
  } else {
    c.fillStyle = CLR.black; c.fillRect(16, 16, 117, 61);
  }
  c.drawImage(IMG.impulse, 16, 91);
  drawNumber(c, String(NAV.nImpNum), 69, 103, IMG.numericg);
  c.drawImage(IMG.course, XYCOURS[0], XYCOURS[1]);
  drawNumber(c, courseToAscii(NAV.nCourseNum), XYCOURSDIG[0], XYCOURSDIG[1], IMG.numericg);
  drawNeedle(c, XCENTER, YCENTER, -1, NAV.nCourseNum);
}
function paintPHO() {
  const w = wins.pho; if (!w) return;
  const c = w.ctx;
  paintNavShared(c, w);
  c.drawImage(IMG.execute, XYEXEC[0], XYEXEC[1]);
  c.drawImage(IMG.distance, 16, 46);
  if (!G.rep.PHO) drawNumber(c, String(PHO.nDistNum), 69, 58, IMG.numericg);
  c.drawImage(IMG.course, XYCOURS[0], XYCOURS[1]);
  if (!G.rep.PHO) {
    drawNumber(c, courseToAscii(PHO.nCourseNum), XYCOURSDIG[0], XYCOURSDIG[1], IMG.numericg);
    drawNeedle(c, XCENTER, YCENTER, -1, PHO.nCourseNum);
  }
}
function courseToAscii(n) {
  if (n < 0) return "   ";
  return ("   " + n).slice(-3);
}
function drawNeedle(c, cx, cy, oldCourse, newCourse) {
  c.lineWidth = 1;
  if (oldCourse >= 0) {
    const p = degToCoords(oldCourse, 50);
    c.strokeStyle = CLR.black;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + p.x, cy + p.y); c.stroke();
  }
  if (newCourse >= 0) {
    const p = degToCoords(newCourse, 50);
    c.strokeStyle = CLR.green;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + p.x, cy + p.y); c.stroke();
  }
}

/* fake buttons: pointer rects, invert on press, auto-repeat */
function pressRect(w, rect, fnDown, fnRepeat, delayMs, execOnUp) {
  const r = w.cv.getBoundingClientRect();
  const pt = ev => ({
    x: (ev.clientX - r.left) * (w.cv.width / r.width),
    y: (ev.clientY - r.top) * (w.cv.height / r.height)
  });
  let timer = null, pressed = false;
  const invert = on => {
    const c = w.ctx;
    c.save();
    c.globalCompositeOperation = "difference";
    c.fillStyle = "#fff";
    c.fillRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
    c.restore();
  };
  w.cv.addEventListener("pointerdown", ev => {
    if (G.bSRSBusy) return;
    const p = pt(ev);
    if (p.x < rect[0] || p.x > rect[2] || p.y < rect[1] || p.y > rect[3]) return;
    pressed = true; invert(true); fnDown && fnDown();
    if (fnRepeat) {
      const loop = () => { if (!pressed) return; invert(false); fnRepeat(); invert(true);
        timer = setTimeout(loop, delayMs); };
      timer = setTimeout(() => { if (!pressed) return; invert(false); fnRepeat(); invert(true);
        timer = setTimeout(loop, delayMs); }, 350);
    }
    const up = ev2 => {
      window.removeEventListener("pointerup", up);
      if (!pressed) return;
      pressed = false; clearTimeout(timer);
      invert(false);
      const p2 = pt(ev2);
      if (execOnUp && p2.x >= rect[0] && p2.x <= rect[2] && p2.y >= rect[1] && p2.y <= rect[3])
        execOnUp();
    };
    window.addEventListener("pointerup", up);
  });
}
function circleHit(w, ev) {
  const r = w.cv.getBoundingClientRect();
  const x = (ev.clientX - r.left) * (w.cv.width / r.width) - XCENTER;
  const y = (ev.clientY - r.top) * (w.cv.height / r.height) - YCENTER;
  if (Math.abs(x) > 75 || Math.abs(y) > 75) return null;
  return coordsToDeg(x, y);
}
function courseRepeatStep(dir, cur, inc) {   /* NAV.C +/- course wrap logic */
  if (dir > 0) return cur >= 360 - inc ? 0 : cur + inc;
  if (cur === 0) return 360 - inc;
  if (cur <= inc) return 0;
  return cur - inc;
}

/* NAV state + wiring */
const NAV = { nCourseNum: 0, nWarpNum: 0, nImpNum: 0 };
function initNAV() {
  const w = wins.nav; if (!w) return;
  const drawVals = () => { paintNAV(); };
  pressRect(w, NAVBTN.warpup,
    () => { if (G.rep.NAV || NAV.nWarpNum > 8) return; if (NAV.nImpNum) { NAV.nImpNum = 0; } NAV.nWarpNum++; drawVals(); },
    () => { if (G.rep.NAV || NAV.nWarpNum > 8) return; NAV.nWarpNum++; drawVals(); }, 300);
  pressRect(w, NAVBTN.warpdn,
    () => { if (G.rep.NAV || NAV.nWarpNum < 1) return; NAV.nWarpNum--; drawVals(); },
    () => { if (G.rep.NAV || NAV.nWarpNum < 1) return; NAV.nWarpNum--; drawVals(); }, 300);
  pressRect(w, NAVBTN.impup,
    () => { if (NAV.nImpNum > 8) return; if (NAV.nWarpNum && !G.rep.NAV) NAV.nWarpNum = 0; NAV.nImpNum++; drawVals(); },
    () => { if (NAV.nImpNum > 8) return; NAV.nImpNum++; drawVals(); }, 300);
  pressRect(w, NAVBTN.impdn,
    () => { if (NAV.nImpNum < 1) return; NAV.nImpNum--; drawVals(); },
    () => { if (NAV.nImpNum < 1) return; NAV.nImpNum--; drawVals(); }, 300);
  pressRect(w, NAVBTN.couup, null, () => {
    NAV.nCourseNum = courseRepeatStep(1, NAV.nCourseNum, shiftKey() ? 1 : 5); drawVals(); }, 80);
  pressRect(w, NAVBTN.coudn, null, () => {
    NAV.nCourseNum = courseRepeatStep(-1, NAV.nCourseNum, shiftKey() ? 1 : 5); drawVals(); }, 80);
  pressRect(w, [XYEXEC[0] + 1, XYEXEC[1] + 1, XYEXEC[0] + 116, XYEXEC[1] + 30], null, null, 0,
    () => navExecute());
  w.cv.addEventListener("pointerdown", ev => {
    if (G.bSRSBusy) return;
    const deg = circleHit(w, ev);
    if (deg !== null && deg >= 0) { NAV.nCourseNum = deg; paintNAV(); }
  });
}
function navExecute() {
  if (G.bSRSBusy || (!NAV.nImpNum && !NAV.nWarpNum)) return;
  Snd.play("exec", false);
  activateWin(G.nINIAutoSRS ? "srs" : "nav", true);
  srsExec(async () => {
    if (NAV.nImpNum) await moveEntImpulse(NAV.nCourseNum, NAV.nImpNum);
    else if (!G.rep.NAV) await moveEntWarp(NAV.nCourseNum, NAV.nWarpNum);
  });
}
function shiftKey() { return uiShift; }
let uiShift = false;

/* PHO state + wiring */
const PHO = { nCourseNum: 0, nDistNum: 0 };
function initPHO() {
  const w = wins.pho; if (!w) return;
  const drawVals = () => { paintPHO(); };
  pressRect(w, [41, 59, 56, 75],
    () => { if (G.rep.PHO || PHO.nDistNum > 8) return; PHO.nDistNum++; drawVals(); },
    () => { if (G.rep.PHO || PHO.nDistNum > 8) return; PHO.nDistNum++; drawVals(); }, 300);
  pressRect(w, [94, 59, 108, 75],
    () => { if (G.rep.PHO || PHO.nDistNum < 1) return; PHO.nDistNum--; drawVals(); },
    () => { if (G.rep.PHO || PHO.nDistNum < 1) return; PHO.nDistNum--; drawVals(); }, 300);
  pressRect(w, NAVBTN.couup, null, () => {
    PHO.nCourseNum = courseRepeatStep(1, PHO.nCourseNum, shiftKey() ? 1 : 5); drawVals(); }, 80);
  pressRect(w, NAVBTN.coudn, null, () => {
    PHO.nCourseNum = courseRepeatStep(-1, PHO.nCourseNum, shiftKey() ? 1 : 5); drawVals(); }, 80);
  pressRect(w, [XYEXEC[0] + 1, XYEXEC[1] + 1, XYEXEC[0] + 116, XYEXEC[1] + 30], null, null, 0,
    () => phoExecute());
  w.cv.addEventListener("pointerdown", ev => {
    if (G.bSRSBusy || G.rep.PHO) return;
    const deg = circleHit(w, ev);
    if (deg !== null && deg >= 0) { PHO.nCourseNum = deg; paintPHO(); }
  });
}
function phoExecute() {
  if (G.bSRSBusy || G.rep.PHO) return;
  activateWin(G.nINIAutoSRS ? "srs" : "pho", true);
  Snd.play("exec", false);
  srsExec(async () => {
    if (!G.nPhotonCnt) { showMsg("PHOEMPTY"); return; }
    Snd.playEx("phot", false);
    await firePhoton(PHO.nCourseNum, PHO.nDistNum);
  });
}
/* WM_*EXEC guard (bSRSBusy + wait cursor) */
async function srsExec(fn) {
  if (G.bSRSBusy) return;
  G.bSRSBusy = true;
  document.body.style.cursor = "wait";
  try { await fn(); } finally { G.bSRSBusy = false; document.body.style.cursor = ""; }
}

/* ---------- PHA window (PHA.C) ---------- */
const PHA = { nTmpPha: 0, nTmpDil: 0, bSingle: true, lockTog: false, lockTimer: null };
const PHA_BTN = { dilup: [143, 138, 159, 153], phaup: [176, 138, 192, 153],
  sing: [55, 30, 66, 41], wide: [55, 50, 66, 61], exec: [111, 181, 226, 210] };
function paintPHA() {
  const w = wins.pha; if (!w) return;
  const c = w.ctx;
  c.fillStyle = CLR.black; c.fillRect(0, 0, w.cv.width, w.cv.height);
  c.drawImage(IMG.singwide, 45, 20);
  if (!G.rep.PHA) {
    c.drawImage(PHA.bSingle ? IMG.checked : IMG.unchcked, 55, 30);
    c.drawImage(PHA.bSingle ? IMG.unchcked : IMG.checked, 55, 50);
  } else {
    c.drawImage(IMG.unchcked, 55, 30);
    c.drawImage(IMG.unchcked, 55, 50);
  }
  c.drawImage(IMG.tlockbox, 210, 20);
  if (PHA.lockTog) c.drawImage(IMG.tlockon, 224, 35);
  c.drawImage(IMG.lrblock, 130, 130);
  c.drawImage(IMG.shedil, 10, 125);
  if (!G.rep.PHA) drawNumber(c, spf("%4d", PHA.nTmpDil), 28, 136, IMG.numeric);
  c.drawImage(IMG.phasbox, 240, 125);
  if (!G.rep.PHA) drawNumber(c, spf("%4d", PHA.nTmpPha), 259, 136, IMG.numeric);
  c.drawImage(IMG.execute, 110, 180);
  drawThermo(c, CLR.dkyellow);
}
function drawThermo(c, val2) {                 /* DrawPhaThermo: purple dil / yellow pha */
  const l = 14, t = 98, r = 324, b = 112;
  const width = r - l;
  const tot = PHA.nTmpDil + PHA.nTmpPha || 1;
  const inc = width / tot;
  const dR = l + Math.trunc(inc * PHA.nTmpDil);
  c.fillStyle = CLR.dkred; c.fillRect(10, 90, 318, 30);
  c.fillStyle = CLR.dkpurple; c.fillRect(l, t, dR - l, b - t);
  c.fillStyle = val2; c.fillRect(dR, t, Math.trunc(inc * PHA.nTmpPha), b - t);
  c.strokeStyle = CLR.red; c.strokeRect(10.5, 90.5, 318, 30);
}
function phaRefresh() { PHA.nTmpDil = G.nDilithium - PHA.nTmpPha;
  if (PHA.nTmpDil <= 50) { PHA.nTmpDil = G.nDilithium; PHA.nTmpPha = 0; } paintPHA(); }
function phaSetLocked() {
  if (PHA.lockTimer === null && G.qd && G.qd[G.nEntQ].Aliens && !G.rep.PHA)
    PHA.lockTimer = setInterval(() => {
      if (!wins.pha || wins.pha.minimized || G.rep.PHA || G.bPaused) return;
      PHA.lockTog = !PHA.lockTog;
      const c = wins.pha.ctx;
      if (PHA.lockTog) c.drawImage(IMG.tlockon, 224, 35);
      else { c.fillStyle = CLR.black; c.fillRect(224, 35, 53, 23); }
    }, 300);
}
function phaLockTimerOff() {
  if (PHA.lockTimer !== null) { clearInterval(PHA.lockTimer); PHA.lockTimer = null; PHA.lockTog = false;
    paintPHA(); }
}
function initPHA() {
  const w = wins.pha; if (!w) return;
  const drawVals = () => { phaSetLocked(); paintPHA(); };
  pressRect(w, PHA_BTN.phaup, null, () => {           /* increase phasers */
    if (G.rep.PHA || PHA.nTmpDil <= 50) return;
    const inc = shiftKey() ? 1 : 10;
    PHA.nTmpDil -= inc; PHA.nTmpPha += inc; drawVals(); }, 100);
  pressRect(w, PHA_BTN.dilup, null, () => {           /* reduce phasers */
    if (G.rep.PHA || !PHA.nTmpPha) return;
    const inc = shiftKey() ? 1 : 10;
    if (PHA.nTmpPha <= inc) { PHA.nTmpDil += PHA.nTmpPha; PHA.nTmpPha = 0; }
    else { PHA.nTmpDil += inc; PHA.nTmpPha -= inc; }
    drawVals(); }, 100);
  pressRect(w, PHA_BTN.sing, null, null, 0, () => { if (!G.rep.PHA && !PHA.bSingle) { PHA.bSingle = true; paintPHA(); } });
  pressRect(w, PHA_BTN.wide, null, null, 0, () => { if (!G.rep.PHA && PHA.bSingle) { PHA.bSingle = false; paintPHA(); } });
  pressRect(w, PHA_BTN.exec, null, null, 0, () => phaExecute());
}
function phaExecute() {
  if (G.bSRSBusy) return;
  activateWin(G.nINIAutoSRS ? "srs" : "pha", true);
  if (G.rep.PHA) return;                       /* inoperative */
  G.nDilithium = PHA.nTmpDil;                  /* C: WM_MDIACTIVATE refreshes tmp values */
  Snd.play("exec", false);
  const power = PHA.nTmpPha, single = PHA.bSingle;
  srsExec(async () => {
    H.panel();
    if (power) await firePhasers(power, single);
  });
}

/* ---------- SHE window (SHE.C) ---------- */
const SHE = { nTmpShe: 0, nTmpDil: 0, ovalTimer: null };
const SHE_BTN = { dilup: [143, 138, 159, 153], sheup: [176, 138, 192, 153],
  exec: [111, 181, 226, 210] };
function paintSHE() {
  const w = wins.she; if (!w) return;
  const c = w.ctx;
  c.fillStyle = CLR.black; c.fillRect(0, 0, w.cv.width, w.cv.height);
  if (!G.rep.SHE) c.drawImage(IMG.lineart, 0, 0, 188, 64, 115, 25, 126, 43);
  c.drawImage(IMG.lrblock, 130, 130);
  c.drawImage(IMG.shedil, 10, 125);
  if (!G.rep.SHE) drawNumber(c, spf("%4d", SHE.nTmpDil), 28, 136, IMG.numeric);
  c.drawImage(IMG.sheshe, 240, 125);
  if (!G.rep.SHE) drawNumber(c, spf("%4d", SHE.nTmpShe), 259, 136, IMG.numeric);
  c.drawImage(IMG.execute, 110, 180);
  drawThermoShe(c);
}
function drawThermoShe(c) {
  const l = 14, t = 98, r = 324, b = 112;
  const width = r - l;
  const tot = SHE.nTmpDil + SHE.nTmpShe || 1;
  const inc = width / tot;
  const dR = l + Math.trunc(inc * SHE.nTmpDil);
  c.fillStyle = CLR.dkred; c.fillRect(10, 90, 318, 30);
  c.fillStyle = CLR.dkpurple; c.fillRect(l, t, dR - l, b - t);
  c.fillStyle = CLR.dkaqua; c.fillRect(dR, t, Math.trunc(inc * SHE.nTmpShe), b - t);
  c.strokeStyle = CLR.red; c.strokeRect(10.5, 90.5, 318, 30);
}
function sheRefresh() { SHE.nTmpShe = G.nShields; SHE.nTmpDil = G.nDilithium; paintSHE(); }
function sheSetOval() {
  if (SHE.ovalTimer === null && SHE.nTmpShe && !G.rep.SHE)
    SHE.ovalTimer = setInterval(() => {
      if (!wins.she || wins.she.minimized || G.rep.SHE || !SHE.nTmpShe || G.bPaused) return;
      const c = wins.she.ctx;
      const col = "rgb(" + getRand(256) + "," + getRand(256) + "," + getRand(256) + ")";
      c.save();
      c.globalCompositeOperation = "difference";
      c.strokeStyle = col; c.setLineDash([2, 3]); c.lineWidth = 1;
      c.beginPath(); c.ellipse(178, 46.5, 78, 42, 0, 0, Math.PI * 2); c.stroke();
      c.restore();
    }, 75);
}
function sheOvalTimerOff() {
  if (SHE.ovalTimer !== null) { clearInterval(SHE.ovalTimer); SHE.ovalTimer = null; paintSHE(); }
}
function initSHE() {
  const w = wins.she; if (!w) return;
  const drawVals = () => { sheSetOval(); paintSHE(); };
  pressRect(w, SHE_BTN.sheup, null, () => {
    if (G.rep.SHE || SHE.nTmpDil <= 50) return;
    const inc = shiftKey() ? 1 : 10;
    SHE.nTmpDil -= inc; SHE.nTmpShe += inc; drawVals(); }, 100);
  pressRect(w, SHE_BTN.dilup, null, () => {
    if (G.rep.SHE || !SHE.nTmpShe) return;
    const inc = shiftKey() ? 1 : 10;
    if (SHE.nTmpShe <= inc) { SHE.nTmpDil += SHE.nTmpShe; SHE.nTmpShe = 0; }
    else { SHE.nTmpDil += inc; SHE.nTmpShe -= inc; }
    drawVals(); }, 100);
  pressRect(w, SHE_BTN.exec, null, null, 0, () => {
    Snd.play("exec", false);
    G.nDilithium = SHE.nTmpDil; G.nShields = SHE.nTmpShe;
    setCondition(); H.panel(); G.bNeedSave = true;
    activateWin(G.nINIAutoSRS ? "srs" : "she", true);
    H.checkGameOver();
  });
  w.el.addEventListener("focus", sheRefresh);
  w.cv.addEventListener("pointerdown", () => sheRefresh());
}

/* ---------- DAM window (DAM.C) ---------- */
let damAbs = false;
const DAM_XY = { SHE: [230, 84], SRS: [230, 102], LRS: [230, 120],
  NAV: [230, 138], PHA: [230, 156], PHO: [230, 174], COM: [230, 192] };
function paintDAM() {
  const w = wins.dam; if (!w) return;
  const c = w.ctx;
  c.fillStyle = CLR.black; c.fillRect(0, 0, w.cv.width, w.cv.height);
  c.drawImage(IMG.dam, 12, 6);
  if (G.rep.DAM) return;
  c.font = "12px Arial, Helvetica, sans-serif";
  c.fillStyle = CLR.yellow; c.textBaseline = "top";
  for (const s in DAM_XY) {
    let t;
    if (G.rep[s] > 0.0) t = (damAbs ? G.repAt[s] - G.fStarDNow : G.repAt[s]).toFixed(1);
    else if (!G.rep[s]) t = " - OK - ";
    else t = "DESTROYED";
    c.fillText(t, DAM_XY[s][0], DAM_XY[s][1]);
  }
}
function initDAM() {
  const w = wins.dam; if (!w) return;
  w.cv.addEventListener("pointerdown", () => {
    if (G.rep.DAM) return;
    damAbs = !damAbs; paintDAM();
  });
}

/* ---------- COM window (COM.C) ---------- */
const COM = { lines: [], cols: 40, rows: 12, x: 0, y: 0, indentX: 24, indentY: 26 };
function comAlloc() {
  const w = wins.com; if (!w) return;
  c18measure();
  COM.cols = Math.max(1, Math.floor((w.cv.width - 2 * COM.indentX) / COM.cx));
  COM.rows = Math.max(1, Math.floor((w.cv.height - 2 * COM.indentY) / COM.cy));
  COM.lines = Array.from({ length: COM.rows }, () => new Array(COM.cols).fill(" "));
}
function c18measure() {
  const w = wins.com; if (!w) return;
  w.ctx.font = "13px 'Courier New', monospace";
  COM.cx = w.ctx.measureText("0").width || 7;
  COM.cy = 13;
}
function paintCOM() {
  const w = wins.com; if (!w) return;
  const c = w.ctx;
  c.fillStyle = CLR.dkred; c.fillRect(0, 0, w.cv.width, w.cv.height);
  const ix = COM.indentX, iy = COM.indentY;
  c.fillStyle = G.rep.COM ? CLR.black : CLR.navy;
  c.strokeStyle = CLR.red; c.lineWidth = 3;
  c.beginPath();
  c.roundRect(ix - COM.cx, iy - COM.cy, w.cv.width - 2 * ix + 2 * COM.cx,
    w.cv.height - 2 * iy + 2 * COM.cy, 6);
  c.fill(); c.stroke();
  if (G.rep.COM) return;
  c.font = "13px 'Courier New', monospace";
  c.fillStyle = CLR.white; c.textBaseline = "top";
  for (let y = 0; y < COM.rows; y++)
    c.fillText(COM.lines[y].join(""), ix, iy + y * COM.cy);
  if (focusedWin === "com" && comCaretOn) {
    c.fillRect(ix + COM.x * COM.cx, iy + COM.y * COM.cy, COM.cx, COM.cy - 1);
  }
}
let comCaretOn = true;
function comScroll() {
  const first = COM.lines.shift();
  COM.lines.push(new Array(COM.cols).fill(" "));
}
function comPutChar(ch) {
  if (G.rep.COM) return;
  COM.lines[COM.y][COM.x] = ch;
  if (++COM.x === COM.cols) { COM.x = 0; if (COM.y === COM.rows - 1) comScroll(); else COM.y++; }
  paintCOM();
}
function comNewline() {
  COM.x = 0;
  if (COM.y === COM.rows - 1) comScroll(); else COM.y++;
}
function comDisplayStr(s) {          /* DisplayComMessage */
  for (const ch of s) {
    if (ch === "\n") { comNewline(); continue; }
    comPutChar(ch);
  }
  paintCOM();
}
function comCharKey(nChar) {         /* CharKeyStroke */
  if (G.rep.COM) return;
  if (nChar === "\t") { do { comCharKey(" "); } while (COM.x % 4 !== 0); return; }
  if (nChar === "\b") { if (COM.x > 1) { COM.x--; comDelChar(); } return; }
  if (nChar === "\x1b") { activateWin(G.nINIAutoSRS ? "srs" : "com", true); return; }
  if (nChar === "\r" || nChar === "\n") {
    comNewline();
    const line = COM.lines[COM.y - 1].join("");
    if (!comExecute(line)) {
      activateWin(G.nINIAutoSRS ? "srs" : "com", true);
    }
    return;
  }
  comPutChar(nChar.toUpperCase());
}
function comDelChar() {              /* VK_DELETE */
  const row = COM.lines[COM.y];
  for (let x = COM.x; x < COM.cols - 1; x++) row[x] = row[x + 1];
  row[COM.cols - 1] = " ";
  paintCOM();
}
function comFocus(on) {
  const inp = document.getElementById("com-input");
  if (on) {
    inp.value = "";
    if (inp.style.display !== "inline") inp.style.display = "inline";
    inp.style.left = (wins.com.el.offsetLeft + 10) + "px";
    inp.style.top = (wins.com.el.offsetTop + 30) + "px";
    if (isTouch()) inp.focus({ preventScroll: true });
  } else inp.blur();
}
function isTouch() { return matchMedia("(pointer: coarse)").matches; }

/* ---------- H hooks (engine -> UI) ---------- */
const PHO_drawn = null;
const H = {
  createGameUI() {
    hideNoGame();
    for (const id of ["srs", "lrs", "nav", "pho", "pha", "she", "dam", "com", "panel", "msg", "btn"]) {
      if (!wins[id]) makeWin(id);
      wins[id].minimized = false;
      wins[id].el.style.display = "flex";
      iconStrip.querySelectorAll('[data-for="' + id + '"]').forEach(e => e.remove());
      const g = WINGEO[id];
      wins[id].el.style.left = g.x + "px"; wins[id].el.style.top = g.y + "px";
    }
    /* CreateGame: all minimized, then Default Positions: SRS/PAN/MSG/BTN shown */
    for (const id of ["lrs", "nav", "pho", "pha", "she", "dam", "com"]) minimizeWin(id);
    if (!wins.btn.el.dataset.init) {
      initBTN(); initNAV(); initPHO(); initPHA(); initSHE(); initDAM();
      wins.btn.el.dataset.init = "1";
      comAlloc();
    } else {
      comAlloc();
      NAV.nCourseNum = NAV.nWarpNum = NAV.nImpNum = 0;
      PHO.nCourseNum = PHO.nDistNum = 0;
      PHA.nTmpPha = 0; PHA.nTmpDil = 0; PHA.bSingle = true;
      SHE.nTmpShe = 0; SHE.nTmpDil = 0;
    }
    UI.menuFull();
    for (const id in wins) repaintWin(id);
    activateWin("srs", false);
    PHA.nTmpDil = G.nDilithium; PHA.nTmpPha = 0;
    SHE.nTmpShe = G.nShields; SHE.nTmpDil = G.nDilithium;
    phaSetLocked();
  },
  destroyGameUI() {
    for (const id in wins) {
      wins[id].el.remove();
      delete wins[id];
    }
    iconStrip.innerHTML = "";
    focusedWin = null;
    phaLockTimerOff(); sheOvalTimerOff();
    comCaretOn = false;
    showNoGame();
    UI.menuNoGame();
  },
  clearMsgBuffer() { msgLines.fill(""); },
  panel() { paintPanel(); },
  invalidateSRS() { if (wins.srs) paintSRS(); },
  invalidateLRS() { if (wins.lrs) paintLRS(); },
  invalidateMSG() { if (wins.msg) paintMSG(); },
  drawSector(x, y) {
    if (G.rep.SRS || !wins.srs) return;
    drawObjAt(wins.srs.ctx, x, y, 2);
  },
  eraseSector(x, y) {
    if (G.rep.SRS || !wins.srs) return;
    const r = sectorRect(x, y);
    wins.srs.ctx.fillStyle = CLR.black;
    wins.srs.ctx.fillRect(r.x, r.y, r.w, r.h);
  },
  drawPhoton(x, y) {
    if (G.rep.SRS || !wins.srs) return;
    wins.srs.ctx.drawImage(IMG.photon, XOFF + x * XBM + 2 + 15, YOFF + y * YBM + 2 + 9);
    PHO_LINGER = { x, y };
  },
  erasePhoton(x, y) {
    if (G.rep.SRS || !wins.srs) return;
    const r = sectorRect(x, y);
    wins.srs.ctx.fillStyle = CLR.black;
    wins.srs.ctx.fillRect(r.x, r.y, r.w, r.h);
    PHO_LINGER = null;
  },
  async explodeSequence(x, y, bDestroy) {
    const o = G.qd[G.nEntQ].Obj[y][x];
    let bmp;
    switch (o) {
      case OBJ_BASE: bmp = IMG.explbasd; break;
      case OBJ_KLINGON: bmp = bDestroy ? IMG.explklgd : IMG.explklg; break;
      case OBJ_ROMULAN: bmp = bDestroy ? IMG.explromd : IMG.explrom; break;
      case OBJ_FARENG: bmp = bDestroy ? IMG.explfard : IMG.explfar; break;
      case OBJ_BORG: bmp = bDestroy ? IMG.explbrgd : IMG.explbrg; break;
      case OBJ_ENTL: bmp = IMG.explentl; break;
      case OBJ_ENTR: bmp = IMG.explentr; break;
      default: fatal(); return;
    }
    const c = wins.srs ? wins.srs.ctx : null;
    if (bDestroy) Snd.play("explo", false);
    if (G.rep.SRS && bDestroy) { await sleep(1000); return; }
    const r = sectorRect(x, y);
    for (let i = 0; i < EXPLSEQ; i++) {
      if (c && !G.rep.SRS) c.drawImage(bmp, 0, i * 25, 34, 25, r.x - 1, r.y - 1, 34, 25);
      await sleep(120);
    }
    if (!c || G.rep.SRS) return;
    if (bDestroy) { c.fillStyle = CLR.black; c.fillRect(r.x, r.y, r.w, r.h); }
    else drawObjAt(c, x, y, 2);
  },
  async explodeEnt() { await H.explodeSequence(G.nEntX, G.nEntY, false); },
  async animatePhasers(x1, y1, x2, y2, ms, bAlien) {
    await beamAnim(x1, y1, x2, y2, ms, bAlien);
  },
  async animatePhasersRandom(ms) {
    const rc = { w: SRSX, h: SRSY };
    const nYa = getRand(rc.h) + YOFF;
    const left = getQObj(G.nEntY, G.nEntX) === OBJ_ENTL;
    const nXa = left ? XOFF : rc.w + 1;
    await beamAnim(sectCenterX(G.nEntX), sectCenterY(G.nEntY), nXa, nYa, ms, false, true);
  },
  async alienBeam(ax, ay, nPower) {
    await beamAnim(sectCenterX(ax), sectCenterY(ay), sectCenterX(G.nEntX), sectCenterY(G.nEntY),
      nPower * 10, true);
  },
  async warpStars(nMovement) {
    G.bInWarp = true;
    const w = wins.srs;
    if (!w) { await sleep(nMovement ? nMovement * 45 * 60 : 90 * 60); G.bInWarp = false; return; }
    const c = w.ctx;
    const W = w.cv.width, Hh = w.cv.height;
    const MAXSTARS = 55, VELOCITY = 0.4;
    const stars = Array.from({ length: MAXSTARS }, () => ({
      x: (getRand(201) - 100) / 10, y: (getRand(201) - 100) / 10,
      z: getRand(15) + 10, ox: -1, oy: -1, color: CLR.gray
    }));
    let frames = nMovement ? nMovement * 45 : 90;
    Snd.play("imp", true);
    if (G.rep.SRS) { await sleep(frames * 70); Snd.kill(); G.bInWarp = false; return; }
    c.fillStyle = CLR.black; c.fillRect(0, 0, W, Hh);
    const moveStar = (s, erase) => {
      const x2 = W >> 1, y2 = Hh >> 1;
      const x = Math.trunc((s.x / s.z) * x2), y = Math.trunc((s.y / s.z) * y2);
      if (s.z < 3.0) c.fillStyle = CLR.white, c.fillRect(x + x2 + 1, y + y2, 1, 1);
      else if (s.z < 6.0) s.color = CLR.white;
      if (erase && s.ox >= 0) { c.fillStyle = CLR.black; c.fillRect(s.ox, s.oy, 1, 1); }
      c.fillStyle = s.color; c.fillRect(x + x2, y + y2, 1, 1);
      s.ox = x + x2; s.oy = y + y2;
      s.z -= VELOCITY;
      if (erase && s.z <= 0.0) {
        s.x = (getRand(201) - 100) / 10; s.y = (getRand(201) - 100) / 10;
        s.z = getRand(15) + 10; s.ox = -1; s.oy = -1; s.color = CLR.gray;
      }
    };
    while (frames-- > 0) {
      for (const s of stars) moveStar(s, true);
      await sleep(60);
    }
    if (nMovement === 0) {          /* tail loop runs only on ricochet (C: !bRic) */
      let j = 0;
      do {
        j = 1;
        for (const s of stars) if (s.z > 0.0) { moveStar(s, false); j = 0; }
        await sleep(40);
      } while (j === 0);
    }
    G.bInWarp = false;
    Snd.kill();
  },
  systemHit(key) {
    repaintWin(key.toLowerCase());
    if (!G.rep.DAM && wins.dam && !wins.dam.minimized) paintDAM();
  },
  systemRepaired(key) {
    const id = key.toLowerCase();
    if (id === "pan") { if (wins.panel && wins.panel.minimized) restoreWin("panel"); }
    if (id === "msg") { if (wins.msg && wins.msg.minimized) restoreWin("msg"); }
    if (wins[id]) repaintWin(id);
    if (wins.dam && !wins.dam.minimized) paintDAM();
  },
  menuRedAlert(on) { UI.setRedAlertMenus(on); },
  flashOn() { flashActiveFlag = true; flashTog = false; },
  flashOff() { flashActiveFlag = false; G.Condition = G.Condition; paintPanel(); },
  flashActive() { return flashActiveFlag; },
  lockedOff() { phaLockTimerOff(); },
  comOut(s) { comDisplayStr(s); },
  comChar(ch) { comCharKey(ch); },
  async gameIsOver(type) { await UI.gameIsOver(type); },
  checkGameOver() { if (G.Condition === "over") H.gameIsOver(G.GameOverType); },
  menuNoGame() { UI.menuNoGame(); }
};
let flashActiveFlag = false, flashTog = false;
function sectCenterX(x) { const r = sectorRect(x, 0); return r.x + 17; }
function sectCenterY(y) { const r = sectorRect(0, y); return r.y + 12; }

/* phaser beam animation (AnimatePhasers: XOR lines, 60/40ms alternation) */
async function beamAnim(x1, y1, x2, y2, ms, bAlien, noSound) {
  if (bAlien) { if (!noSound) Snd.play("phx", true); }
  else Snd.play("phas", true);
  const c = wins.srs ? wins.srs.ctx : null;
  const pen1 = bAlien ? CLR.blue : CLR.red;
  const pen2 = bAlien ? CLR.aqua : CLR.purple;
  const end = performance.now() + ms;
  let state = false;
  const draw = () => {
    if (!c || G.rep.SRS) return;
    c.save();
    c.globalCompositeOperation = "difference";
    c.strokeStyle = state ? pen1 : pen2;
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.restore();
  };
  draw();                                  /* first segment visible */
  const t0 = performance.now();
  while (performance.now() < end) {
    await sleep(60);
    draw();                                /* XOR erase */
    await sleep(40);
    state = !state;
    draw();                                /* next color */
  }
  draw();                                  /* final erase */
  if (bAlien) Snd.play("phx2", false); else Snd.kill();
}

/* ---------- menus (ST.RC MNU_EMPTY / MNU_FULL) ---------- */
const UI = {
  menuNoGame() {
    UI.menuItems = [
      ["file", "File", [
        ["New", "Ctrl+N", () => UI.fileNew()],
        ["Open...", "Ctrl+O", () => UI.fileOpen()],
        ["Save", "", null, "gray"], ["Save As...", "", null, "gray"],
        ["End Game", "", null, "gray"], ["sep"],
        ["Exit", "", () => UI.fileExit()]
      ]],
      ["skill", "Skill", [
        ["Admiral", "", () => UI.setSkill(5)],
        ["Captain", "", () => UI.setSkill(4)],
        ["First Officer", "", () => UI.setSkill(3)],
        ["Officer", "", () => UI.setSkill(2)],
        ["Yeoman", "", () => UI.setSkill(1)],
        ["Expendable Crewman", "", () => UI.setSkill(0)]
      ]],
      ["options", "Options", [], "hidden"],
      ["window", "Window", [], "hidden"],
      ["help", "Help", [
        ["Player's Manual", "", () => window.open("assets/wintrek.pdf", "_blank")],
        ["sep"],
        ["About WinTrek...", "", () => UI.about()]
      ]]
    ];
    UI.renderMenuChecks();
  },
  menuFull() {
    UI.menuItems = [
      ["file", "File", [
        ["New", "Ctrl+N", () => UI.fileNew()],
        ["Open...", "Ctrl+O", () => UI.fileOpen()],
        ["Save", "Ctrl+S", () => UI.fileSave(false)],
        ["Save As...", "", () => UI.fileSave(true)],
        ["End Game", "", () => UI.fileEndGame()], ["sep"],
        ["Exit", "", () => UI.fileExit()]
      ]],
      ["skill", "Skill", [
        ["Admiral", "", () => UI.setSkill(5)],
        ["Captain", "", () => UI.setSkill(4)],
        ["First Officer", "", () => UI.setSkill(3)],
        ["Officer", "", () => UI.setSkill(2)],
        ["Yeoman", "", () => UI.setSkill(1)],
        ["Expendable Crewman", "", () => UI.setSkill(0)]
      ]],
      ["options", "Options", [
        ["Pause Game", "PAUSE", () => UI.pauseGame()],
        ["sep"],
        ["Auto Activate SRS", "", () => { G.nINIAutoSRS = !G.nINIAutoSRS; UI.renderMenuChecks(); }, "chk:auto"],
        ["Single Control Window", "", () => { G.nINISingle = !G.nINISingle; UI.renderMenuChecks(); }, "chk:single"],
        ["Pause when Iconic", "", () => { G.nINIPauseI = !G.nINIPauseI; UI.renderMenuChecks(); }, "chk:picon"],
        ["Sounds", "", () => { G.nINISounds = !G.nINISounds; if (!G.nINISounds) Snd.kill(); UI.renderMenuChecks(); }, "chk:sounds"]
      ]],
      ["window", "Window", [
        ["Cascade", "Shift+F5", () => UI.cascade()],
        ["Tile", "Shift+F4", () => UI.tile()],
        ["Arrange Icons", "", () => {}],
        ["Default Positions", "", () => UI.defaultPositions()],
        ["Save Window Positions", "", () => UI.savePositions()],
        ["Restore Window Positions", "", () => UI.restorePositions()]
      ]],
      ["help", "Help", [
        ["Player's Manual", "", () => window.open("assets/wintrek.pdf", "_blank")],
        ["sep"],
        ["About WinTrek...", "", () => UI.about()]
      ]]
    ];
    UI.renderMenuChecks();
  },
  renderMenuChecks() {
    document.querySelectorAll("#menubar .menu").forEach(m => {
      const key = m.dataset.menu;
      const item = (UI.menuItems || []).find(x => x[0] === key);
      if (item) m.classList.toggle("hidden", item[3] === "hidden");
    });
  },
  setSkill(n) {
    if (G.Condition !== "no") G.nSkill = n;
    G.nINISkill = n;
    localStorage.setItem("wintrek.ini.skill", String(n));
  },
  setRedAlertMenus(on) { UI.redAlert = on; },
  /* ---- file menu ---- */
  async fileNew() {
    if (await askToSave() === "cancel") return;
    newGame();
  },
  fileOpen() { UI.openDialog(); },
  async fileSave(saveAs) {
    if (G.Condition === "no") return;
    if (!saveAs && UI.gamName) { doSave(UI.gamName); return; }
    UI.saveDialog();
  },
  async fileEndGame() {
    if (await askToSave() === "cancel") return;
    UI.gamName = "";
    destroyGame();
  },
  async fileExit() {
    if (await askToSave() === "cancel") return;
    destroyGame();
  },
  pauseGame() {
    if (G.bPaused || G.Condition === "no" || G.Condition === "over") return;
    if (G.Condition === "redon" || G.Condition === "redoff") return;   /* disabled in red */
    G.bPaused = true;
    Snd.kill();
    UI.pauseBox();
  },
  cascade() {
    let x = 0, y = 0;
    for (const id in wins) {
      if (wins[id].minimized) restoreWin(id);
      wins[id].el.style.left = x + "px"; wins[id].el.style.top = y + "px";
      x += 24; y += 24;
      activateWin(id, false);
    }
  },
  tile() {
    const ids = Object.keys(wins);
    const n = ids.length, cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
    const cw = Math.floor(client.clientWidth / cols), ch = Math.floor((client.clientHeight - 40) / rows);
    ids.forEach((id, i) => {
      if (wins[id].minimized) restoreWin(id);
      const el = wins[id].el;
      el.style.left = (i % cols) * cw + "px";
      el.style.top = Math.floor(i / cols) * ch + "px";
      el.style.width = cw + "px"; el.style.height = ch + "px";
    });
  },
  defaultPositions() {
    for (const id in wins) {
      const g = WINGEO[id];
      wins[id].el.style.left = g.x + "px"; wins[id].el.style.top = g.y + "px";
      wins[id].el.style.width = g.w + "px"; wins[id].el.style.height = g.h + "px";
    }
    for (const id of ["lrs", "nav", "pho", "pha", "she", "dam", "com"]) minimizeWin(id);
    for (const id of ["srs", "panel", "msg", "btn"]) restoreWin(id);
  },
  savePositions() {
    const pos = {};
    for (const id in wins) pos[id] = {
      x: wins[id].el.offsetLeft, y: wins[id].el.offsetTop,
      w: wins[id].el.offsetWidth, h: wins[id].el.offsetHeight, m: wins[id].minimized };
    localStorage.setItem("wintrek.winpos", JSON.stringify(pos));
  },
  restorePositions() {
    try {
      const pos = JSON.parse(localStorage.getItem("wintrek.winpos") || "null");
      if (!pos) return;
      for (const id in pos) {
        if (!wins[id]) continue;
        wins[id].el.style.left = pos[id].x + "px"; wins[id].el.style.top = pos[id].y + "px";
        wins[id].el.style.width = pos[id].w + "px"; wins[id].el.style.height = pos[id].h + "px";
        if (pos[id].m) minimizeWin(id); else restoreWin(id);
      }
    } catch (e) {}
  },
  /* ---- modals ---- */
  async memo(text) { await memoBox(text); },
  hiScoreDialog(cb) { hiScoreBox(cb); },
  async pauseBox() { await pauseBox(); await afterPause(); },
  about() { aboutBox(); },
  /* ---- dialogs ---- */
  saveDialog() { saveBox(); },
  openDialog() { listBox(); },
  async gameIsOver(type) {
    if (G.Condition !== "over") return;
    const overType = type;
    G.Condition = "no";
    const showMemoAndScores = async (text, win) => {
      Snd.play("song", false);
      destroyGame();
      await sleep(400);
      await memoBox(text);
      if (win) {
        const nScore = computeScore();
        await new Promise(res => submitScore(nScore, () => res()));
      }
      await scoresBox();
    };
    if (overType === "NoEnergy")
      await showMemoAndScores(spf(MEMO_ENERGY, getRand(32767), G.fStarDNow), false);
    else if (overType === "NoTimeLeft")
      await showMemoAndScores(spf(MEMO_TIME, getRand(32767)), false);
    else if (overType === "NoSystems")
      await showMemoAndScores(spf(MEMO_SYS, getRand(32767), G.fStarDNow), false);
    else
      await showMemoAndScores(spf(MEMO_WIN, getRand(32767)), true);
  }
};
async function afterPause() { G.bPaused = false; }

/* ---------- modal boxes ---------- */
const modal = document.getElementById("modal");
const modalBox = document.getElementById("modal-box");
function showModal(html, cls) {
  modalBox.innerHTML = html;
  modalBox.className = cls;
  modal.classList.remove("hidden");
  return new Promise(res => {
    modal.dataset.resolve = "";
    const done = () => { modal.classList.add("hidden");
      modal.removeEventListener("click", clickH); window.removeEventListener("keydown", keyH); res(); };
    const clickH = e => { if (e.target === modalBox || modalBox.contains(e.target)) done(); };
    const keyH = () => done();
    modal.addEventListener("click", clickH);
    window.addEventListener("keydown", keyH, { once: false });
    modal.dataset.close = "1";
  });
}
function memoBox(text) {
  return showModal('<div class="memo-box"><img src="assets/memo.png" width="280" height="84">' +
    '<div class="rborder"><pre>' + escHtml(text) + "</pre></div></div>", "");
}
function scoresBox() {
  const scr = loadScores() || emptyScores();
  let rows = "";
  for (const r of scr)
    rows += "<tr><td>" + escHtml(r[0]) + "</td><td>" + escHtml(r[1]) + "</td><td style='text-align:right'>" +
      escHtml(r[2]) + "</td></tr>";
  return showModal('<div class="score-box"><img src="assets/score.png" width="420" height="108">' +
    '<div class="rborder"><table>' + rows + "</table></div></div>", "");
}
function aboutBox() {
  return showModal('<div class="about-box"><img src="assets/ship.png" width="358" height="87">' +
    '<div class="rborder"><pre>WINTREK Version 1.9\nby Joe Jaworski\nIn memory of Gene Roddenberry</pre></div></div>', "");
}
function pauseBox() {
  return showModal('<div class="pause-box"><div class="rborder"><span>PAUSE GAME</span></div></div>', "");
}
function escHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

/* high-score name dialog (DLG_SCORE, "Congradulations!" typo is original) */
function hiScoreBox(cb) {
  modalBox.innerHTML =
    '<div class="dlg"><div class="dlg-tbar">WinTrek</div><div class="dlg-body">' +
    '<div class="row">Congradulations!<br>A new High Score!</div>' +
    '<div class="row">Name: <input id="hiscore-name" maxlength="15" style="width:170px"></div>' +
    '<div class="btns btnrow"><div class="btn31" id="hiscore-ok">OK</div></div>' +
    "</div></div>";
  modalBox.className = "";
  modal.classList.remove("hidden");
  const inp = document.getElementById("hiscore-name");
  inp.focus();
  const close = () => { modal.classList.add("hidden"); };
  document.getElementById("hiscore-ok").addEventListener("click", () => {
    close(); cb(inp.value);
  });
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter") { close(); cb(inp.value); }
    e.stopPropagation();
  });
}
/* save dialog */
function saveBox() {
  modalBox.innerHTML =
    '<div class="dlg"><div class="dlg-tbar">Save Game</div><div class="dlg-body">' +
    '<div class="row">File name: <input id="save-name" style="width:170px" value="' +
    (UI.gamName || "") + '"></div>' +
    '<div class="btns btnrow"><div class="btn31" id="save-ok">Save</div><div class="btn31" id="save-cancel">Cancel</div></div>' +
    "</div></div>";
  modalBox.className = "";
  modal.classList.remove("hidden");
  const inp = document.getElementById("save-name");
  inp.focus();
  document.getElementById("save-ok").addEventListener("click", () => {
    const n = (inp.value || "").trim().replace(/\.gam$/i, "");
    modal.classList.add("hidden");
    if (n) { UI.gamName = n; doSave(n); }
  });
  document.getElementById("save-cancel").addEventListener("click", () => modal.classList.add("hidden"));
  inp.addEventListener("keydown", e => { e.stopPropagation(); });
}
function doSave(name) {
  const all = JSON.parse(localStorage.getItem("wintrek.gam") || "{}");
  all[name.toLowerCase()] = serializeGame();
  localStorage.setItem("wintrek.gam", JSON.stringify(all));
  showMsg("SAVED");
  G.bNeedSave = false;
}
/* open dialog */
function listBox() {
  const all = JSON.parse(localStorage.getItem("wintrek.gam") || "{}");
  const names = Object.keys(all);
  let list = names.map(n => '<div class="f" data-n="' + escHtml(n) + '">' + escHtml(n) + ".GAM</div>").join("");
  if (!names.length) list = '<div class="f">no saved games</div>';
  modalBox.innerHTML =
    '<div class="dlg"><div class="dlg-tbar">Open Game</div><div class="dlg-body">' +
    '<div class="filelist" id="open-list">' + list + "</div>" +
    '<div class="btns btnrow"><div class="btn31" id="open-ok">Open</div><div class="btn31" id="open-cancel">Cancel</div></div>' +
    "</div></div>";
  modalBox.className = "";
  modal.classList.remove("hidden");
  let sel = null;
  document.querySelectorAll("#open-list .f").forEach(f => f.addEventListener("click", () => {
    document.querySelectorAll("#open-list .f").forEach(x => x.classList.remove("sel"));
    f.classList.add("sel"); sel = f.dataset.n;
  }));
  document.getElementById("open-cancel").addEventListener("click", () => modal.classList.add("hidden"));
  document.getElementById("open-ok").addEventListener("click", async () => {
    if (!sel) return;
    modal.classList.add("hidden");
    if (await askToSave() === "cancel") return;
    if (deserializeGame(all[sel])) UI.gamName = sel;
  });
}
/* AskToSave (LOADSAVE.C) -> "yes" | "no" | "cancel" */
function askToSave() {
  if (G.Condition === "no") return Promise.resolve("no");
  if (!G.bNeedSave) return Promise.resolve("no");
  if (G.Condition === "redon" || G.Condition === "redoff") {
    return yesNoBox("Warning: You cannot save the current game while in a Red Alert Condition. Exit anyway?",
      "Save Game", ["OK", "Cancel"]).then(r => r === "OK" ? "yes" : "cancel");
  }
  return yesNoBox("Do you want to save the current game " + (UI.gamName || "") + "?",
    "Save Game", ["Yes", "No", "Cancel"]).then(r => {
      if (r === "Yes") {
        if (UI.gamName) doSave(UI.gamName); else UI.saveDialog();
        return "yes";
      }
      return r === "Cancel" ? "cancel" : "no";
    });
}
function yesNoBox(text, title, btns) {
  return new Promise(res => {
    modalBox.innerHTML =
      '<div class="dlg"><div class="dlg-tbar">' + title + '</div><div class="dlg-body">' +
      '<div class="row" style="max-width:250px">' + escHtml(text) + "</div>" +
      '<div class="btns btnrow">' + btns.map((b, i) =>
        '<div class="btn31" data-i="' + i + '">' + b + "</div>").join("") + "</div></div></div>";
    modalBox.className = "";
    modal.classList.remove("hidden");
    modalBox.querySelectorAll(".btn31").forEach(b => b.addEventListener("click", () => {
      modal.classList.add("hidden"); res(btns[+b.dataset.i]);
    }));
  });
}

/* ---------- input routing ---------- */
document.addEventListener("keydown", e => {
  ensureAudio();
  if (e.key === "Shift") uiShift = true;
  /* modal open: let modal handlers work */
  if (!modal.classList.contains("hidden")) return;
  /* global accelerators */
  if (e.ctrlKey && e.key.toLowerCase() === "n") { e.preventDefault(); UI.fileNew(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === "o") { e.preventDefault(); UI.fileOpen(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); UI.fileSave(false); return; }
  if (e.key === "Pause" || e.key === "F3") { e.preventDefault(); UI.pauseGame(); return; }
  if (e.shiftKey && e.key === "F5") { e.preventDefault(); UI.cascade(); return; }
  if (e.shiftKey && e.key === "F4") { e.preventDefault(); UI.tile(); return; }
  if (focusedWin === "com" && document.activeElement.id !== "com-input") { comKeys(e); return; }
  if (focusedWin === "nav" && !G.bSRSBusy) { navKeys(e); return; }
  if (focusedWin === "pho" && !G.bSRSBusy) { phoKeys(e); return; }
  if (focusedWin === "pha" && !G.bSRSBusy) { phaKeys(e); return; }
  if (focusedWin === "she" && !G.bSRSBusy) { sheKeys(e); return; }
});
document.addEventListener("keyup", e => { if (e.key === "Shift") uiShift = false; });
document.addEventListener("pointerdown", () => ensureAudio(), { capture: true });

function navKeys(e) {
  const map = { "1": 225, "2": 180, "3": 135, "4": 270, "5": 0, "6": 90, "7": 315, "8": 0, "9": 45,
    End: 225, ArrowDown: 180, PageDown: 135, ArrowLeft: 270, ArrowRight: 90,
    Home: 315, ArrowUp: 0, PageUp: 45 };
  if (e.key === "Enter") { e.preventDefault(); navExecute(); return; }
  let deg = map[e.key] !== undefined ? map[e.key] : null;
  if (e.key === "+" || e.key === "=" || e.code === "NumpadAdd") deg = NAV.nCourseNum + 1;
  if (e.key === "-" || e.key === "_" || e.code === "NumpadSubtract") deg = NAV.nCourseNum - 1;
  if (deg === null) return;
  e.preventDefault();
  NAV.nCourseNum = deg; paintNAV();
}
function phoKeys(e) {
  const map = { "1": 225, "2": 180, "3": 135, "4": 270, "5": 0, "6": 90, "7": 315, "8": 0, "9": 45 };
  if (e.key === "Enter") { e.preventDefault(); phoExecute(); return; }
  let deg = map[e.key] !== undefined ? map[e.key] : null;
  if (e.key === "+" || e.key === "=") deg = PHO.nCourseNum + 1;
  if (e.key === "-" || e.key === "_") deg = PHO.nCourseNum - 1;
  if (deg === null) return;
  e.preventDefault();
  PHO.nCourseNum = deg; paintPHO();
}
const PHA_PROXY = {
  get nTmpShe() { return PHA.nTmpPha; }, set nTmpShe(v) { PHA.nTmpPha = v; },
  get nTmpDil() { return PHA.nTmpDil; }, set nTmpDil(v) { PHA.nTmpDil = v; } };
function phaKeys(e) { transferKeys(e, PHA_PROXY, "pha", paintPHA, () => phaExecute()); }
function sheKeys(e) { transferKeys(e, SHE, "she", paintSHE, () => {
  Snd.play("exec", false);
  G.nDilithium = SHE.nTmpDil; G.nShields = SHE.nTmpShe;
  setCondition(); H.panel(); G.bNeedSave = true;
  activateWin(G.nINIAutoSRS ? "srs" : "she", true);
  H.checkGameOver();
}); }
function transferKeys(e, T, id, paint, exec) {
  const broke = G.rep[id.toUpperCase()];
  if (broke) return;
  const up10 = () => { if (T.nTmpDil <= 50) return; T.nTmpDil -= 10; T.nTmpShe += 10; paint(); };
  const dn10 = () => { if (T.nTmpShe <= 10) { T.nTmpDil += T.nTmpShe; T.nTmpShe = 0; } else { T.nTmpDil += 10; T.nTmpShe -= 10; } paint(); };
  const up100 = () => { if (T.nTmpDil <= 150) return; T.nTmpDil -= 100; T.nTmpShe += 100; paint(); };
  const dn100 = () => { if (T.nTmpShe <= 100) { T.nTmpDil += T.nTmpShe; T.nTmpShe = 0; } else { T.nTmpDil += 100; T.nTmpShe -= 100; } paint(); };
  switch (e.key) {
    case "ArrowUp": case "8": up100(); break;
    case "ArrowLeft": case "4": up10(); break;
    case "ArrowDown": case "2": dn100(); break;
    case "ArrowRight": case "6": dn10(); break;
    case "+": case "=":
      if (T.nTmpDil <= 50) return;
      T.nTmpDil--; T.nTmpShe++; paint(); break;
    case "-": case "_":
      if (T.nTmpShe <= 1) { T.nTmpDil += T.nTmpShe; T.nTmpShe = 0; }
      else { T.nTmpDil++; T.nTmpShe--; }
      paint(); break;
    case "Enter": exec(); break;
    default: return;
  }
  e.preventDefault();
}
/* computer window keys (desktop keyboards) */
function comKeys(e) {
  if (e.key === "Enter") { comCharKey("\r"); e.preventDefault(); return; }
  if (e.key === "Backspace") { comCharKey("\b"); e.preventDefault(); return; }
  if (e.key === "Delete") { comDelChar(); e.preventDefault(); return; }
  if (e.key === "Escape") { comCharKey("\x1b"); return; }
  if (e.key === "Home") { COM.x = 0; COM.y = 0; COM.lines.forEach(l => l.fill(" ")); comCharKey(">"); return; }
  if (e.key === "ArrowLeft") { COM.x = Math.max(COM.x - 1, 0); paintCOM(); e.preventDefault(); return; }
  if (e.key === "ArrowRight") { COM.x = Math.min(COM.x + 1, COM.cols - 1); paintCOM(); e.preventDefault(); return; }
  if (e.key === "ArrowUp") { COM.y = Math.max(COM.y - 1, 0); paintCOM(); e.preventDefault(); return; }
  if (e.key === "ArrowDown") { COM.y = Math.min(COM.y + 1, COM.rows - 1); paintCOM(); e.preventDefault(); return; }
  if (e.key.length === 1) { comCharKey(e.key); e.preventDefault(); }
}
/* mobile: hidden input feeds the computer window */
document.getElementById("com-input").addEventListener("input", ev => {
  const v = ev.target.value;
  ev.target.value = "";
  for (const ch of v) if (ch !== "\n") comCharKey(ch);
});
document.getElementById("com-input").addEventListener("keydown", ev => {
  if (ev.key === "Enter") { comCharKey("\r"); ev.preventDefault(); }
  if (ev.key === "Backspace") { comCharKey("\b"); ev.preventDefault(); }
  ev.stopPropagation();
});

/* menu bar clicks */
document.querySelectorAll("#menubar .menu").forEach(m => {
  m.addEventListener("pointerdown", ev => {
    ev.stopPropagation();
    openDropdown(m, m.dataset.menu);
  });
});
function openDropdown(anchor, key) {
  const dd = document.getElementById("dropdown");
  const item = UI.menuItems.find(x => x[0] === key);
  if (!item || !item[2].length) return;
  let html = "";
  for (const it of item[2]) {
    if (it[0] === "sep") { html += '<div class="sep"></div>'; continue; }
    const chk = it[3] === "chk:auto" ? G.nINIAutoSRS : it[3] === "chk:single" ? G.nINISingle :
      it[3] === "chk:picon" ? G.nINIPauseI : it[3] === "chk:sounds" ? G.nINISounds :
      it[3] === "chk:skill" ? false : null;
    const skillChk = key === "skill" && SKILL_NAMES.indexOf((G.Condition !== "no" ? G.nSkill : G.nINISkill)) ===
      SKILL_NAMES.length - 1 - item[2].indexOf(it);
    const disabled = it[3] === "gray" || (key === "options" && it[0] === "Pause Game" &&
      (G.Condition === "redon" || G.Condition === "redoff" || G.Condition === "no" || G.bPaused));
    const checked = key === "skill"
      ? ((G.Condition !== "no" ? G.nSkill : G.nINISkill) === [5,4,3,2,1,0][item[2].indexOf(it)])
      : chk;
    html += '<div class="mi' + (disabled ? " disabled" : "") + '" data-i="' + item[2].indexOf(it) + '">' +
      (checked ? '<span class="chk">\u2713</span>' : "") + it[0] +
      (it[1] ? '<span class="acc">' + it[1] + "</span>" : "") + "</div>";
  }
  dd.innerHTML = html;
  const r = anchor.getBoundingClientRect();
  dd.style.left = r.left + "px"; dd.style.top = r.bottom + "px";
  dd.classList.remove("hidden");
  const close = ev => {
    if (!dd.contains(ev.target)) { dd.classList.add("hidden");
      document.removeEventListener("pointerdown", close, true); }
  };
  setTimeout(() => document.addEventListener("pointerdown", close, true), 0);
  dd.querySelectorAll(".mi").forEach(mi => mi.addEventListener("click", () => {
    const it = item[2][+mi.dataset.i];
    dd.classList.add("hidden");
    if (it[2]) it[2]();
  }));
}

/* ---------- timers / main loop ---------- */
const REALTIME = 45000;                       /* ST.C: 45 s = 0.1 stardate + 1 dilithium */
let lastRealTick = performance.now();
setInterval(() => {
  if (!G.qd || G.bPaused || G.Condition === "no" || G.Condition === "over") return;
  if (G.Condition === "redon" || G.Condition === "redoff") return;   /* red alert: clock stopped */
  const now = performance.now();
  if (now - lastRealTick >= REALTIME) {
    lastRealTick = now;
    G.fStarDNow += 0.1;
    G.nDilithium--;                           /* may go negative -> NoEnergy */
    setCondition();
    paintPanel();
    G.bNeedSave = true;
    H.checkGameOver();
  }
}, 500);
setInterval(() => { if (G.qd && (G.Condition === "redon" || G.Condition === "redoff")) processRed(); }, 100);
setInterval(() => srsAnimTick(), 200);
setInterval(() => lrsFlashTick(), 280);
setInterval(() => { comCaretOn = !comCaretOn;
  if (focusedWin === "com" && wins.com && !G.rep.COM) paintCOM(); }, 500);
setInterval(() => {                            /* condition lamp flash (FlashProc 500 ms) */
  if (!flashActiveFlag || G.bPaused || G.rep.PAN) return;
  flashTog = !flashTog;
  if (G.Condition === "redon") G.Condition = "redoff";
  else if (G.Condition === "redoff") G.Condition = "redon";
  else if (G.Condition === "yon") G.Condition = "yoff";
  else if (G.Condition === "yoff") G.Condition = "yon";
  else return;
  const w = wins.panel;
  if (w) {
    const c = w.ctx;
    const r = { x: XY_COND[0], y: XY_COND[1], w: 40, h: 25 };
    c.fillStyle = CLR.black; c.fillRect(r.x, r.y, r.w, r.h);
    drawConditionLamp(c);
  }
}, 500);
setInterval(() => Snd.resumeBackground(), 1000);

/* ---------- stage scaling (Android/fit) ---------- */
function fitStage() {
  const s = Math.min(window.innerWidth / DEFW, window.innerHeight / DEFH);
  document.getElementById("stage").style.transform = "scale(" + Math.min(s, 1.6) + ")";
}
window.addEventListener("resize", fitStage);

/* ---------- opening animation (OPEN.C) ---------- */
async function opening() {
  const ov = document.createElement("div");
  ov.id = "opening";
  const cv = document.createElement("canvas");
  cv.width = innerWidth; cv.height = innerHeight;
  ov.appendChild(cv);
  document.body.appendChild(ov);
  Snd.play("open", false);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = CLR.black; ctx.fillRect(0, 0, cv.width, cv.height);
  const bmp = IMG.openent;
  if (!bmp) { ov.remove(); return; }
  let x = cv.width + 3;
  const y = Math.floor(cv.height / 3);
  let skip = false;
  const sk = () => { skip = true; };
  ov.addEventListener("pointerdown", sk);
  window.addEventListener("keydown", sk);
  while (x > -bmp.width && !skip) {
    x -= 3;
    ctx.fillStyle = CLR.black; ctx.fillRect(x + 3, y, bmp.width, bmp.height);
    ctx.drawImage(bmp, x, y);
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 16)));
  }
  window.removeEventListener("keydown", sk);
  ov.remove();
}

/* ---------- init ---------- */
async function init() {
  await loadAssets();
  paintDeskStars();
  fitStage();
  window.addEventListener("resize", () => { paintDeskStars(); fitStage(); });
  const savedSkill = parseInt(localStorage.getItem("wintrek.ini.skill") || "0", 10);
  G.nINISkill = isNaN(savedSkill) ? 0 : Math.max(0, Math.min(5, savedSkill));
  G.nSkill = G.nINISkill;
  UI.menuNoGame();
  await opening();
  showNoGame();
}
init();
