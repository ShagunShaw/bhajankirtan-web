import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

const start = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:password123@localhost:27017/my_database?authSource=admin';

    if (!MONGODB_URI) {
        console.error("MONGODB_URI is missing");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    }

    // 0.0.0.0 so the app is reachable from outside the Docker container
    // const server = app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Docker stops containers with SIGTERM: finish current requests, then close the DB
    const shutdown = (signal) => {
        console.log(`${signal} received, shutting down`);
        server.close(async () => {
            await mongoose.connection.close();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
};

process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));

start();