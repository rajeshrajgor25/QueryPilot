const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ai_agent_db',
};

console.log('Testing MySQL connection with config:');
console.log('  Host:', config.host);
console.log('  Port:', config.port);
console.log('  User:', config.user);
console.log('  Database:', config.database);
console.log('  Password set:', config.password ? 'YES' : 'NO');
console.log('');

(async () => {
  try {
    console.log('Attempting to connect...');
    const connection = await mysql.createConnection(config);
    console.log('✓ Connection successful!');

    const [tables] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );
    
    console.log('✓ Found tables:', tables.map((t) => t.TABLE_NAME).join(', '));

    await connection.end();
    console.log('✓ Connection closed');
  } catch (error) {
    console.error('✗ Connection failed!');
    console.error('Error:', error.message);
    console.error('');
    console.error('Common solutions:');
    console.error('1. Check MySQL is running: sudo systemctl status mysql');
    console.error('2. Verify password in .env.local is correct');
    console.error('3. Check database exists: mysql -u root -p -e "SHOW DATABASES;"');
    console.error('4. Check user has access: mysql -u root -p ai_agent_db');
  }
})();
