const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const tables = require('./db/tables');
const loginRoutes = require('./routes/loginRoutes');
const dexcomRoutes = require('./routes/dexcomRoutes');
const hueRoutes = require('./routes/hueRoutes');
const userSettingsRoutes = require('./routes/userSettingsRoutes');

//ensure database tables are created
tables();

app.use(cors({
    origin: ['https://projectsmercury.com'],
    optionsSuccessStatus: 200
}));

app.use(express.json());

app.use(loginRoutes);
app.use(dexcomRoutes);
app.use(hueRoutes);

module.exports = app;

app.listen(port, () => console.log(`Listening on port ${port}`));
