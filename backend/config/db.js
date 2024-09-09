const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,  // Increase connection timeout to 10 seconds
    ssl: {
        rejectUnauthorized: false,  // Add SSL configuration for Aiven or other managed services
    }
});

// Test the connection
(async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL connected successfully.');
        connection.release(); // Release the connection back to the pool
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
})();

module.exports = pool;
