import { app } from './app';
import './jobs';
import fs from 'fs';
import https from 'https';

const port = process.env.APP_PORT || 5000;

if (!process.env.HTTPS_PUBLIC_CERT_PATH || !process.env.HTTPS_PRIVATE_KEY_PATH) {
  console.warn(
    'HTTPS_PUBLIC_CERT_PATH or HTTPS_PRIVATE_KEY_PATH not found in .env. Running in HTTP mode'
  );
  app.listen(port, () => console.log(`Listening on port ${port}`));
} else {
  https
    .createServer(
      {
        key: fs.readFileSync(process.env.HTTPS_PRIVATE_KEY_PATH),
        cert: fs.readFileSync(process.env.HTTPS_PUBLIC_CERT_PATH),
      },
      app
    )
    .listen(port, () => {
      console.log('HTTPS certificates loaded');
      console.log(`Listening on port ${port}`);
    });
}
