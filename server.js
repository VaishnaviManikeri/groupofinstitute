const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Import route files
const authRoutes = require('./routes/authRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const blogRoutes = require('./routes/blogRoutes');
const careerRoutes = require('./routes/careerRoutes');

const app = express();

// =============================
// MIDDLEWARE
// =============================

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration (Important for frontend connection)
app.use(cors({
  origin: "*", // You can replace * with your frontend URL later
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// =============================
// ROOT ROUTE (Health Check)
// =============================

app.get('/', (req, res) => {
  res.status(200).json({
    status: "Backend is running 🚀",
    project: "Group Of Institute MCA",
    environment: process.env.NODE_ENV || "development",
    apiBase: "/api",
    endpoints: [
      "/api/auth",
      "/api/gallery",
      "/api/announcements",
      "/api/notices",
      "/api/blogs",
      "/api/careers"
    ]
  });
});

// =============================
// API ROUTES
// =============================

app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/careers', careerRoutes);

// =============================
// GLOBAL ERROR HANDLER
// =============================

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    message: err.message || "Something went wrong!",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// =============================
// START SERVER
// =============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});