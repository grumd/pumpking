import { app } from './app';
import './env';

const port = Number(process.env.APP_PORT) || 3003;

// Only reachable from the host itself: it has no firewall, and the bot needs no inbound traffic
app.listen(port, '127.0.0.1', () => console.log(`Listening on port ${port}`));
