// NEON VOID: Arena Defender — entrypoint for make.fun best-game-01.
//
// The game itself lives in game/ beside this file: plain static files for a desktop
// browser, no build step and no network. NEON VOID is a neon arena shooter — you fly
// a ship around a bounded arena, blast waves of enemies (chasers, shooters, splitters
// and tanks), chain kills into a combo multiplier, grab power-ups (shield, rapid fire,
// spread shot, screen-clearing bomb) and try to survive as long as you can on three
// lives. The canvas art is all hand-drawn vector shapes with a glow, the sounds are
// synthesised live with WebAudio, and the HUD tracks score, wave, lives, combo and
// the active power-up. Title screen, pause, game over and restart are all in.
//
// What this program does is small on purpose: it is the handoff. It copies game/
// and screenshots/ into the grader's output directory and writes dossier.json, the
// summary the judge reads, using the vendored make.fun library. The library decides
// what the dossier contains; this file only gathers the inputs and passes the caps
// the scorer enforces, so an entry that would fail the gate fails here too instead
// of silently shipping a broken dossier.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (Without MAKEFUN_OUTPUT_DIR it writes to /output, the grader's directory.)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The folder this file sits in is the repository root: game/ and screenshots/
// live next to it.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// The grader reads from /output; a local run can point anywhere with
// MAKEFUN_OUTPUT_DIR instead.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps the scorer enforces on the handoff. Only text_max_bytes changes what
// the dossier holds; the rest refuse an entry the scorer would refuse anyway —
// too many screenshots or one too big, too many files or too many bytes under
// game/, or a game path too long to fit the output's own entry cap.
const dossierLimits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function stageGameFiles(): void {
  mkdirSync(outputDir, { recursive: true });

  // The whole game, as-is: index.html, its style and scripts, nothing else.
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

  // The screenshots, when the maker has taken them: the first by name is the
  // cover. The folder is made first so the copy always has somewhere to land.
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  const shotFolder = join(repoRoot, 'screenshots');
  if (existsSync(shotFolder)) {
    cpSync(shotFolder, join(outputDir, 'screenshots'), { recursive: true });
  }
}

function writeDossier(): void {
  const dossier = buildDossier(outputDir, dossierLimits);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

stageGameFiles();
writeDossier();
