// For Prod
// const { Pool } = require('pg');

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

// module.exports = pool;

//For Local Unit Tests
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "REPLACE WITH TEST DB URL LOCALLY",
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;


