const execSync = require('node:child_process').execSync;

try{
    execSync('git pull', { stdio: 'pipe' });
    execSync('npm i', { stdio: 'pipe' });
} catch {}

