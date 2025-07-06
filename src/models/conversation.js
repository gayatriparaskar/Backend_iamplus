const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.Mixed, // can be either ObjectId (for group) or string (for 1on1)
  },
  type: {
    type: String,
    enum: ['1on1', 'group'],
    default: '1on1'
  },
  appType: {
    type: String,
    enum: ['hostel', 'shop', 'service'],
  },

  appData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Group chat: name and optional image
  name: { type: String }, // only for group
  image: { type: String }, // optional group image
  location: { type: String }, // optional group image

  // Common to both 1on1 and group
 members: [{
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails' },
  name: String,
  mobile: String,
  role: String
}],


  // Only for group (admin users)
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserDetails'
  }],

  // Track last message sent in this conversation
  lastMessage: {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails' },
    message: { type: String },
    messageType: { type: String },
    fileUrl: { type: String },
    timestamp: { type: Date, default: Date.now },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails' }],
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent"
    },
    read: { type: Boolean, default: false }
  },

  // Optional metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserDetails'
  },
  read: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }

}, {
  timestamps: true
});

const ConversationGroup = mongoose.model('conversations', ConversationSchema);
module.exports = ConversationGroup;