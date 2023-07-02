//For Test
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://rjdweqnmwwvcoz:fee3db6396e8c014f1eeb286627a6e9a507a8d99d9799a26075be0842d49afb5@ec2-34-197-91-131.compute-1.amazonaws.com:5432/d8o51ia2rarlq",
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;


//For Prod
// const { Pool } = require('pg');

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

// module.exports = pool;