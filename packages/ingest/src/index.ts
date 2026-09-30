import { app } from './app';
import './env';

const port = Number(process.env.APP_PORT) || 3002;
// Only reachable from the host itself: it has no firewall, and nginx will front ingestion (W12)
const host = process.env.APP_HOST || '127.0.0.1';

app.listen(port, host, () => console.log(`Listening on ${host}:${port}`));
