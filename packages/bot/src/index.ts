import { app } from './app';
import './env';

const port = Number(process.env.APP_PORT) || 3003;

app.listen(port, () => console.log(`Listening on port ${port}`));
