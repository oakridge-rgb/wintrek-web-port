# FAITHFULNESS REPORT

What in this port is verified authentic, what is reconstructed, and what
remains uncertain. Written so nobody has to take "faithful" on faith.

## Sources used

1. **The original source code** — Joe Jaworski's WinTrek 1.9 C sources
   (`ST.C`, `INIT.C`, `LOADSAVE.C`, `SRS.C`, `COM.C`, `PANEL.C`, `NAV.C`,
   `PHA.C`, `PHO.C`, `SHE.C`, `DAM.C`, `LRS.C`, `MSG.C`, `UTILS.C`, `SOUND.C`,
   `BTN.C`, `OPEN.C` + `ST.H`, `JOES.H`, `RESOURCE.H`, `ST.RC`,
   `STDLL1/2.RC`), as archived verbatim by GitHub user flarn2006 from
   joejaworski.com (web.archive.org capture of 2000-08-23). Every constant,
   formula, table, string and quirk below is traceable to a specific line of
   that code. This is the same code the original EXE was built from
   (`ST.RC` version block: "WinTrek", product version 1.9, 1989–96).
2. **The original 40-page Player's Manual** (`wintrek.pdf`, shipped with the
   source archive) — used to cross-check every mechanic; discrepancies between
   manual and code are listed below (the code wins).
3. **The original binary assets** — all 51 bitmaps (`PIX/*.BMP`), all 12
   sounds (`SND/*.WAV`, 8-bit 8 kHz PCM), and the window icons are converted
   verbatim (BMP→PNG, WAV as-is) into `assets/`. No sprite or sound is
   redrawn or re-synthesised.
4. **Wine's `LineDDA`** (bug-compatible with Windows) — the original routes
   all movement through `LineDDA`; Wine's implementation (start point
   included, end point excluded, `max(|dx|,|dy|)` callbacks) is reproduced
   exactly, because warp/impulse/photon destinations depend on its point
   sequence.

## Reproduced with high confidence (verified against source)

| Mechanic | Original behaviour (source location) |
| --- | --- |
| Galaxy | 64 quadrants (8×8) of 64 sectors (8×8); stars max 9/quad, starbases max 3/quad (code allows 3 despite its own comment), aliens max 8/quad (`LOADSAVE.C NewGame`) |
| Stardate | Start `1000 + rand(7000)`, mission `34.0 + rand(10)` days; 45 s real time = +0.1 stardate − 1 Dilithium, clock **stops** during Red Alert and only resumes in green/yellow/blue (`ST.C REALTIME`) |
| Skill tables | Crewman→Admiral: starbases 2-5/2-4/1-3/1-3/1-2/1-2, stars 50-149/65-164/80-179/95-194/110-209/125-224, aliens 20-29…40-49 (`NewGame` switch) |
| Alien mix | Klingon 55/50/50/45/40/40 %, Romulan constant 25 %, Farengi 18/17/16/15/14/14 %, Borg 2/3/4/5/6/6 % (`nOddsK/R/F`) |
| Alien stats | Klingon E 150-299, Romulan 200-349, Farengi 50-149, Borg 500-999; move/fire ticks per manual chart; skill>2: 50 % chance +75 energy, 25 % chance halved fire time; 6 % first-encounter immediate move/fire (`NewGame`, `ProcessRed`) |
| Warp | LineDDA toward a radius-12 point, destination = callback index W; engage 10 + 20/warp energy, −20/warp shields, +W stardate; landing sector random empty, facing by sector X (`MoveEntWarp`, `WarpToQuad`) |
| Impulse | 10 engage + 5/step energy, −10/step shields, +0.1 stardate/step, 700 ms/step; blocked by every object type with its own message; beyond-edge hops to adjacent quadrant with net 0 stardate and 20 energy (`MoveEntImpulse`, `ImpMovProc`) |
| Photon | Strength 200-279 (Crewman/Yeoman), 150-229 (Officer/1stOfficer), 100-179 (Captain/Admiral); **+70 when it detonates with exactly 1 distance unit left** — which is exactly what happens when you set the distance the computer reports, because `GetWarpFromPoints` counts `max(|dx|,|dy|)` DDA callbacks; torpedoes ignore the distance as a range limit (it only arms the bonus), are absorbed by stars, destroy Starbases ("real smart move, Captain.") and fly out of sector bounds (`FirePhoton`, `PhoProc`, `GetWarpFromPoints`) |
| Phasers | Power divided among targets (forced single when 1 alien); distance penalty = ⌊manhattan/2⌋ × (5-9); blocked by stars ("Star at %d,%d consumes %d Units"); full power always spent from Dilithium; beam animation time = delivered power × 10 ms (`FirePhasers`, `PHA.C`) |
| Alien fire | Power = 50-100 % of the alien's **current** energy; silent skip when blocked by a star; beam time = power × 10 ms (`AlienFires`) |
| Shields | 1:1 transfer with 50-unit Dilithium floor; hits above shield level damage the hull with the **excess** energy; degraded 20/warp and 10/impulse-step; wiped entirely by ricochet (`AlienFires`, `SHE.C`) |
| Damage | 10 systems (NAV/SRS/LRS/SHE/PHA/PHO/COM/DAM/PAN/MSG); minor-damage flavour pool of 23 strings when `nP < 75` or 10 % chance; destroy odds ≈9/15/20/33/100 % by hit bands (150/250/350/450); repair time = hit/120 stardates; Damage Control rerolled 60 % of the time when picked; Damage Report window shows only 7 systems, click toggles stardate/days (`RandomDamage`, `DAM.C`) |
| Game over | Dilithium ≤ 0, time up, all 10 systems down, or aliens = 0; time-out only detected on the next clock tick — `ADV` alone cannot end the game (`SetCondition`, `COM.C ADV`) |
| Docking | Adjacent sector (no wrap), Red Alert blocks it; refuel 3000, shields 0, 10 torpedoes, all damage (incl. destroyed) instantly repaired, messages reroute cancelled (`SetCondition`) |
| Computer | All 14 commands with `strstr` substring matching in the original order (any input containing "BAS" triggers BASE); BASE guesses ±0-3 quadrants for unscanned quadrants; ADV parses a single digit + optional decimal; undocumented `ANA` (alien-rate analysis) command preserved; `DIR`/`CD` → "Get Serious."; 8th unknown command shows the manual hint (`COM.C`) |
| Ricochet | Requires the quadrant's ricochet flag (50 % chance per Class-X star generated) and stars present; [10]→[0] countdown; random quadrant + random sector; **no time or energy cost**, shields wiped (`DoRicochet`, `RicochetToQuad`) |
| LRS | 3-digit ABS codes for the 3×3 block around the current quadrant, updated on every move; damaged LRS stops recording; Enterprise quadrant flashes (`UpdateLRS`, `LRS.C`) |
| Scoring | `(missionL − used) × 100 + aliens × 10 − starbases × 12`, +100 for a single-base game, win only; top-10 board where a new score **replaces** the first row it beats (no shifting — original bug kept); name truncated at first space, uppercase (`GameIsOver`) |
| Saves | Original save-set (skill, 64 quadrants with animation counters, alien list with timers, all repair state, reroute flag); saving disabled during Red Alert with the original warning text |
| Presentation | Window titles/geometry from `ST.H`/`INIT.C` defaults; menu trees from `ST.RC` incl. accelerators (Ctrl+N/O/S, Pause, Shift+F4/F5); default "New Game" layout = SRS + Status + Messages + Controls open, the rest minimised to icons; Single Control Window and Auto Activate SRS behaviours; message window: 30-line buffer, green text, red during Red Alert, yellow during Yellow Alert; Computer window: navy inset, red border, Courier-style buffer with typed `>` prompts; Star Fleet memos and score board from the original bitmaps and RCDATA texts |

## Original quirks deliberately preserved

1. **Enterprise placement bug** — on `NEW`, the start sector is checked for
   emptiness in the *last alien's* quadrant (stale `nQ`) instead of the
   Enterprise's own quadrant, so the Enterprise can spawn on top of another
   object. Reproduced line-for-line.
2. **Computer distance is one ahead** — a consequence of `LineDDA` excluding
   its end point; SCAN's reported distance is exactly what triggers the +70
   bonus, so the system is self-consistent, just surprising.
3. **Photon distance is not a range limit** — torpedoes fly until they hit
   something or leave the sector; the setting only arms the detonation bonus.
   A spent torpedo also lingers as a dot until the next SRS repaint.
4. **`ADV n` parses one digit** — `ADV 50` advances 5.0, not 50.
5. **Single-target phasers pick the first alien in scan order** (row-major),
   not "the one posing the most danger" as the manual claims.
6. **Starbases: max 3 per quadrant** (the code's own comment says 2).
7. **"Alien missed"** (`MG_ALMISS`) exists in the resources but is never
   triggered by the original code; kept as a dead string.
8. **Warp 9 at exact diagonals moves only 8 quadrants** — the DDA to a
   radius-12 point runs out of callbacks.
9. **Red Alert stops the clock** (no stardate drain, no repairs, no ambient
   tick) while aliens keep acting — stay red long enough and time effectively
   freezes, at the price of getting shot at.
10. **The realtime 45 s tick runs while docked** — "the clock is always
    ticking, even while docked", as the manual warns.
11. Manual/chart discrepancies resolved in favour of the code: Yeoman stars
    are 65-164 (manual misprints "165-163"), Officer torpedo strength is
    150-229 (manual says 150-219), Romulan share is a constant 25 % (the
    manual's per-skill Romulan row does not match the code).

## Reconstructed (engine-level, not visible as data)

1. **Windows message pump → async/await.** The original blocks inside
   `Delay()`/`AnimatePhasers()`/`ExplodeSequence()` while pumping messages;
   the port expresses the same sequences as awaited animation steps with the
   same durations (impulse 700 ms/step, photon 500 ms/step, explosions
   8 × 120 ms, beams 60/40 ms alternation for power × 10 ms, warp stars
   60 ms/frame × warp × 45, ricochet countdown 500 ms, LRS flash 280 ms,
   SRS animation 200 ms, condition flash 500 ms, shield oval 75 ms, locked-on
   flash 300 ms).
2. **GDI XOR drawing** (phaser beams, shield oval) is rendered with canvas
   `difference` compositing — mathematically the same raster operation.
3. **MDI window management.** Dragging, z-order, minimise-to-icons,
   Cascade/Tile are re-implemented to the original's visible behaviour
   (positions, sizes, default states). `Save/Restore Window Positions` maps
   to localStorage instead of `WINTREK.INI`.
4. **Sound mixing.** `sndPlaySound`'s single-channel model (a new sound stops
   the old one; `SND_NOSTOP` waits) is emulated; the ambient `BACK.WAV` loop
   starts when the channel is free, as in `ResumeBackground`.
5. **Saving.** The binary `GAMESTRUCT` file becomes a JSON document with the
   same fields (`sig: "STW"` kept) in localStorage; game files therefore do
   not interchange with the original `.GAM` binaries.

## Port additions (documented, non-gameplay)

- "Fit Screen" scaling of the whole desktop for phones (the desktop is a
  fixed 800×600 like a Windows 3.1 VGA session); fullscreen via the PWA
  manifest; a hidden input so mobile keyboards can type Computer commands.
- The 40-page manual ships as `assets/wintrek.pdf` and opens from
  Help → Player's Manual, replacing WinHelp.
- Service-worker offline cache. No gameplay code paths were added, removed
  or rebalanced.

## Uncertain

1. **Windows 3.1 `LineDDA` vs Wine.** The port follows Wine's
   bug-compatible implementation (start included, end excluded). If real
   Win 3.1 differed on some octant rounding, diagonal warp/impulse paths
   could step differently by one sector on rare courses.
2. **Version drift 1992 vs 1.9.** The archive is version 1.9 (1996 build
   stamp). Earlier shareware releases (the 1992 references) may have differed
   slightly; the "1992" date popularly cited comes from distribution listings.
3. **`GetTickCount`-based alien catch-up.** The `>15 s overdue → reset without
   firing` rule depends on tick-wrap arithmetic that can never trigger in a
   normal session; it is implemented as written but is effectively dead code
   in both original and port.
4. **Exactly how the original seeded `rand()`** (from `GetTickCount`) is not
   reproducible in the browser; all randomness uses `Math.random()` with the
   same ranges and distributions.
