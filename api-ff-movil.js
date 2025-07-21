import express, { json, urlencoded } from 'express';
import cluster from 'cluster';
import auth from './routes/auth.js';
import { getCompanyById, redisClient } from './db.js';
import { Status } from './models/status.js';
import { logBlue } from './src/logCustom.js';


dotenv.config({ path: process.env.ENV_FILE || ".env" });
const PORT = process.env.PORT || 13000;
const app = express();

app.use(cors());
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ limit: '50mb', extended: true }));

(async () => {
    try {
        await redisClient.connect();

        app.use('/api/auth', auth);
        // Si tienes más routers:
        // app.use('/api/accounts', accounts);
        // app.use('/api/shipments', shipments);

        app.listen(PORT, '0.0.0.0', () => {
            logBlue(`Proceso ${process.pid} escuchando en el puerto ${PORT}`);
        });
    } catch (err) {
        logRed(`Error al iniciar el servidor: ${err}`);
    }
})();