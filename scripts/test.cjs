const { execFileSync } = require('node:child_process');
const path = require('node:path');
execFileSync(process.execPath, [path.join(__dirname, '../node_modules/typescript/bin/tsc'),
    '--module', 'commonjs', '--outDir', '.test-build', '--target', 'ES2020', '--strict', '--skipLibCheck',
    'src/game/simulation/Match.ts', 'src/game/systems/KeyboardControls.ts'], { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
require('../tests/simulation.cjs');
require('../tests/keyboard.cjs');
