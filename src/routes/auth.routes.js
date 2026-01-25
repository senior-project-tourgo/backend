const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { signToken } = require("../utils/jwt");

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashed,
        });

        const token = signToken({ id: user._id, role: user.role });

        res.json({ user, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ id: user._id, role: user.role });
    res.json({ user, token });
});

module.exports = router;
