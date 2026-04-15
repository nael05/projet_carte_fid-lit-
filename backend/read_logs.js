
import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\Nael\\.pm2\\logs\\fidelyz-backend-out.log';
const errPath = 'C:\\Users\\Nael\\.pm2\\logs\\fidelyz-backend-error.log';

function readLog(p, label) {
    if (fs.existsSync(p)) {
        console.log(`--- ${label} ---`);
        const content = fs.readFileSync(p, 'utf8');
        const lines = content.split('\n').slice(-50).join('\n');
        console.log(lines);
    } else {
        console.log(`--- ${label} INTROUVABLE : ${p} ---`);
    }
}

readLog(logPath, 'LOGS SORTIE');
readLog(errPath, 'LOGS ERREUR');
