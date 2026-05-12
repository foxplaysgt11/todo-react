import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT false
    )
  `);

  console.log("Todos table ready");
}

initializeDatabase();

app.get("/todos", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM todos");
  res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      completed: Boolean(row.completed),
    }))
  );
});

app.post("/todos", async (req, res) => {
  const { name } = req.body;
  const newTask = {
    id: nanoid(),
    name,
    completed: false,
  };

  await pool.query(
    "INSERT INTO todos (id, name, completed) VALUES (?, ?, ?)",
    [newTask.id, newTask.name, newTask.completed]
  );

  res.json(newTask);
});

app.put("/todos", async (req, res) => {
  const { id, name, completed } = req.body;

  await pool.query(
    "UPDATE todos SET name = ?, completed = ? WHERE id = ?",
    [name, completed, id]
  );

  res.json({ id, name, completed });
});

app.delete("/todos", async (req, res) => {
  const { id } = req.body;

  await pool.query("DELETE FROM todos WHERE id = ?", [id]);

  res.json({ message: "Todo deleted" });
});

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});
