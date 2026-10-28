import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import pageRoutes from "./routes/pages.route.js";

import defaultRoutes from "./routes/default.route.js"
import adminRoutes from "./routes/admin.route.js";
import performerRoutes from "./routes/performer.route.js";
import packageRoutes from "./routes/package.route.js";
import bookingRoutes from "./routes/booking.route.js";
import priceRoutes from "./routes/price.route.js";
import { verifyJWT } from "./middlewares/verifyJWT.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

const app = express();

app.set("trust proxy", 1); // behind Render/Docker proxy, so rate limits see the real client IP
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ---------- Security headers (allows Google Fonts, Cloudinary media, YouTube embeds) ---------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // inline scripts exist in some pages; if you use the Cloudinary upload widget, also add https://upload-widget.cloudinary.com
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        mediaSrc: ["'self'", "https://res.cloudinary.com"],
        frameSrc: ["https://www.youtube.com", "https://www.youtube-nocookie.com"],
        connectSrc: ["'self'", "https://api.cloudinary.com"], // browser uploads straight to Cloudinary
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProd ? [] : null // would break plain http on localhost
      }
    }
  })
);

app.use(morgan(isProd ? "combined" : "dev"));

/* ---------- Body parsing ---------- */
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());

// Blocks MongoDB operator injection like { "email": { "$ne": null } } in request bodies
const stripOperators = (obj) => {
  if (Array.isArray(obj)) return obj.forEach(stripOperators);
  if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$")) delete obj[key];
      else stripOperators(obj[key]);
    }
  }
};
app.use((req, res, next) => {
  stripOperators(req.body);
  next();
});

/* ---------- Static files ---------- */
app.use(express.static(path.join(__dirname, "../public"), { maxAge: isProd ? "1h" : 0 }));

/* ---------- Health check (for Docker / hosting) ---------- */
app.get("/health", (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ok" : "db-down" });
});


const jwtCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 450,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many authentication checks. Please try again later.",
  },
});

// For frontend JWT check
app.get("/api/check-JWT", jwtCheckLimiter, verifyJWT, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "JWT verified successfully",
  });
});

/* ---------- Rate limits ---------- */
const limiter = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, statusCode: 429, message: "Too many requests, please try again later" }
  });

app.use("/api/default", limiter(250));
app.use("/api", limiter(400));            

/* ---------- API ---------- */
app.use("/api/admin", (req, res, next) => {
  res.set("Cache-Control", "no-store"); // admin data is never cached
  next();
});
app.use("/api/admin", adminRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/default", defaultRoutes);
app.use("/api/package", packageRoutes);
app.use("/api/performer", performerRoutes);
app.use("/api/price", priceRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ success: false, statusCode: 404, message: "API route not found" });
});

/* ---------- Pages (EJS) ---------- */
app.use(pageRoutes);

app.use((req, res) => {
  res.status(404).send("Page not found"); // replace with a designed 404 page later
});

/* ---------- Error handler (must be last) ---------- */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = err.statusCode || err.status || 500;
  let message = err.message || "Something went wrong";

  if (err.name === "ValidationError" || err.name === "CastError") status = 400;
  else if (err.code === 11000) {
    status = 409;
    message = "This record already exists";
  } else if (err.name === "MulterError") {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = "Please log in again";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "Request is too large";
  }

  if (status >= 500) {
    console.error(err);
    if (isProd) message = "Something went wrong";
  }

  if (req.originalUrl.startsWith("/api")) {
    return res.status(status).json({ success: false, statusCode: status, message });
  }
  res.status(status).send(message);
});

export default app;