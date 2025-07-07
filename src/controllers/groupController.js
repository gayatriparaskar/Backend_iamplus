const mongoose = require("mongoose");
const { successResponse, errorResponse } = require("../helper/successAndError");
const ObjectId = mongoose.Types.ObjectId;

const GroupModel = require("../models/Group");


// const { onlineUsers } = require("../socket/socket");
const { onlineUsers } = require("../socket/conversationSocket");
const ConversationGroup = require("../models/conversation");

module.exports.createGroup = async (req, res) => {
  try {
    const {
      type = 'group',
      appType = '',
      appData = '',
      name = '',
      image = '',
      location = '',
      members = [],
      admins = [],
      lastMessage = {}
    } = req.body;

    const creatorId = req.userId || admins[0]?._id || admins[0]; // fallback
    const creatorObjId = new mongoose.Types.ObjectId(creatorId);

    // 🔁 Build full members array with role, name, mobile
    const memberMap = new Map();

    members.forEach((m) => {
      const id = new mongoose.Types.ObjectId(m._id || m);
      memberMap.set(id.toString(), {
        _id: id,
        name: m.name || '',
        mobile: m.mobile || '',
        role: m.role || 'member'
      });
    });

    // ⬆️ Ensure all admins are in members
    admins.forEach((a) => {
      const id = new mongoose.Types.ObjectId(a._id || a);
      if (!memberMap.has(id.toString())) {
        memberMap.set(id.toString(), {
          _id: id,
          name: '',
          mobile: '',
          role: 'admin'
        });
      } else {
        memberMap.get(id.toString()).role = 'admin';
      }
    });

    // ⬆️ Ensure creator is included and is admin
    if (!memberMap.has(creatorObjId.toString())) {
      memberMap.set(creatorObjId.toString(), {
        _id: creatorObjId,
        name: '',
        mobile: '',
        role: 'admin'
      });
    } else {
      memberMap.get(creatorObjId.toString()).role = 'admin';
    }

    const finalMembers = Array.from(memberMap.values());
    const finalAdmins = finalMembers
      .filter((m) => m.role === 'admin')
      .map((m) => m._id);

    const groupId = new mongoose.Types.ObjectId();

    const group = await ConversationGroup.create({
      _id: groupId,
      type,
      appType,
      appData,
      name,
      image,
      location,
      members: finalMembers,
      admins: finalAdmins,
      createdBy: creatorObjId,
      lastMessage: {
        senderId: lastMessage.senderId || creatorObjId,
        message: lastMessage.message || '',
        messageType: lastMessage.messageType || 'text',
        fileUrl: lastMessage.fileUrl || '',
        timestamp: lastMessage.timestamp || new Date(),
        seenBy: lastMessage.seenBy || [],
        status: lastMessage.status || 'sent',
        read: lastMessage.read || false
      },
      read: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("✅ Group Created:", group);

    // 🔔 Notify all members if online
    finalMembers.forEach((member) => {
      const sid = onlineUsers[member._id.toString()];
      if (sid) {
        io.to(sid).emit("newGroupCreated", {
          success: true,
          group
        });
      }
    });

    return res.status(201).json(successResponse("Group is created", group));
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
