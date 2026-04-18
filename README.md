# AI Database Agent

AI Database Agent is a simple web application that helps users interact with a MySQL database using everyday language. Instead of writing SQL manually, users can type requests in plain text, and the system automatically generates the correct SQL query, executes it, and shows the result in a clean interface.

The project is built using Next.js, TypeScript, MySQL, Groq AI, and LangGraph.

> *Note: This current version is designed for an **employee-based database** (employees, departments, projects, sales, etc.).  
> If you want to use your own custom database schema, you need to update the query rules and logic inside **`lib/agent.ts`** to match your tables and columns.

---

## Features

- Natural language database interaction  
- Automatic SQL query generation  
- Real-time query execution  
- View generated SQL queries  
- Modern and responsive chat interface  
- Delete confirmation before dangerous actions  
- Delete records by employee name or ID  
- Safe handling of related records  
- Query validation for better security  
- Fast and user-friendly experience  

---

## Tech Stack

### Frontend
- Next.js  
- React  
- Tailwind CSS  
- shadcn/ui  

### Backend
- Node.js  
- TypeScript  
- LangGraph  
- Groq API  

### Database
- MySQL  
- mysql2  

---

## Installation

### 1. Install Dependencies

```bash
npm install
2. Create .env.local
GROQ_API_KEY=your_api_key

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ai_agent_db
3. Start the Project
npm run dev

Open in browser:

http://localhost:3000
Example Commands
Show all employee
Show employee details
Delete employee Priya
Delete employee id 3
Update employee salary
Find highest paid employee
Custom Database Support

If you want to connect this project with your own database:

Update .env.local with your database credentials
Modify table/query logic in lib/agent.ts
Restart the project

Example: If your database has tables like students, orders, products, or customers, then update the prompt rules in agent.ts accordingly.

How It Works
Enter your request in the chat box
AI understands your request
SQL query is generated automatically
Query is validated for safety
Query runs on the database
Results are shown instantly
Safety Features
Blocks dangerous commands like DROP and TRUNCATE
Asks for confirmation before DELETE actions
Prevents invalid SQL execution
Restricts multiple statements
Validates queries before running
