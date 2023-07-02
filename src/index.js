const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const tables = require('./db/tables');
const routes = require('./routes');

//ensure database tables are created
tables();

app.use(cors({
    origin: 'https://projectsmercury.com',
    optionsSuccessStatus: 200
}));

app.use(express.json());

app.use(routes);

module.exports = app; // Add this line to export your app

app.listen(port, () => console.log(`Listening on port ${port}`));
