// src/utils/otpStore.js
const mongoose  = require ("mongoose");

const otpStore = new Map(); // phone_number => { otp, expiresAt }
// utils/otpStore.js
const otpMap = new Map();

module.exports = {
  set: (key, value) => {
    console.log(`🟢 OTP set for ${key}:`, value);
    otpMap.set(key, value);
  },
  get: (key) => {
    const value = otpMap.get(key);
    console.log(`🔵 OTP get for ${key}:`, value);
    return value;
  },
  delete: (key) => {
    console.log(`🟠 OTP deleted for ${key}`);
    otpMap.delete(key);
  },
  keys: () => Array.from(otpMap.keys())
};

// // src/utils/otpStore.js
// const mongoose  = require ("mongoose");

// const otpStore = new Map(); // phone_number => { otp, expiresAt }
// module.exports = otpStore;