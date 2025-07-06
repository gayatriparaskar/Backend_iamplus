const mongoose = require("mongoose");
// const conversationModel = require("../models/conversationModel");

// const ConversationGroup = require("../models/conversarionGroup");
// const chatModel = require("../models/Chats");
const User = require("../models/Auth");
// const GroupModel = require("../models/Group");
// const GroupChat = require("../models/GroupChat");
const { onlineUsers } = require("../socket/conversationSocket");
const { ObjectId } = require("mongoose").Types;
const { v4: uuidv4 } = require("uuid"); // to generate unique group ID
const ConversationGroup = require("../models/conversation");
const MessageModel = require("../models/Message");

module.exports.getMessage1on1 = async (req, res) => {
  try {
    const messages = await MessageModel.find({
      conversationId: req.params.conversationId,
    }).sort({ createdAt: 1 });
     const enriched = messages.map((msg) => ({
      ...msg._doc,
      status: msg.read ? "read" : "delivered",
    }));
    console.log("messagessssssssssssssssssssssssssssssss", messages);
    res.status(200).json(messages);
  } catch (err) {
    console.error("Send message failed", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

module.exports.getMessageListAll = async (req, res) => {
  try {
    const userId = req.params.userId;

    const conversations = await ConversationGroup.find({
      "members._id": userId,
    })
      .sort({ updatedAt: -1 })
      .limit(50);

    const formatted = await Promise.all(
      conversations.map(async (convo) => {
        const unreadCount = await MessageModel.countDocuments({
          conversationId: convo._id,
          read: false,
          senderId: { $ne: userId }, // ✅ exclude user's own messages
          "seenBy.userId": { $ne: userId }, // ✅ not seen by this user yet
        });
        console.log(unreadCount, "unreadCounttttttttttttttttttttttttttttt");

        const lastMsgRead = await MessageModel.findOne({
          conversationId: convo._id,
        }).sort({ timestamp: -1 });

        // Include `status: "read"` logic if receiver has read it
        const enrichedLastMsg = lastMsgRead
          ? {
              ...lastMsgRead._doc,
              status: lastMsgRead.read ? "read" : "delivered",
            }
          : null;
        if (convo.type === "1on1") {
          const otherUser = convo.members.find(
            (m) => m._id.toString() !== userId
          );

          let userDetails = null;
          if (otherUser && otherUser._id) {
            userDetails = await User.findById(otherUser._id).select(
              "userName phone_number online_status last_seen"
            );
          }

          return {
            _id: convo._id,
            type: "1on1",
            user: {
              _id: otherUser?._id,
              userName: userDetails?.userName || null,
              phone_number: userDetails?.phone_number || null,
            },
            lastMsg: convo.lastMessage || null,
            lastMsgAt: convo.updatedAt,
            unreadCount,
            lastMsgRead: enrichedLastMsg,
            online_status: userDetails?.online_status || "offline",
            last_seen: userDetails?.last_seen || null,
          };
        } else {
          // group chat
          return {
            _id: convo._id,
            type: "group",
            user: {
              userName: convo.name,
              image: convo.image,
              location: convo.location,
              members: convo.members,
              admins: convo.admins,
              createdBy: convo.createdBy,
            },
            lastMsg: convo.lastMessage || null,
            lastMsgAt: convo.updatedAt,
            unreadCount,
            lastMsgRead,
          };
        }
      })
    );

    // Optional: sort by most recent lastMsgAt
    formatted.sort((a, b) => new Date(b.lastMsgAt) - new Date(a.lastMsgAt));
    // console.log(formatted,"formatted")
    res.status(200).json(formatted);
  } catch (err) {
    console.error("Get chat list failed", err);
    res.status(500).json({ error: "Failed to get all chat list" });
  }
};

module.exports.markPersonalChatAsRead = async (req, res) => {
  const { userId, conversationId } = req.params;

  try {
    await MessageModel.updateMany(
      {
        conversationId,
        // receiverId: userId,
        read: false,
        senderId: { $ne: userId }, // only mark messages not sent by user
        "seenBy.userId": { $ne: currentUserId }  // not already seen
      },
      {
    $push: {
      seenBy: { userId: currentUserId, timestamp: new Date() }
    },
       $set: { read: true,status:"read"}
     }
    );
     // ✅ Emit socket event to notify sender
    const io = require("../socket/socketInstance"); // import your io instance here (ensure it's shared)
    io.to(conversationId).emit("messagesReadBy", {
      from: userId, // reader
      conversationId,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
};

module.exports.markGroupChatAsRead = async (req, res) => {
  const { groupId, userId } = req.params;

  try {
    await GroupChat.updateMany(
      {
        groupId,
        "seenBy.userId": { $ne: userId },
      },
      {
        $addToSet: { seenBy: { userId: new ObjectId(userId) } },
      }
    );

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark group messages as read" });
  }
};
