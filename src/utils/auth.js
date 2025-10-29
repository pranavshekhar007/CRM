const jwt = require("jsonwebtoken");
const Admin = require("../model/admin.schema");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Authentication token is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY); // Ensure JWT_KEY is set in your .env file

    const admin = await Admin.findOne({  _id: decoded.id });
    if (!admin) {
      return res.status(401).json({ error: "Admin not found or token is invalid" });
    }

    req.token = token;
    req.admin = admin;
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid authentication token" });
  }
};

module.exports = auth;
