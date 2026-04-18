import { Groq } from 'groq-sdk';
import { StateGraph, START, END } from '@langchain/langgraph';
import { getDatabaseSchema, validateAndExecuteQuery } from './db';

let groq: Groq | null = null;

function getGroqClient(): Groq {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY missing');
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

/* ---------------- Parse ---------------- */
async function parseQueryNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log('[Agent] Parsing user query:', state.userQuery);

  const schema = await getDatabaseSchema();

  return {
    databaseSchema: schema,
    messages: [...state.messages, { role: 'user', content: state.userQuery }],
  };
}

/* Generate SQL  */
async function generateSQLNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log('[Agent] Generating SQL query');

  const user = state.userQuery.trim();
  const lower = user.toLowerCase();

  let generatedSQL = '';

  /*  DELETE FIRST  */
  if (
    lower.startsWith('delete employee') ||
    lower.startsWith('delete emp')
  ) {
    // delete by id
    const idMatch = user.match(/\bid\s+(\d+)/i);

    if (idMatch) {
      generatedSQL = `DELETE FROM employees WHERE emp_id = ${Number(
        idMatch[1]
      )};`;
    } else {
      let name = user
        .replace(/delete/gi, '')
        .replace(/employee/gi, '')
        .replace(/emp/gi, '')
        .replace(/name/gi, '')
        .replace(/detail/gi, '')
        .replace(/details/gi, '')
        .replace(/record/gi, '')
        .replace(/data/gi, '')
        .replace(/info/gi, '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/'/g, "''");

      if (!name) {
        generatedSQL =
          `SELECT 'Please provide employee id or name' AS message;`;
      } else {
        generatedSQL = `DELETE FROM employees WHERE name = '${name}';`;
      }
    }
  }

  /*  SHOW EMPLOYEES */
  else if (
    lower.includes('show employee') ||
    lower.includes('all employee') ||
    lower.includes('employee list') ||
    lower === 'show employee'
  ) {
    generatedSQL = `
SELECT
  e.emp_id,
  e.name,
  e.age,
  d.dept_name AS department,
  e.salary,
  e.email,
  e.join_date
FROM employees e
JOIN departments d ON e.department_id = d.dept_id;
`;
  }

  /*  AI FALLBACK */
  else {
    const schemaDescription = Object.entries(state.databaseSchema || {})
      .map(([table, columns]: [string, any]) => {
        const cols = (columns as any[])
          .map((col: any) => `${col.COLUMN_NAME} (${col.DATA_TYPE})`)
          .join(', ');
        return `Table: ${table}\nColumns: ${cols}`;
      })
      .join('\n\n');

    const systemPrompt = `
You are an expert SQL generator.

Database Schema:
${schemaDescription}

Rules:
1. Return ONLY one SQL query
2. No markdown
3. No explanation
4. No comments
5. Use MySQL syntax
6. Never generate multiple statements
`;

    const response = await getGroqClient().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        ...state.messages,
      ],
      temperature: 0.2,
      max_tokens: 400,
    });

    generatedSQL =
      response.choices[0]?.message?.content
        ?.replace(/```sql|```/g, '')
        .trim() || '';
  }

  console.log('[Agent] Generated SQL:', generatedSQL);

  return {
    generatedSQL: generatedSQL.trim(),
    messages: [
      ...state.messages,
      { role: 'assistant', content: generatedSQL.trim() },
    ],
  };
}

/*  Validate  */
async function validateQueryNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log('[Agent] Validating SQL query');

  const sql = (state.generatedSQL || '').trim();

  if (!sql) {
    return {
      validationResult: 'error',
      error: 'Failed to generate SQL',
    };
  }

  const statements = sql.split(';').filter((s) => s.trim() !== '');
  if (statements.length > 1) {
    return {
      validationResult: 'invalid',
      error: 'Multiple SQL statements are not allowed',
    };
  }

  const upper = sql.toUpperCase();

  if (upper.includes('DROP') || upper.includes('TRUNCATE')) {
    return {
      validationResult: 'dangerous',
      error: 'Dangerous query blocked',
    };
  }

  if (
    upper.startsWith('SELECT') ||
    upper.startsWith('INSERT') ||
    upper.startsWith('UPDATE') ||
    upper.startsWith('DELETE') ||
    upper.startsWith('SHOW') ||
    upper.startsWith('DESCRIBE')
  ) {
    console.log('[Agent] Query validation passed');
    return { validationResult: 'valid' };
  }

  return {
    validationResult: 'invalid',
    error: 'Unsupported query type',
  };
}

/*Execute  */
async function executeQueryNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  if (state.validationResult !== 'valid') return state;

  console.log('[Agent] Executing SQL query');

  try {
    const sql = state.generatedSQL || '';

    const isDelete = sql
      .trim()
      .toUpperCase()
      .startsWith('DELETE');

    const results = await validateAndExecuteQuery(
      sql,
      isDelete
    );

    console.log(
      '[Agent] Query executed successfully, rows:',
      results?.length || 0
    );

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

/*  Format  */
async function formatResultsNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log('[Agent] Formatting results');

  if (state.error) {
    return {
      messages: [
        ...state.messages,
        { role: 'assistant', content: `Error: ${state.error}` },
      ],
    };
  }

  const rows = state.executionResult || [];

  return {
    messages: [
      ...state.messages,
      {
        role: 'assistant',
        content: `Query executed successfully. ${rows.length} row(s) affected/fetched.`,
      },
    ],
  };
}

/* Flow  */
function shouldExecute(state: AgentState): string {
  return state.validationResult === 'valid'
    ? 'execute'
    : 'format';
}

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

export async function runQuery(
  userQuery: string
): Promise<AgentState> {
  const agent = await buildAgent();

  return agent.invoke({
    userQuery,
    messages: [],
  });
}