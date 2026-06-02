const express = require("express");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// File upload setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }

  console.log("Connected to MySQL database.");
});

// Home page
app.get("/", (req, res) => {
  const sql = "SELECT * FROM students ORDER BY created_at DESC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching students:", err.message);
      return res.status(500).send("Database error");
    }

    res.render("index", {
      students: results,
      appEnv: process.env.APP_ENV || "Local"
    });
  });
});

// Add student
app.post("/students", upload.single("image"), (req, res) => {
  const { name, email, course } = req.body;
  const imageKey = req.file ? req.file.filename : null;

  const sql = `
    INSERT INTO students (name, email, course, image_key)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [name, email, course, imageKey], (err) => {
    if (err) {
      console.error("Error inserting student:", err.message);
      return res.status(500).send("Database insert error");
    }

    res.redirect("/");
  });
});

// Delete student
app.post("/students/:id/delete", (req, res) => {
  const studentId = req.params.id;

  const sql = "DELETE FROM students WHERE id = ?";

  db.query(sql, [studentId], (err) => {
    if (err) {
      console.error("Error deleting student:", err.message);
      return res.status(500).send("Database delete error");
    }

    res.redirect("/");
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "cloudops-student-records",
    database: "connected",
    environment: process.env.APP_ENV || "EC2"
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});