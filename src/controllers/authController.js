const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Host = require("../models/hostModel");

// Signup
const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await Host.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const newHost = new Host({ username, email, password });
    await newHost.save();

    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const host = await Host.findOne({ email });
    if (!host) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await host.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: host._id }, "secretkey", { expiresIn: "1h" });

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { signup, login };   //   THIS IS IMPORTANT
