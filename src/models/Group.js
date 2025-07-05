const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Auth', required: true }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Auth', required: true }]
}, {
  timestamps: true // ✅ this automatically adds createdAt & updatedAt
});

const GroupModel = mongoose.model('Group', GroupSchema);

module.exports = GroupModel;
