import express, { json } from 'express';
const app = express();
const port = process.env.PORT || 3000;
import cors from 'cors';
import tables from './db/tables.js';
import loginRoutes from './routes/loginRoutes';
import dexcomRoutes from './routes/dexcomRoutes';
import hueRoutes from './routes/hueRoutes';
import userSettingsRoutes from './routes/userSettingsRoutes';

//ensure database tables are created
tables();

app.use(cors({
    origin: ['https://projectsmercury.com','localhost:3000'],
    optionsSuccessStatus: 200
}));

app.use(json());

app.use(loginRoutes);
app.use(dexcomRoutes);
app.use(hueRoutes);
app.use(userSettingsRoutes);

export default app;

app.listen(port, () => console.log(`Listening on port ${port}`));
