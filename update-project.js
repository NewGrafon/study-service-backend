const execSync = require('node:child_process').execSync;

execSync('git pull', { stdio: 'pipe' });
execSync('npm i', { stdio: 'pipe' });
