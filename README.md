# QueryPilot

QueryPilot is an AI-powered database assistant that helps you interact with your database using simple English.
Instead of writing SQL manually, just ask a question and the system converts it into SQL and shows the results instantly.

---

## Why QueryPilot?

Many students, beginners, and even developers know what data they need, but writing SQL every time can be slow or confusing.

QueryPilot solves this by letting you ask:

* Show all users
* Count total orders
* Top 5 expensive products
* Users from India

And it handles the SQL for you.

---

## Key Features

* Ask database questions in plain English
* Automatic SQL query generation using AI
* Fast query execution with live results
* Clean table view for output
* SQL query preview
* Safety checks for risky commands
* Modern responsive UI
* Easy setup for local development

---

## Tech Stack

### Frontend

* Next.js
* React
* Tailwind CSS
* shadcn/ui

### Backend

* Node.js
* TypeScript
* LangGraph
* Groq API

### Database

* MySQL

---

## Project Structure

```bash
app/
components/
lib/
scripts/
README.md
package.json
```

---

## Installation

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Create Environment File

Create a file named `.env.local`

```env
GROQ_API_KEY=your_api_key_here

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ai_agent_db
```

> Never upload your real API keys to GitHub.

---

## 3. Setup Database

```bash
npm run db:setup
```

This creates sample tables like:

* users
* products
* orders

---

## 4. Run Project

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Example Questions

* Show all users
* How many orders do we have?
* Show products in Electronics
* Top 5 expensive items
* Users with premium plan
* Orders pending today

---

## Safety Features

QueryPilot blocks dangerous queries such as:

* DROP
* DELETE
* TRUNCATE

This helps protect your database.

---

## Common Errors

### MySQL Not Running

Start MySQL server and check credentials.

### Invalid API Key

Check your `GROQ_API_KEY`

### Database Not Found

Run:

```bash
npm run db:setup
```

---

## Future Improvements

* User Login
* Query History
* Export CSV / JSON
* Multi Database Support
* Better Charts & Insights
* Team Collaboration

---

## Contributing

Feel free to fork the project, improve it, and create pull requests.

---

## License

MIT License

---

## Made With ❤️

Built using Next.js, Groq AI, LangGraph, and MySQL.
