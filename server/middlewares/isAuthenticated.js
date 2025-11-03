// server/middlewares/isAuthenticated.js
import jwt from "jsonwebtoken";

const isAuthenticated = async (req, res, next) => {
  try {
    // Support both cookie token and Authorization header (Bearer)
    let token = null;
    if (req.cookies && req.cookies.token) token = req.cookies.token;
    else if (req.headers?.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        message: "User not authenticated",
        success: false,
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        message: "Invalid token",
        success: false,
      });
    }

    // attach user id to request for later handlers
    req.id = decoded.userId;
    next();
  } catch (error) {
    console.error("isAuthenticated error:", error);
    // If token expired or invalid, return 401
    return res.status(401).json({
      message: "Authentication failed",
      success: false,
      error: error.message,
    });
  }
};

export default isAuthenticated;
