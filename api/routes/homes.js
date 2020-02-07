const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const House = require("../models/House");

// GET all homes
router.get("/", async (req, res, next) => {
    try {
        const allHomes = await House.find();

        res.status(200).json(allHomes);
    } catch (err) {
        console.error(err);
        res.json({
            message: err
        });

        next(err);
    }
});

// GET a specific home
router.get("/:homeId", async (req, res, next) => {
    try {
        const home = await House.findById(req.params.homeId);

        res.json(home);
    } catch (err) {
        console.error(err);
        res.json({
            message: err
        });

        next(err);
    }
});

// POST to create a new home
router.post("/new", async (req, res, next) => {
    try {
        const home = new House({
            street: req.body.street,
            city: req.body.city,
            state: req.body.state,
            zip: req.body.zip,
            bedrooms: req.body.bedrooms,
            bathrooms: req.body.bathrooms,
            squareFeet: req.body.squareFeet,
            description: req.body.description,
            agent: req.body.agent
        });

        await home.save();

        res.status(201).json({
            message: "New home created!"
        });
    } catch (err) {
        console.error(err);
        res.json({
            message: err
        });

        next(err);
    }
});

router.delete("/:homeId", async (req, res, next) => {
    try {
        const removedHome = await House.findByIdAndRemove(req.params.homeId);

        res.json(removedHome);
    } catch (err) {
        console.error(err);
        res.json({
            message: err
        });

        next(err);
    }
});

module.exports = router;