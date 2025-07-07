const mongoose = require("mongoose");
const { successResponse, errorResponse } = require("../helper/successAndError");
const ObjectId = mongoose.Types.ObjectId;

const GroupModel = require("../models/Group");


// const { onlineUsers } = require("../socket/socket");
const { onlineUsers } = require("../socket/conversationSocket");
const ConversationGroup = require("../models/conversation");

// app.post('/groups', async (req, res) => {
module.exports.createGroup = async (req, res) => {
  try {
    const { name, members = [], admins = [], type = "group" } = req.body;

    const creatorId = req.userId || admins[0]?._id || admins[0]; // fallback if userId not available from auth middleware
    const creatorObjId = new mongoose.Types.ObjectId(creatorId);

    // Convert to ObjectId array if needed
    const memberIds = members.map((m) => new mongoose.Types.ObjectId(m._id || m));
    const adminIds = admins.map((a) => new mongoose.Types.ObjectId(a._id || a));

    // Ensure creator is in members
    if (!memberIds.some((id) => id.equals(creatorObjId))) {
      memberIds.push(creatorObjId);
    }

    // Ensure creator is in admins
    if (!adminIds.some((id) => id.equals(creatorObjId))) {
      adminIds.push(creatorObjId);
    }

    // Ensure all admins are in members
    adminIds.forEach((adminId) => {
      if (!memberIds.some((id) => id.equals(adminId))) {
        memberIds.push(adminId);
      }
    });

    const newId = new mongoose.Types.ObjectId();

    const group = await ConversationGroup.create({
      _id: newId,
      name,
      type,
      members: memberIds.map((_id) => ({ _id })),
      admins: adminIds.map((_id) => ({ _id })),
      createdBy: creatorObjId,
      createdAt: new Date(),
    });

    console.log("✅ Group Created:", group);

    // Notify all members (including creator)
    memberIds.forEach((memberId) => {
      const sid = onlineUsers[memberId.toString()];
      if (sid) {
        io.to(sid).emit("newGroupCreated", {
          success: true,
          group,
        });
      }
    });

    return res.status(200).json(successResponse("Group is created", group));
  } catch (error) {
    console.error("❌ Group creation failed:", error);
    return res.status(500).json(errorResponse("Group is not created", error.message));
  }
};


// app.get('/groups/:userId', async (req, res) => {
module.exports.getGroup = async (req, res) => {
  const userId = req.params.userId;

  try {
    const groups = await GroupModel.find({ members: new ObjectId(userId) })
      .populate("members", "userName dp") // Only selected fields
      .populate("admins", "userName");
    res.json(groups);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch groups", error: err.message });
  }
};

let io; // 👈 declare io reference

module.exports.setSocketIo = (ioInstance) => {
  io = ioInstance;
};

// app.post('/groups/:groupId/add-member', async (req, res) => {
module.exports.addMembers = async (req, res) => {
  const { groupId } = req.params;
  const { userIdToAdd } = req.body;

  try {
    const group = await GroupModel.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const userObjectId = new ObjectId(userIdToAdd);

    if (group.members.includes(userObjectId)) {
      return res.status(400).json({ message: "User already a member" });
    }

    group.members.push(userObjectId);
    await group.save();

    // ✅ Optional: Notify sockets in the group
    io.to(groupId).emit("groupMemberAdded", {
      groupId,
      newMember: userIdToAdd,
    });

    res.json({ message: "User added", group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding member" });
  }
};

// app.get('/group-messages/:groupId', async (req, res) => {
module.exports.groupMessage = async (req, res) => {
  const messages = await GroupChat.find({ groupId: req.params.groupId }).sort({
    timestamp: 1,
  });
  res.json(messages);
};
