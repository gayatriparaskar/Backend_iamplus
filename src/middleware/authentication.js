const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const { errorResponse } = require("../helper/successAndError");
const JWT_SECRET = process.env.JWT_SECRET;


const authentication = async (req, res, next) => {


  try {
    let token = req.header("Authorization");
    token = token && token.replace("Bearer ", "");

    if (!token) {
      return res.status(404).json(errorResponse(404, "Token is needed"));
    }

    const verifyToken = jwt.verify(token, JWT_SECRET);

    req.userId = verifyToken.userId; // ✅ Attach decoded token info to req
    req.userRole = decoded.role;   // important


    console.log(verifyToken);
    next();
  } catch (error) {
    console.log(error);
    res.status(500).json(errorResponse(500, "Server Error"));
  }
};


module.exports = authentication;

