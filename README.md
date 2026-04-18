# AI Database Agent

AI Database Agent is a simple web application that helps users interact with a MySQL database using everyday language. Instead of writing SQL manually, users can type requests in plain text, and the system automatically generates the correct SQL query, executes it, and shows the result in a clean interface.

The project is built using Next.js, TypeScript, MySQL, Groq AI, and LangGraph.

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

GROQ_API_KEY=your_api_key

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ai_agent_db