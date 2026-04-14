const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'password',
  database: process.env.MYSQL_DATABASE || 'ai_agent_db',
};

async function setupDatabase() {
  let connection;
  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
    });

    // Create database if it doesn't exist
    console.log(`Creating database ${config.database}...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
    await connection.execute(`USE ${config.database}`);

    // Create users table
    console.log('Creating users table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        age INT,
        city VARCHAR(255),
        country VARCHAR(255),
        subscription_status ENUM('free', 'premium', 'enterprise') DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create products table
    console.log('Creating products table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100),
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_price (price)
      )
    `);

    // Create orders table
    console.log('Creating orders table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        total_amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        INDEX idx_user_id (user_id),
        INDEX idx_product_id (product_id),
        INDEX idx_status (status)
      )
    `);

    // Insert sample data
    console.log('Inserting sample data...');
    
    // Sample users
    await connection.execute(`
      INSERT INTO users (name, email, age, city, country, subscription_status) VALUES
      ('John Doe', 'john@example.com', 28, 'New York', 'USA', 'premium'),
      ('Jane Smith', 'jane@example.com', 34, 'London', 'UK', 'enterprise'),
      ('Bob Johnson', 'bob@example.com', 45, 'Toronto', 'Canada', 'free'),
      ('Alice Brown', 'alice@example.com', 29, 'Sydney', 'Australia', 'premium'),
      ('Charlie Wilson', 'charlie@example.com', 38, 'Berlin', 'Germany', 'free')
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `);

    // Sample products
    await connection.execute(`
      INSERT INTO products (name, description, price, category, stock) VALUES
      ('Laptop Pro', 'High-performance laptop for professionals', 1299.99, 'Electronics', 15),
      ('Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 'Accessories', 50),
      ('USB-C Cable', 'Fast charging USB-C cable', 19.99, 'Cables', 100),
      ('Monitor 4K', '4K UltraHD monitor', 499.99, 'Electronics', 8),
      ('Keyboard Mechanical', 'RGB mechanical keyboard', 149.99, 'Accessories', 25)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `);

    // Sample orders
    await connection.execute(`
      INSERT INTO orders (user_id, product_id, quantity, total_amount, status) VALUES
      (1, 1, 1, 1299.99, 'completed'),
      (1, 2, 2, 59.98, 'completed'),
      (2, 4, 1, 499.99, 'completed'),
      (3, 3, 5, 99.95, 'pending'),
      (4, 5, 1, 149.99, 'completed')
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `);

    console.log('✓ Database setup completed successfully!');
    console.log('✓ Tables created: users, products, orders');
    console.log('✓ Sample data inserted');
    
  } catch (error) {
    console.error('Error setting up database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
