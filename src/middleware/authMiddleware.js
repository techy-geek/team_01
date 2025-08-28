// middleware/authMiddleware.js
const jwt = require( "jsonwebtoken");

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.host = decoded; // hostId and email
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};
