const express = require("express");
const cors = require("cors");
require("dotenv").config();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const recommendRoutes = require("./routes/recommend");
const placesRouter = require('./routes/getplaces');
const tripRoutes = require("./routes/trips");
const userRoutes = require("./routes/user");
const promotionRoutes = require("./routes/promotions");
const rewardRoutes = require("./routes/rewards");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        persistAuthorization: true
    }
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/recommend", recommendRoutes);
app.use('/api/places', placesRouter);
app.use("/api/trips", tripRoutes);
app.use("/api/user", userRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/rewards", rewardRoutes);

// Health check route
app.get("/health", (req, res) => {
    res.json({ status: "OK", message: "Server is running" });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
