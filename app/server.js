require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();
const PORT = process.env.PORT || 3000;

const appEnv = process.env.APP_ENV || "Local";
const bucketName = process.env.S3_BUCKET_NAME;
const awsRegion = process.env.AWS_REGION || "us-east-1";

const s3 = new S3Client({
  region: awsRegion,
});

// Multer memory storage keeps uploaded file in RAM before sending to S3.
// We are no longer saving uploads to EC2 local disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Keep this only for old local images, if any exist.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }

  console.log("Connected to MySQL database.");
});

function buildS3Key(file) {
  const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `students/${Date.now()}-${safeOriginalName}`;
}

async function uploadImageToS3(file) {
  if (!file) return null;

  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME is not configured in .env");
  }

  const s3Key = buildS3Key(file);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  return s3Key;
}

async function createSignedImageUrl(imageKey) {
  if (!imageKey) return null;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: imageKey,
  });

  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

async function deleteImageFromS3(imageKey) {
  if (!imageKey) return;

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: imageKey,
    });

    await s3.send(command);
  } catch (err) {
    console.error("S3 delete failed:", err.message);
  }
}

app.get("/", (req, res) => {
  const sql = "SELECT * FROM students ORDER BY created_at DESC";

  db.query(sql, async (err, results) => {
    if (err) {
      console.error("Database select error:", err.message);
      return res.status(500).send("Database select error");
    }

    try {
      const students = await Promise.all(
        results.map(async (student) => {
          return {
            ...student,
            image_url: await createSignedImageUrl(student.image_key),
          };
        })
      );

      res.render("index", {
        students,
        appEnv,
      });
    } catch (error) {
      console.error("S3 signed URL error:", error.message);
      res.status(500).send("Image URL generation error");
    }
  });
});

async function handleAddStudent(req, res) {
  try {
    const { name, email, course } = req.body;
    const file = req.files && req.files.length > 0 ? req.files[0] : null;

    if (!name || !email || !course) {
      return res.status(400).send("Name, email, and course are required.");
    }

    const imageKey = await uploadImageToS3(file);

    const sql =
      "INSERT INTO students (name, email, course, image_key) VALUES (?, ?, ?, ?)";

    db.query(sql, [name, email, course, imageKey], (err) => {
      if (err) {
        console.error("Database insert error:", err.message);
        return res.status(500).send("Database insert error");
      }

      res.redirect("/");
    });
  } catch (error) {
    console.error("Add student error:", error.message);
    res.status(500).send("Student upload error");
  }
}

// Supports current and possible form action names.
app.post("/add", upload.any(), handleAddStudent);
app.post("/students", upload.any(), handleAddStudent);

function handleDeleteStudent(req, res) {
  const studentId = req.params.id;

  const findSql = "SELECT image_key FROM students WHERE id = ?";

  db.query(findSql, [studentId], async (findErr, rows) => {
    if (findErr) {
      console.error("Database lookup error:", findErr.message);
      return res.status(500).send("Database lookup error");
    }

    const imageKey = rows.length > 0 ? rows[0].image_key : null;

    await deleteImageFromS3(imageKey);

    const deleteSql = "DELETE FROM students WHERE id = ?";

    db.query(deleteSql, [studentId], (deleteErr) => {
      if (deleteErr) {
        console.error("Database delete error:", deleteErr.message);
        return res.status(500).send("Database delete error");
      }

      res.redirect("/");
    });
  });
}

// Supports current and possible delete route names.
app.post("/delete/:id", handleDeleteStudent);
app.post("/students/:id/delete", handleDeleteStudent);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "cloudops-student-records",
    database: "connected",
    environment: appEnv,
    imageStorage: "S3",
    bucket: bucketName,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
