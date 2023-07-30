// For Prod
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;

//For Local Unit Tests
// const { Pool } = require('pg');

// const pool = new Pool({
//   connectionString: "postgres://rsfqudwklqepkx:894678848c8d649480aac218538c0b9ccf18189bae59f2133997bd1888999f49@ec2-3-233-77-220.compute-1.amazonaws.com:5432/d2k3p6jc89vub3",
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

// module.exports = pool;


