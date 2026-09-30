import { getUploadsRoot } from './env';
import { type AgentCall, errorMessage, getAgent, requireArg } from './legacy';
import busboy from 'busboy';
import createDebug from 'debug';
import type { RequestHandler } from 'express';
import fs from 'fs/promises';
import path from 'path';

const debug = createDebug('ingest:uploads');

/**
 * piu-spy's uploads (the legacy `uploads.py`): the result screens (video or image) and
 * the scan JSON, stored as `<uploads root>/<agent name>/<path>`. `results.screen_file` is
 * that path without the root, which the API serves the screenshots from.
 */

// Like the legacy Flask app's request limit
export const MAX_UPLOAD_BYTES = 512 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'application/json', 'video/mp4'];

// A path inside the agent's folder, as sent by piu-spy (which may run on Windows)
const relativeUploadPath = (filePath: string) => {
  const normalized = path.posix.normalize(filePath.replaceAll('\\', '/'));
  if (normalized.startsWith('..') || normalized.startsWith('/')) {
    throw new Error('Invalid path');
  }
  return normalized;
};

const fullUploadPath = (agentName: string, filePath: string) =>
  path.join(getUploadsRoot(), agentName, relativeUploadPath(filePath));

// Whether a file is already uploaded, so the agent can skip it
export const getUploadInfo = async ({ args, agent }: AgentCall) => {
  const filePath = String(requireArg(args, 'path'));
  const info = { path: relativeUploadPath(filePath) };
  const stats = await fs.stat(fullUploadPath(agent.name, filePath)).catch(() => undefined);
  if (stats?.isDirectory()) {
    return { info: { ...info, type: 'directory' } };
  }
  if (stats?.isFile()) {
    return { info: { ...info, type: 'file', size: stats.size, time: stats.mtimeMs / 1000 } };
  }
  return { info: { ...info, type: null } };
};

interface UploadedFile {
  name: string;
  mimeType: string;
  content: Buffer;
}

// The multipart request's `file`, or an HTTP status and message
const readFile = (req: Parameters<RequestHandler>[0]) =>
  new Promise<UploadedFile | { status: number; error: string }>((resolve) => {
    let file: UploadedFile | undefined;
    let tooLarge = false;
    let parser: busboy.Busboy;
    try {
      // The file name is the path in the agent's folder: keep its folders
      parser = busboy({
        headers: req.headers,
        preservePath: true,
        limits: { fileSize: MAX_UPLOAD_BYTES },
      });
    } catch (e) {
      resolve({ status: 400, error: errorMessage(e) });
      return;
    }
    parser.on('file', (field, stream, { filename, mimeType }) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('limit', () => (tooLarge = true));
      stream.on('end', () => {
        if (field === 'file') {
          file = { name: filename, mimeType, content: Buffer.concat(chunks) };
        }
      });
    });
    parser.on('error', (e) => resolve({ status: 400, error: errorMessage(e) }));
    parser.on('close', () => {
      if (tooLarge) {
        resolve({ status: 413, error: 'Request Entity Too Large' });
      } else if (!file) {
        resolve({ status: 500, error: "No 'file' provided in upload request" });
      } else if (!ALLOWED_TYPES.includes(file.mimeType)) {
        resolve({ status: 500, error: `Inappropriate content type '${file.mimeType}'` });
      } else {
        resolve(file);
      }
    });
    req.pipe(parser);
  });

export const uploadFile: RequestHandler = async (req, res) => {
  const file = await readFile(req);
  if ('error' in file) {
    res.status(file.status).json({ error: file.error });
    return;
  }
  try {
    const agent = await getAgent(req);
    if (!agent) {
      throw new Error('permission denied');
    }
    debug(`'${agent.name}' => <${file.name}>`);
    const fullPath = fullUploadPath(agent.name, file.name);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.content);
    res.json({ updates: `File uploaded to <${relativeUploadPath(file.name)}>` });
  } catch (error) {
    debug('Upload failed', error);
    res.json({ error: errorMessage(error) });
  }
};
