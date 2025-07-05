require("dotenv").config();
const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.CHAT_ENCRYPTION_KEY; // 32 chars
const IV_LENGTH = 16;

function encrypt(text) {
    console.log("🔓 Encrypting Message:", text); // before encryption
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
    console.log("🔒 Encrypted Message:", encrypted.toString("hex")); // after encryption
  return iv.toString("hex") + ":" + encrypted.toString("hex");
  
}

// function decrypt(text) {
//   try {
//     const [ivHex, encryptedHex] = text.split(":");
//   const iv = Buffer.from(ivHex, "hex");
//   const encryptedText = Buffer.from(encryptedHex, "hex");
//   const decipher = crypto.createDecipheriv(
//     "aes-256-cbc",
//     Buffer.from(ENCRYPTION_KEY),
//     iv
//   );
//   let decrypted = decipher.update(encryptedText);
//   decrypted = Buffer.concat([decrypted, decipher.final()]);
//     console.log("🔓 Decrypted Message:", decrypted.toString()); // after decryption
//   return decrypted.toString();
// } catch (error) {
//   console.error("❌ Decryption Failed:", error.message);
// }
// }

function decrypt(text) {
  console.log("✅ Raw encrypted text received in decrypt():", text);

  try {
    const [ivHex, encryptedHex] = text.split(":");

    if (!ivHex || !encryptedHex) {
      throw new Error("Invalid encrypted format. Expecting IV:Encrypted");
    }

    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const result = decrypted.toString();
    console.log("🔓 Decrypted Result:", result);
    return result;
  } catch (err) {
    console.error("❌ Decryption Failed:", err.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
