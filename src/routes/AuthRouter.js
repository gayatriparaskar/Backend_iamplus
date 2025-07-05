const express = require("express");
const authRoutes = express.Router();
const { register, login , verifyOtp , resendOtp } = require("../controllers/AuthController");

 const { getAllUsers, getProfile ,updateUser ,deleteUser , searchUserByPhone} = require("../controllers/userController");
 
authRoutes.post("/register", register);
// authRoutes.post("/login", login);
authRoutes.post("/verifyOtp", verifyOtp);
authRoutes.post("/resendOtp", resendOtp);
authRoutes.get("/getAllUsers", getAllUsers);
authRoutes.get("/profile/:id", getProfile);
authRoutes.put("/updateUser/:userId", updateUser);
authRoutes.delete("/deleteUser/:id", deleteUser);
authRoutes.get("/search", searchUserByPhone);

module.exports = authRoutes;
