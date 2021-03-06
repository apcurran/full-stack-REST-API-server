"use strict";

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const sanitizeHtml = require('sanitize-html');

const House = require("../models/House");
const redisClient = require("../../redis/index");
const checkAuth = require("../middleware/check-auth");
const validate = require("../middleware/validate");
const paginatedResults = require("../middleware/paginated-results");
// Utility Functions
const reviseObjImgPaths = require("../utility/revise-obj-img-paths");

// Multer Setup
const multer = require("multer");
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "./uploads/");
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + file.originalname);
    }
});
const upload = multer({ storage: storage });
const cpUpload = upload.fields([
    { name: "agent_img", maxCount: 1 },
    { name: "house_img_main", maxCount: 1 },
    { name: "house_img_inside_1", maxCount: 1 },
    { name: "house_img_inside_2", maxCount: 1 },
]);

// GET all homes
router.get("/", paginatedResults(House), async (req, res, next) => {
    res.status(200).json(res.paginatedResults);
});

// GET a specific home
router.get("/:homeId", async (req, res, next) => {
    try {
        const { homeId } = req.params;
        const cacheKey = `home:${homeId}`;

        let cacheEntry = await redisClient.get(cacheKey);

        if (cacheEntry) {
            cacheEntry = JSON.parse(cacheEntry);

            return res.status(200).send(cacheEntry);
        }

        // Get from db
        const home = await House.findById(homeId).lean();

        // Set to Redis cache
        redisClient.set(cacheKey, JSON.stringify(home), "EX", 86400);

        res.status(200).json(home);

    } catch (err) {
        next(err);
    }
});

// GET req specific homes based on search query
router.get("/search/:searchTerm", async (req, res, next) => {
    try {
        const cleanSearchTerm = sanitizeHtml(req.params.searchTerm);
        // Search by street, city, state, or zip
        // updated query with text index
        const query = (
            { $text: { $search: cleanSearchTerm } }
        );
        const homeResults = await House.find(query)
                                       .select({ score: { $meta: "textScore" } })
                                       // Sort by best matches first
                                       .sort({ score: { $meta: "textScore" } })
                                       .lean();

        if (homeResults.length === 0 || !homeResults) {
            return res.status(404).json({
                error: "There are no homes found for your search, please check available homes and try again."
            });
        }

        res.status(200).json(homeResults);

    } catch (err) {
        next(err);
    }
});

// AUTH protected routes //

// POST to create a new home
router.post("/new", checkAuth, cpUpload, validate([

    body("price").notEmpty().trim(),
    body("street").notEmpty().trim(),
    body("city").notEmpty().trim(),
    body("state").notEmpty().trim(),
    body("zip").notEmpty().trim(),
    body("lat").notEmpty().trim(),
    body("lon").notEmpty().trim(),
    body("bedrooms").notEmpty().trim(),
    body("bathrooms").notEmpty().trim(),
    body("squareFeet").notEmpty().trim(),
    body("description").notEmpty().trim(),
    body("agent").notEmpty().trim(),
    body("agent_phone").notEmpty().trim()

]), async (req, res, next) => {

    try {
        const home = new House({
            price: req.body.price,
            street: req.body.street,
            city: req.body.city,
            state: req.body.state,
            zip: req.body.zip,
            lat: req.body.lat,
            lon: req.body.lon,
            bedrooms: req.body.bedrooms,
            bathrooms: req.body.bathrooms,
            squareFeet: req.body.squareFeet,
            description: req.body.description,
            agent: req.body.agent,
            agent_img: `${process.env.SERVER_URL_PROD}/${req.files.agent_img[0].path}`,
            agent_phone: req.body.agent_phone,
            house_img_main: `${process.env.SERVER_URL_PROD}/${req.files.house_img_main[0].path}`,
            house_img_inside_1: `${process.env.SERVER_URL_PROD}/${req.files.house_img_inside_1[0].path}`,
            house_img_inside_2: `${process.env.SERVER_URL_PROD}/${req.files.house_img_inside_2[0].path}`,
        });

        await home.save();

        res.status(201).json({
            message: "New home created!"
        });
    } catch (err) {
        next(err);
    }
});

// PATCH an existing home
router.patch("/update", checkAuth, cpUpload, async (req, res, next) => {
    try {
        const cleanStreetQuery = sanitizeHtml(req.body.streetQuery);
        const query = { street: cleanStreetQuery };
        const updateObject = reviseObjImgPaths(req.files, req, req.body);

        await House.findOneAndUpdate(query, { $set: updateObject });

        res.status(201).json({
            message: "Home updated!"
        });
    } catch (err) {
        next(err);
    }
});

// DELETE an existing home
router.delete("/delete", checkAuth, validate([

    body("streetQuery").notEmpty().trim()
    
]), async (req, res, next) => {
    try {
        const query = { street: req.body.streetQuery };

        await House.findOneAndRemove(query);

        res.status(200).json({
            message: "Home deleted!"
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;