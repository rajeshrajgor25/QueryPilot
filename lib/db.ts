import mysql from 'mysql2/promise';

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ai_agent_db',
};

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    console.log('[DB] Creating connection pool with config:', {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      passwordSet: !!config.password,
    });
    pool = mysql.createPool(config);
  }
  return pool;
}

export async function executeQuery(sql: string, values?: any[]): Promise<any[]> {
  const connection = await getPool().getConnection();
  try {
    const [results] = await connection.execute(sql, values || []);
    return results as any[];
  } finally {
    connection.release();
  }
}

export async function getTableSchema(tableName: string): Promise<any> {
  const query = `
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
  `;
  const results = await executeQuery(query, [config.database, tableName]);
  return results;
}

export async function getAllTables(): Promise<string[]> {
  const query = `
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = ?
  `;
  const results = await executeQuery(query, [config.database]);
  return (results as any[]).map((row: any) => row.TABLE_NAME);
}

export async function getDatabaseSchema(): Promise<Record<string, any>> {
  const tables = await getAllTables();
  const schema: Record<string, any> = {};

  for (const table of tables) {
    schema[table] = await getTableSchema(table);
  }

  return schema;
}

export async function validateAndExecuteQuery(sql: string): Promise<any[]> {
  // Basic validation to prevent dangerous operations
  const upperSql = sql.toUpperCase().trim();
  
  // Block DROP, DELETE, TRUNCATE without explicit confirmation
  if (
    upperSql.startsWith('DROP') ||
    upperSql.startsWith('DELETE') ||
    upperSql.startsWith('TRUNCATE')
  ) {
    throw new Error(
      'Dangerous query detected. This operation requires explicit user confirmation.'
    );
  }

  // Allow SELECT, INSERT, UPDATE, SHOW, DESCRIBE
  if (
    !upperSql.startsWith('SELECT') &&
    !upperSql.startsWith('INSERT') &&
    !upperSql.startsWith('UPDATE') &&
    !upperSql.startsWith('SHOW') &&
    !upperSql.startsWith('DESCRIBE')
  ) {
    throw new Error('Only SELECT, INSERT, UPDATE queries are allowed.');
  }

  return executeQuery(sql);
}
