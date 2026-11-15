# 🖖 WinTrek — faithful web & Android port

A port of **WinTrek 1.9** (Joe Jaworski, Paladin Systems North, 1992–96) — the
"Mainframe Star Trek" game for Windows 3.1 — to modern browsers and Android,
rebuilt from the original C source code to preserve the original's mechanics,
presentation and feel, not to modernise them.

**Play / install:** https://oakridge-rgb.github.io/wintrek/
just like all beautiful game ports, this was made with the help of ai, specifically GLM 5.3 AGENT mode. 
## What this is

- The **original game's rules**, ported line-by-line from Joe Jaworski's own
  released source code: 8×8 quadrants of 8×8 sectors, six skill levels with the
  original galaxy-generation tables, Klingons / Romulans / Farengi / Borg with
  the original energy and move/fire-tick ranges, Dilithium economy (3000 max,
  −1 per 45 real seconds, shields 1:1), photon torpedo strength by skill with
  the +70 "exact distance" bonus, phaser distance penalty, shield penetration
  damage, the 10-system damage model (repair time = hit/120 stardates, destroy
  odds by hit energy), starbase docking, ricochet-compatible stars, warp
  drop-in at random sectors, the wrap-around galaxy, LineDDA-based movement,
  and the original scoring formula.
- The **original presentation**: the real Win 3.1 MDI interface — draggable,
  minimisable child windows (Status, Messages, Controls, Short/Long Range
  Scan, Navigation, Photon Torpedoes, Phasers, Shields, Damage Report,
  Computer), the original LED-digit status panel, starfield desktop, Star
  Fleet Command memos, "Top Starfleet Officers" high-score board, all 51
  original sprites and all 12 original sounds, and every message string from
  the original resource file — including "real smart move, Captain." when you
  torpedo your own Starbase, and the "Congradulations!" typo.
- The **original quirks**, deliberately kept (see
  [FAITHFULNESS.md](FAITHFULNESS.md) for the full list): the ship's computer
  reports distances one step ahead of the target, `ADV` parses only one digit,
  the Enterprise's start sector is validated against the wrong quadrant, a
  photon torpedo keeps flying after its set distance, alien "single target"
  phasers pick the first ship in scan order rather than the most dangerous
  one, and time-out is only detected on the next 45-second clock tick.

## Install on Android (1 minute, no APK)

1. Open **https://oakridge-rgb.github.io/wintrek/** in Chrome.
2. Menu **⋮ → Add to Home screen**.
3. Launch **WinTrek** from the app drawer — fullscreen, standalone, works
   offline. The game is a landscape desktop; rotate your phone. Saves and
   high scores stay on the device.

## Controls

- 🖱 Everything is driven through the windows: click **Controls** buttons to
  open SRS / LRS / NAV / SHL / PHO / PHA / DMG / COM, drag windows by their
  title bars, click the ▼ button (or the icon) to minimise / restore.
- ⌨️ Windows 3.1 accelerators: **Ctrl+N/O/S**, **Pause**, **Shift+F5/F4**;
  keypad/arrow keys set courses in NAV and Photon windows (Return = Execute);
  arrows transfer shield/phaser power; the Computer window takes typed
  commands (`STATUS`, `SCAN`, `BASE`, `GETQ 3,7`, `ADV 1.2`, `RICOCHET`, …).
- 📱 On touch: tap the dial to set a course, hold the +/− buttons to
  auto-repeat, drag windows by the title bar, tap an icon to restore it. The
  whole desktop scales to fit your screen.

## Quick rules

You command the Enterprise: find and destroy every alien vessel before the
end stardate. Warp between quadrants, impulse within them, fire phasers
(energy from Dilithium, less with distance) and photon torpedoes (10 tubes,
aimed, detonate at the set distance). Shields absorb fire 1:1 but waste away
in transit and block you from firing (the computer raises/lowers them for
you). Dock at a Starbase — its adjacent sector, aliens cleared first — to
refuel, rearm and fully repair. The Borg hit last and hit hardest. Score =
100 × unused stardates + 10 × aliens − 12 × starbases, +100 for a single-base
galaxy.

## Repository layout

```
index.html    app shell, menu bar, modal layer
style.css     Windows 3.1 look (VGA palette, MDI chrome, dialogs)
engine.js     faithful port of the original C game logic
ui.js         window manager, window painters, sound, input, menus
assets/       original sprites (PNG), sounds (WAV), icons, manual (PDF)
sw.js         offline cache (network-first shell, cache-first assets)
FAITHFULNESS.md   what is authentic, reconstructed, or uncertain
```

Original game, manual, source code © 1989–96 Joe Jaworski, rehosted by
flarn2006 on GitHub; ported with credit, non-commercially, in the same spirit
as the long-tolerated WinTrek Enhanced project.
