const { configDotenv } = require("dotenv");
const UserModel = require("../models/Auth");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { successResponse, errorResponse } = require("../helper/successAndError");
dotenv.config();
const sendSMS = require("../utils/sendSMS"); // ✅ import simulated SMS
const otpStore = require("../utils/otpStore");

module.exports.getAllUsers = async (req, res) => {
  try {
    const allUsers = await UserModel.find();
    res
      .status(200)
      .json(
        successResponse(200, "All users are retrived successfully", allUsers)
      );
  } catch (error) {
    res.status(500).json(500, "Users are not retrived", error.message);
  }
};

module.exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId; // assuming you set this from auth middleware

    if (!userId) {
      return res.status(400).json(errorResponse(400, "User ID is required"));
    }

    const user = await UserModel.findById(userId).select("-password -__v");

    if (!user) {
      return res.status(404).json(errorResponse(404, "User not found"));
    }

    res
      .status(200)
      .json(successResponse(200, "User profile retrieved successfully", user));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(500, "User profile retrieval failed", error.message));
  }
};

// update User Profile
module.exports.updateUser = async (req, res) => {
  try {
    const { password, ...updateFields } = req.body;
    const { userId } = req.params;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json(errorResponse(404, "User not found"));
    }

    console.log("Password Match:", await user.comparePassword(password));

    if (password) {
      user.password = password; // Just assign plain password
    }

    // Update other fields
    Object.keys(updateFields).forEach((key) => {
      user[key] = updateFields[key];
    });

    await user.save(); // This triggers the pre-save hook if defined

    res.status(200).json({ success: true, message: "User updated", user });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Update failed", error: err.message });
  }
};

module.exports.deleteUser = async (req, res) => {
  try {
    const Id = req.params.id;
    const deleteUser = await UserModel.findByIdAndDelete(Id);

    res
      .status(200)
      .json(successResponse(200, "User is deleted successfully", deleteUser));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(500, "User is not delete", error.message));
  }
};

// Search user by phone number
module.exports.searchUserByPhone = async (req, res) => {
  try {
    const { phone_number } = req.query;

    if (!phone_number) {
      return res
        .status(400)
        .json(errorResponse(400, "Phone number is required for search"));
    }

    const user = await UserModel.findOne({ phone_number });

    if (!user) {
      return res
        .status(404)
        .json(errorResponse(404, "User not found with this phone number"));
    }

    res
      .status(200)
      .json(successResponse(200, "User retrieved successfully", user));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(500, "Search failed", error.message));
  }
};

