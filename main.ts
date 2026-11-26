// Hearth & Ledger — the hand-in program for the best-household-budget-site bounty.
//
// This entry is a household budget site kept by the fictional Chen family: a
// dashboard, transactions, monthly budgets, bills, savings goals and reports,
// all as plain static files under app/ (ES modules, one stylesheet, no build
// step, no network request) and four real screenshots of it running under
// screenshots/. The program below is the only moving part: it copies app/ and
// screenshots/ from beside this file into the output directory and writes
// /output/dossier.json, the summary the judge reads (the screenshots, the
// first load's files and bytes, and the site's source), using the vendored
// make.fun library. Leave vendor/makefun-frontend.ts exactly as the kit
// shipped it: the scorer rebuilds the dossier with its own copy and compares
// the two byte for byte, so any change here fails the entry.
//
// Two runs must write the same bytes. Nothing here depends on the clock, the
// network, or the machine: the copy is a plain recursive copy and the dossier
// is a pure function of the files it reads. Before copying, the program checks
// the two things the gate would refuse outright — a missing app/index.html and
// a screenshots/ folder outside the 3-to-4 range — and fails loudly instead of
// handing in a half-built entry.
//
// Run it outside the grader's container with MAKEFUN_OUTPUT_DIR standing in
// for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The site's own limits, matching the gate: 3 or 4 screenshots, each a whole
// PNG or JPEG under 256 KiB, and app/index.html present as a regular file.
function checkEntry() {
  const index = join(here, 'app', 'index.html');
  if (!existsSync(index) || !statSync(index).isFile()) {
    throw new Error('app/index.html is missing: the site has no entry page');
  }
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing: take 3 or 4 screenshots first');
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`screenshots/ holds ${shots.length} images, expected 3 or 4`);
  }
  for (const name of shots) {
    const file = join(shotsDir, name);
    if (!statSync(file).isFile() || statSync(file).size > 262144) {
      throw new Error(`screenshots/${name} is not a regular file under 256 KiB`);
    }
  }
}

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

checkEntry();
mkdirSync(out, { recursive: true });
copyTree(join(here, 'app'), join(out, 'app'));
copyTree(join(here, 'screenshots'), join(out, 'screenshots'));

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in app/
// or 16 MiB of app files: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);
