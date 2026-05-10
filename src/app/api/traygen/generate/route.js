import { execSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { NextResponse } from 'next/server';
import JSZip from 'jszip';

const SCAD_DIR = join(process.cwd(), 'scad');
const OPENSCAD_PATH = '/usr/bin/openscad';

function findXvfbRun() {
  try {
    const result = execSync('which xvfb-run', { encoding: 'utf8' }).trim();
    return result || null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  let tempDir = null;

  try {
    const { trays = [], merge_shelf = false } = await request.json();

    tempDir = mkdtempSync(join(tmpdir(), 'traygen-'));
    const xvfbRun = findXvfbRun();
    const zip = new JSZip();

    for (let idx = 0; idx < trays.length; idx++) {
      const tray = trays[idx];
      const { slot_diameters = [], barrier_width = 2.0 } = tray;

      const stlName = `tray_mixed_${idx + 1}.stl`;
      const stlPath = join(tempDir, stlName);

      const diamsStr = '[' + slot_diameters.join(',') + ']';
      const mergeStr = merge_shelf ? 'true' : 'false';

      const cmdParts = xvfbRun ? [xvfbRun, '-a', OPENSCAD_PATH] : [OPENSCAD_PATH];
      cmdParts.push(
        '-D', `slot_diameters=${diamsStr}`,
        '-D', `barrier_width=${barrier_width}`,
        '-D', `merge_shelf=${mergeStr}`,
        '-o', stlPath,
        'tray_dividers.scad'
      );

      const cmd = cmdParts.map(p => `"${p}"`).join(' ');
      execSync(cmd, { cwd: SCAD_DIR, timeout: 120000 });

      const stlData = readFileSync(stlPath);
      zip.file(stlName, stlData);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="trays.zip"',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (tempDir) {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
  }
}
