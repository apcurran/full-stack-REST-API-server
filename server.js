"use strict";

const express = require("express");
const app = express();
const logger = require("morgan");
const PORT = process.env.PORT || 5000;
const mongoose = require("mongoose");
const compression = require("compression");
const helmet = require("helmet");
// Initialize dotenv
require("dotenv").config();

// Import routes
const userRouter = require("./api/routes/user");
const homesRouter = require("./api/routes/homes");

// DB Setup
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

if (process.env.NODE_ENV !== "production") {
    app.use(logger("dev"));
}

app.use(helmet());
app.use(compression());
app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Handle CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://billow-client.firebaseapp.com");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");

        return res.status(200).json({});
    }

    next();
});

// Routes
app.use("/user", userRouter);
app.use("/homes", homesRouter);

// General Server Error Handling
app.use((err, req, res, next) => {
    console.error(err.message);

    return res.status(500).json({ error: err.message });
});

// Handle 404 Error
app.use((req, res, next) => {
    const error = new Error("Not found");
    error.status = 404;

    next(error);
});

// Catch other errors
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({ error: err.message });
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));