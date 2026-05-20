import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import { nanoid } from "nanoid";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

// =========================
// AI Task Analysis Function
// =========================
function analyzeTaskWithAI(taskName) {
  const text = taskName.toLowerCase();

  let category = "General";
  let priority = "Low";
  let reasons = [];

  if (
    text.includes("project") ||
    text.includes("slides") ||
    text.includes("report") ||
    text.includes("meeting") ||
    text.includes("presentation") ||
    text.includes("deploy") ||
    text.includes("aws")
  ) {
    category = "Work";
    reasons.push("This task is related to work or project activities.");
  }

  if (
    text.includes("study") ||
    text.includes("exam") ||
    text.includes("assignment") ||
    text.includes("school") ||
    text.includes("homework")
  ) {
    category = "Study";
    reasons.push("This task is related to studying or academic work.");
  }

  if (
    text.includes("run") ||
    text.includes("gym") ||
    text.includes("workout") ||
    text.includes("doctor") ||
    text.includes("health")
  ) {
    category = "Health";
    reasons.push("This task is related to health or fitness.");
  }

  if (
    text.includes("buy") ||
    text.includes("groceries") ||
    text.includes("shopping") ||
    text.includes("order")
  ) {
    category = "Shopping";
    reasons.push("This task involves purchasing items or shopping.");
  }

  if (
    text.includes("today") ||
    text.includes("tomorrow") ||
    text.includes("urgent") ||
    text.includes("deadline") ||
    text.includes("submit") ||
    text.includes("due") ||
    text.includes("monday") ||
    text.includes("tuesday") ||
    text.includes("wednesday") ||
    text.includes("thursday") ||
    text.includes("friday") ||
    text.includes("saturday") ||
    text.includes("sunday")
  ) {
    priority = "High";
    reasons.push("This task contains deadline or urgency-related keywords.");
  } else if (
    text.includes("soon") ||
    text.includes("later") ||
    text.includes("this week")
  ) {
    priority = "Medium";
    reasons.push("This task appears to have moderate time sensitivity.");
  }

  if (reasons.length === 0) {
    reasons.push(
      "This task does not contain specific keywords, so it was classified as a general low-priority task."
    );
  }

  return {
    category,
    priority,
    ai_reason: reasons.join(" "),
  };
}

// =========================
// Database Initialization
// =========================
async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT false
    )
  `);

  await pool.query(`
    ALTER TABLE todos
    ADD COLUMN IF NOT EXISTS category VARCHAR(100)
  `);

  await pool.query(`
    ALTER TABLE todos
    ADD COLUMN IF NOT EXISTS priority VARCHAR(50)
  `);

  await pool.query(`
    ALTER TABLE todos
    ADD COLUMN IF NOT EXISTS ai_reason TEXT
  `);

  await pool.query(`
    ALTER TABLE todos
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  console.log("Todos table ready");
}

initializeDatabase();

// =========================
// GET All Todos
// =========================
app.get("/todos", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM todos ORDER BY created_at DESC"
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        completed: Boolean(row.completed),
        category: row.category,
        priority: row.priority,
        ai_reason: row.ai_reason,
        created_at: row.created_at,
      }))
    );
  } catch (error) {
    console.error("GET /todos error:", error);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});

// =========================
// CREATE Todo with AI
// =========================
app.post("/todos", async (req, res) => {
  try {
    const { name } = req.body;

    const aiAnalysis = analyzeTaskWithAI(name);

    const newTask = {
      id: nanoid(),
      name,
      completed: false,
      category: aiAnalysis.category,
      priority: aiAnalysis.priority,
      ai_reason: aiAnalysis.ai_reason,
    };

    await pool.query(
      `
      INSERT INTO todos
      (id, name, completed, category, priority, ai_reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        newTask.id,
        newTask.name,
        newTask.completed,
        newTask.category,
        newTask.priority,
        newTask.ai_reason,
      ]
    );

    res.json(newTask);
  } catch (error) {
    console.error("POST /todos error:", error);
    res.status(500).json({ error: "Failed to create todo" });
  }
});

// =========================
// UPDATE Todo
// =========================
app.put("/todos", async (req, res) => {
  try {
    const { id, name, completed } = req.body;

    await pool.query(
      "UPDATE todos SET name = $1, completed = $2 WHERE id = $3",
      [name, completed, id]
    );

    res.json({ id, name, completed });
  } catch (error) {
    console.error("PUT /todos error:", error);
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// =========================
// DELETE Todo
// =========================
app.delete("/todos", async (req, res) => {
  try {
    const { id } = req.body;

    await pool.query("DELETE FROM todos WHERE id = $1", [id]);

    res.json({ message: "Todo deleted" });
  } catch (error) {
    console.error("DELETE /todos error:", error);
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

// =========================
// Start Server
// =========================
app.listen(5000, () => {
  console.log("Backend running on port 5000");
});