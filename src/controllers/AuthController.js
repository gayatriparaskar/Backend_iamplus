const { configDotenv } = require("dotenv");
const UserModel = require("../models/Auth");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { successResponse, errorResponse } = require("../helper/successAndError");
dotenv.config();
const {sendSMS} = require("../utils/sendSMS"); // ✅ import simulated SMS
const otpStore = require("../utils/otpStore");

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(phone) {
  return phone.replace(/\D/g, '').slice(-10); // keep last 10 digits (Indian numbers)
}


module.exports.register = async (req, res) => {
  try {
    const data = req.body;

    // ✅ Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ phone_number: data.phone_number }],
    });
     console.log("existingUser",existingUser);
     
    if (existingUser) {
      const otp = generateOTP();
      const normPhone = normalizePhone(data.phone_number); // ✅ normalize here
      otpStore.set(normPhone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 mins expiry
    });
    const smsSent = await sendSMS(
      `+91${data.phone_number}`,
     
      `Your IAmPlus--Simflo verification code is ${otp}. Please enter this code to proceed.`
    );
    console.log(`✅ OTP for ${data.phone_number}:`, otp);
     return res.status(200).json({
      success: true,
      message: "Login successful",
      existingUser,
      smsSent:otp
    });
    }

    // // ✅ Generate OTP
    // const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // data.otp = otp;
    // data.isVerified = false;

    // Inside register controller, before saving user:
    const otp = generateOTP();
    const normPhone = normalizePhone(data.phone_number); // ✅ normalize here
    otpStore.set(normPhone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 mins expiry
    });
    console.log(`✅ OTP for ${data.phone_number}:`, otp);

    // ✅ Create user
   const newUser = new UserModel({
  ...data,
  status_message: "send",       // ✅ enum safe default
  online_status: "offline",     // ✅ enum safe default
  last_seen: new Date(),        // ✅ correct type
});
    await newUser.save();

    // ✅ Simulate SMS sending
    const smsSent = await sendSMS(
      data.phone_number,
      `Your OTP for registration is: ${otp}`
    );

    if (!smsSent) {
      return res
        .status(500)
        .json(
          errorResponse(500, "User created but failed to send OTP via SMS")
        );
    }

    // console.log("✅ New user registered:", newUser);

    return res.status(201).json(
      successResponse(201, "User registered and OTP sent", {
        user_id: newUser._id,
        phone_number: newUser.phone_number,
        username: newUser.newName,
        email: newUser.email_id,
        status_message: newUser.status_message,
         nick_name : newUser.nick_name,  
        display_name: newUser.display_name,
        dp: newUser.dp,
        online_status: newUser.online_status,
        last_seen: newUser.last_seen,
        current_status: newUser.current_status,
        connection_chain: newUser.connection_chain,
        location: newUser.location,
        home: newUser.home,
        work: newUser.work,
        website: newUser.website,
        social_media: newUser.social_media,
        circle: newUser.circle,
        verified_as: newUser.verified_as,
        createdAt: newUser.createdAt,
        otp
      })
    );
  } catch (error) {
    console.error("❌ Register Error:", error);
    return res
      .status(500)
      .json(errorResponse(500, "User is not created", error.message));
  }
};


module.exports.verifyOtp = async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number and OTP are required" });
    }

    const user = await UserModel.findOne({ phone_number });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res
        .status(200)
        .json({ success: true, message: "User already verified" });
    }

    const normPhone = normalizePhone(phone_number); // ✅ normalize here
    const storedOtpData = otpStore.get(normPhone);
    console.log("📦 Stored OTP data:", storedOtpData);
    console.log("📥 OTP provided by user:", otp);
    if (!storedOtpData || storedOtpData.otp !== otp) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or not sent" });
    }

    if (storedOtpData.expiresAt < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }

    // ✅ OTP matched and not expired
    user.isVerified = true;
    await user.save();

    // ✅ Clear the OTP from the store
    otpStore.delete(normPhone);

    // ✅ Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const { password, __v, ...safeUser } = user.toObject();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("❌ OTP Verification Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports.resendOtp = async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res
        .status(400)
        .json(errorResponse(400, "Phone number is required"));
    }

    const user = await UserModel.findOne({ phone_number });

    if (!user) {
      return res.status(404).json(errorResponse(404, "User not found"));
    }

    if (user.isVerified) {
      return res
        .status(200)
        .json(successResponse(200, "User is already verified"));
    }

    // ✅ Generate new OTP
    const normPhone = normalizePhone(phone_number); // ✅ normalize
    const newOtp = generateOTP();
    otpStore.set(normPhone, {
      otp: newOtp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // ✅ Simulate OTP via SMS
    const smsSent = await sendSMS(phone_number, `Your new OTP is: ${newOtp}`);

    if (!smsSent) {
      return res
        .status(500)
        .json(errorResponse(500, "Failed to resend OTP via SMS"));
    }

    console.log("✅ OTP resent to", phone_number);

    return res
      .status(200)
      .json(successResponse(200, "OTP resent successfully"));
  } catch (error) {
    console.error("❌ Resend OTP Error:", error);
    return res
      .status(500)
      .json(errorResponse(500, "Server error is this :", error.message));
  }
};

