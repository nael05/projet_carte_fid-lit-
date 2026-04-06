import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { promisify } from 'util';
import { execSync } from 'child_process';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { PassThrough } from 'stream';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_CERT_PATH = path.resolve(__dirname, '..', 'certs', 'certificate.pem');
const DEFAULT_KEY_PATH = path.resolve(__dirname, '..', 'certs', 'key-final.pem');
const DEFAULT_WWDR_PATH = path.resolve(__dirname, '..', 'certs', 'WWDR.pem');

const writeFile = promisify(fs.writeFile);

const sha1Hex = (buffer) => crypto.createHash('sha1').update(buffer).digest('hex');

async function createTempDir(prefix = 'pkpass-') {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), prefix));
  return tmp;
}

async function buildPassJson(templatePath, clientData, outPath) {
  const template = JSON.parse(await fs.promises.readFile(templatePath, 'utf-8'));
  template.serialNumber = clientData.cardNumber || clientData.id;

  // Set barcode if exists
  if (Array.isArray(template.barcodes) && template.barcodes.length > 0) {
    template.barcodes[0].message = String(clientData.id);
    template.barcodes[0].messageEncoding = template.barcodes[0].messageEncoding || 'iso-8859-1';
  } else if (template.barcode) {
    template.barcode.message = String(clientData.id);
  }

  // Update fields (storeCard)
  if (template.storeCard) {
    const fullName = `${clientData.firstName || 'Client'} ${clientData.lastName || ''}`.trim();
    const displayPoints = String(clientData.points || 0);
    template.storeCard.primaryFields = [
      { key: 'points', label: 'Points', value: displayPoints }
    ];
    template.storeCard.secondaryFields = [
      { key: 'name', label: 'Nom', value: fullName }
    ];
    template.storeCard.backFields = template.storeCard.backFields || [];
    // ensure email and terms
    template.storeCard.backFields = template.storeCard.backFields.filter(f => f.key !== 'email' && f.key !== 'terms');
    template.storeCard.backFields.push({ key: 'email', label: 'Contact', value: clientData.email || 'contact@fidelyz.com' });
    template.storeCard.backFields.push({ key: 'terms', label: 'Conditions', value: 'Conditions et usages' });
  }

  await writeFile(outPath, JSON.stringify(template, null, 2));
}

async function copyImagesFromModel(modelDir, destDir) {
  const files = await fs.promises.readdir(modelDir);
  for (const f of files) {
    const lower = f.toLowerCase();
    if (lower.startsWith('icon') || lower.startsWith('logo') || lower.endsWith('.png') || lower.endsWith('.jpg')) {
      const src = path.join(modelDir, f);
      const dst = path.join(destDir, f);
      await fs.promises.copyFile(src, dst);
    }
  }
}

async function buildManifest(dir) {
  const files = await fs.promises.readdir(dir);
  const manifest = {};
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = await fs.promises.stat(full);
    if (stat.isFile()) {
      const buf = await fs.promises.readFile(full);
      manifest[f] = sha1Hex(buf);
    }
  }
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function signManifest(manifestPath, signaturePath, certPath, keyPath, wwdrPath, keyPassword) {
  // Build openssl command
  const parts = ['openssl', 'smime', '-binary', '-sign', '-in', quote(manifestPath), '-out', quote(signaturePath), '-outform', 'DER', '-signer', quote(certPath), '-inkey', quote(keyPath)];
  if (fs.existsSync(wwdrPath)) parts.push('-certfile', quote(wwdrPath));
  if (keyPassword) parts.push('-passin', `pass:${escapeShellArg(keyPassword)}`);
  const cmd = parts.join(' ');
  logger.debug('🔐 Sign command', { cmd });
  execSync(cmd, { stdio: 'pipe' });
}

function quote(p) {
  if (process.platform === 'win32') return `"${p}"`;
  return `'${p.replace(/'/g, "'\\''")}'`;
}

function escapeShellArg(arg) {
  return arg.replace(/"/g, '\\"');
}

async function createPkpassFromDir(dir) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    const stream = new PassThrough();
    archive.pipe(stream);
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err) => reject(err));

    // append everything in dir
    fs.readdirSync(dir).forEach((file) => {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isFile()) {
        archive.file(full, { name: file });
      }
    });

    archive.finalize();
  });
}

export async function generatePkpass(clientData) {
  if (!clientData || !clientData.id) throw new Error('clientData.id required');
  // paths
  const certPath = process.env.APPLE_CERT_PEM || DEFAULT_CERT_PATH;
  const keyPath = process.env.APPLE_KEY_PEM || DEFAULT_KEY_PATH;
  const wwdrPath = process.env.APPLE_WWDR_PEM || DEFAULT_WWDR_PATH;
  const keyPassword = process.env.APPLE_CERT_PASSWORD || '';

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error(`Certificate or key not found (${certPath}, ${keyPath})`);
  }

  const tmpDir = await createTempDir();
  try {
    const modelDir = path.resolve(__dirname, '..', 'models', 'fidelyz.pass');
    // build pass.json
    await buildPassJson(path.join(modelDir, 'pass.json'), clientData, path.join(tmpDir, 'pass.json'));
    // copy images
    await copyImagesFromModel(modelDir, tmpDir);
    // manifest
    await buildManifest(tmpDir);
    // sign
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const signaturePath = path.join(tmpDir, 'signature');
    signManifest(manifestPath, signaturePath, certPath, keyPath, wwdrPath, keyPassword || undefined);
    // package
    const buffer = await createPkpassFromDir(tmpDir);
    logger.info('✅ PKPASS generated', { clientId: clientData.id, size: buffer.length });
    return buffer;
  } finally {
    // best effort cleanup
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
}

export default { generatePkpass };
