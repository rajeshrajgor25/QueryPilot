import { Groq } from 'groq-sdk';
import { StateGraph, START, END } from '@langchain/langgraph';
import { getDatabaseSchema, executeQuery, validateAndExecuteQuery } from './db';

let groq: Groq | null = null;

function getGroqClient(): Groq {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY is not configured. Please add GROQ_API_KEY to your .env.local file.'
      );
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

interface AgentState {
  userQuery: string;
  databaseSchema?: Record<string, any>;
  generatedSQL?: string;
  validationResult?: string;
  executionResult?: any[];
  error?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// Node 1: Parse and understand the user query
async function parseQueryNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[Agent] Parsing user query:', state.userQuery);
  
  // Get database schema
  const schema = await getDatabaseSchema();
  
  return {
    databaseSchema: schema,
    messages: [
      ...state.messages,
      { role: 'user', content: state.userQuery },
    ],
  };
}

// Node 2: Generate SQL query using Groq
async function generateSQLNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[Agent] Generating SQL query');

  const schemaDescription = Object.entries(state.databaseSchema || {})
    .map(([table, columns]: [string, any]) => {
      const columnList = (columns as any[])
        .map(
          (col: any) =>
            `${col.COLUMN_NAME} (${col.DATA_TYPE}${col.IS_NULLABLE === 'NO' ? ' NOT NULL' : ''})`
        )
        .join(', ');
      return `Table: ${table}\n  Columns: ${columnList}`;
    })
    .join('\n\n');

  const systemPrompt = `You are an expert SQL query generator. Your task is to convert natural language queries into SQL.

Database Schema:
${schemaDescription}

Rules:
1. Always return ONLY the SQL query, no explanations
2. Use proper SQL syntax for MySQL
3. Format the SQL for readability
4. Do not include comments in the SQL
5. Do not suggest DROP, DELETE, or TRUNCATE operations

Generate a SQL query that answers the user's question.`;

  const response = await getGroqClient().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      ...state.messages,
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const generatedSQL = response.choices[0]?.message?.content || '';
  const sqlQuery = generatedSQL.replace(/```sql\n?|\n?```/g, '').trim();

  console.log('[Agent] Generated SQL:', sqlQuery);

  return {
    generatedSQL: sqlQuery,
    messages: [
      ...state.messages,
      { role: 'assistant', content: sqlQuery },
    ],
  };
}

// Node 3: Validate SQL query
async function validateQueryNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[Agent] Validating SQL query');

  const sql = state.generatedSQL || '';
  
  // Validation checks
  if (!sql) {
    return {
      validationResult: 'error',
      error: 'Failed to generate SQL query',
    };
  }

  const upperSql = sql.toUpperCase();
  if (
    upperSql.includes('DROP') ||
    upperSql.includes('DELETE') ||
    upperSql.includes('TRUNCATE')
  ) {
    return {
      validationResult: 'dangerous',
      error: 'The generated query contains dangerous operations (DROP, DELETE, TRUNCATE)',
    };
  }

  if (
    !upperSql.startsWith('SELECT') &&
    !upperSql.startsWith('INSERT') &&
    !upperSql.startsWith('UPDATE') &&
    !upperSql.startsWith('SHOW')
  ) {
    return {
      validationResult: 'invalid',
      error: 'Query must be a SELECT, INSERT, UPDATE, or SHOW query',
    };
  }

  console.log('[Agent] Query validation passed');
  return {
    validationResult: 'valid',
  };
}

// Node 4: Execute the SQL query
async function executeQueryNode(state: AgentState): Promise<Partial<AgentState>> {
  if (state.validationResult !== 'valid') {
    return state;
  }

  console.log('[Agent] Executing SQL query');

  try {
    const results = await validateAndExecuteQuery(state.generatedSQL || '');
    console.log('[Agent] Query executed successfully, rows:', results.length);
    
    return {
      executionResult: results,
    };
  } catch (error) {
    console.error('[Agent] Execution error:', error);
    return {
      error: `Execution error: ${(error as Error).message}`,
      executionResult: [],
    };
  }
}

// Node 5: Format results
async function formatResultsNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[Agent] Formatting results');

  if (state.error) {
    return {
      messages: [
        ...state.messages,
        { role: 'assistant', content: `Error: ${state.error}` },
      ],
    };
  }

  const results = state.executionResult || [];
  const resultSummary = 
    results.length === 0
      ? 'No results found'
      : `Found ${results.length} result${results.length !== 1 ? 's' : ''}`;

  return {
    messages: [
      ...state.messages,
      {
        role: 'assistant',
        content: `Query executed successfully. ${resultSummary}`,
      },
    ],
  };
}

// Conditional edge function
function shouldExecute(state: AgentState): string {
  if (state.validationResult === 'valid') {
    return 'execute';
  }
  return 'format';
}

// Build the graph
export async function buildAgent() {
  const workflow = new StateGraph<AgentState>({
    channels: {
      userQuery: {},
      databaseSchema: {},
      generatedSQL: {},
      validationResult: {},
      executionResult: {},
      error: {},
      messages: {},
    },
  });

  workflow.addNode('parse', parseQueryNode);
  workflow.addNode('generate', generateSQLNode);
  workflow.addNode('validate', validateQueryNode);
  workflow.addNode('execute', executeQueryNode);
  workflow.addNode('format', formatResultsNode);

  workflow.addEdge(START, 'parse');
  workflow.addEdge('parse', 'generate');
  workflow.addEdge('generate', 'validate');

  workflow.addConditionalEdges('validate', shouldExecute, {
    execute: 'execute',
    format: 'format',
  });

  workflow.addEdge('execute', 'format');
  workflow.addEdge('format', END);

  return workflow.compile();
}

export async function runQuery(userQuery: string): Promise<AgentState> {
  const agent = await buildAgent();
  
  const initialState: AgentState = {
    userQuery,
    messages: [],
  };

  const result = await agent.invoke(initialState);
  return result;
}
