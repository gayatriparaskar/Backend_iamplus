const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  userName: {type:String, default:"IamPlus"},
  last_name: {type:String, default:"IamPlus"},
  password: {type:String, default:"IamPlus"},
  nick_name: {type:String, default:"IamPlus"},
  display_name: {type:String, default:"IamPlus"},
  phone_number: {type:String, required:true},
  email_id: {type:String, default:"IamPlus"},
  dp: {type:String, default:"IamPlus"},
  status_message: {type:String, default:"send" , enum:["send","unsend","read",]},
  online_status: {type:String, enum: ["online", "offline"], default: "offline"},
  last_seen: {type:Date},
  current_status: {type:String, default:"IamPlus"},
  connection_chain: {type:String, default:"IamPlus"},
  location: {type:String, default:"IamPlus"},
  home: {type:String, default:"IamPlus"},
  work: {type:String, default:"IamPlus"},
  website: {type:String, default:"IamPlus"},
  social_media: [{type:String, default:"IamPlus"}],
  circle: [{type:String, default:"IamPlus"}],
  verified_as: [{type:String, default:"IamPlus"}], // e.g. ["email", "phone", "aadhar"]
   // 👇 Add this field for push subscription
  subscription: {
    endpoint: { type: String },
    keys: {
      p256dh: { type: String },
      auth: { type: String }
    }
  }
});


const UserModel = mongoose.model("UserDetails", userSchema);
module.exports = UserModel;
