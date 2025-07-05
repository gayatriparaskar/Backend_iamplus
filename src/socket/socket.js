// src/socket/socket.js
const Chat = require("../models/Chats");
const GroupChat = require("../models/GroupChat");
const Group = require("../models/Group");
const User = require("../models/Auth");
const { sendPushNotification } = require('../utils/sendPushNotification');
const { encrypt, decrypt } = require("../utils/encryption");

const onlineUsers = {};

async function updateUserOnlineStatus(userId, status) {
  await User.findByIdAndUpdate(userId, {
    online_status: status,
    ...(status === "offline" ? { last_seen: new Date() } : {}),
  });
}

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ✅ Handle user online status
    socket.on("userOnline", async (userId) => {
      onlineUsers[userId] = socket.id;
      await updateUserOnlineStatus(userId, "online");
      console.log(`User ${userId} is now online`);
    });

    socket.on("join", ({ userId }) => {
      onlineUsers[userId] = socket.id;
    });

    socket.on("joinGroup", ({ groupId }) => {
      socket.join(groupId);
      console.log(`User joined group ${groupId}`);
    });

    socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
      const chatData = {
        senderId,
        receiverId,
        message,
        timestamp: new Date(),
        read: false,
      };
 

      const savedMsg = await Chat.create(chatData);
      if(chatData){
         console.log("notificationnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn1");
         await sendPushNotification(receiverId, {
      title: 'New Message',
      body: message,
      url: `/chat/${senderId}`
    });
      }

      const receiverSocketId = onlineUsers[receiverId];

      if (receiverSocketId) {
        // ✅ Emit actual chat message to receiver
        io.to(receiverSocketId).emit("newMessageReceived", {
          senderId,
          receiverId,
          message,
          timestamp: savedMsg.timestamp,
        });
        await sendPushNotification(receiverId, {
      title: 'New Message',
      body: message,
      url: `/chat/${senderId}`
    });

        // ✅ Emit a lightweight notification to update chat list
        io.to(receiverSocketId).emit("newUnreadMessage", {
          from: senderId,
          message,
          timestamp: savedMsg.timestamp,
        });
        
      } else {
    // ✅ Push Notification if user is offline
    await sendPushNotification(receiverId, {
      title: 'New Message',
      body: message,
      url: `/chat/${senderId}`
    });
  }

      // (Optional) Push notification fallback if not online
    });

    // ✅ Group message handling
    socket.on(
  "sendGroupMessage",
  async ({
    groupId,
    senderId,
    message,
    messageType = "text",
    payload = {},
  }) => {
    try {
      console.log("🟢 Incoming group message", {
        groupId,
        senderId,
        message,
      });

      const sender = await User.findById(senderId);
      if (!sender) {
        console.warn("❌ Sender not found yet");
        return socket.emit("groupError", {
          message: "Sender not found",
          code: "SENDER_NOT_FOUND",
        });
      }

      const senderName = sender?.userName;
      const group = await Group.findById(groupId);
      if (!group || !group.members.includes(senderId)) {
        console.warn("❌ Unauthorized group access");
        return socket.emit("groupError", {
          message: "Unauthorized",
          code: "NOT_MEMBER",
        });
      }

      console.log("🔐 Encrypting message...");
      const encryptedMessage = encrypt(message);

      const chatData = {
        groupId,
        senderId,
        senderName,
        message: encryptedMessage,
        messageType,
        payload,
        timestamp: new Date(),
      };

      console.log("💾 Saving group chat:", chatData);
      const savedMsg = await GroupChat.create(chatData);

      // ✅ Emit to users currently in the group room (chat window)
      socket.to(groupId).emit("receiveGroupMessage", {
        ...savedMsg._doc,
        message, // decrypted for frontend
      });

      // ✅ Emit lightweight update to chat list for all other members
      for (const memberId of group.members) {
        const idStr = memberId.toString();
        const socketId = onlineUsers[idStr];

        // Skip sender
        if (idStr === senderId) continue;

        // 🔔 Push notification if offline
        if (socketId) {
          // ✅ Emit lightweight group notification for chat list
        io.to(socketId).emit("newUnreadMessage", {
       type: "group"||"user",
      chatId: groupId,
      from: senderId,
      message,
      timestamp: savedMsg.timestamp,
          });
        } else {
         // ✅ Push notification for offline users
    await sendPushNotification(idStr, {
      title: `New message in ${group.name}`,
      body: message,
      url: `/group/${groupId}`,
    });
        }
      }

      socket.emit("groupMessageSent", {
        success: true,
        data: savedMsg._doc,
        message,
      });

      console.log("✅ Group message saved, emitted, and notifications sent");
    } catch (err) {
      console.error("❌ Error sending group message chat:", err);
      socket.emit("groupError", {
        message: "Internal error",
        code: "SERVER_ERROR",
      });
    }
  }
);


    // ✅ Mark group messages as read
    socket.on("markGroupMessagesRead", async ({ userId, groupId }) => {
      try {
        await GroupChat.updateMany(
          {
            groupId,
            "seenBy.userId": { $ne: userId },
          },
          {
            $push: { seenBy: { userId, timestamp: new Date() } },
          }
        );
        console.log(
          `Marked messages as read in group ${groupId} for user ${userId}`
        );
      } catch (err) {
        console.error("Failed to mark group messages as read", err);
      }
    });

    // ✅ Mark 1-to-1 messages as read
    socket.on("markMessagesRead", async ({ userId, otherUserId }) => {
      try {
        await Chat.updateMany(
          {
            senderId: otherUserId,
            receiverId: userId,
            read: false,
          },
          {
            $set: { read: true },
          }
        );
        console.log(`Marked messages from ${otherUserId} as read by ${userId}`);
      } catch (err) {
        console.error("Failed to mark 1-to-1 messages read", err);
      }
    });

    // ✅ Handle user disconnect and mark offline
    socket.on("disconnect", async () => {
      let disconnectedUserId = null;
      for (let userId in onlineUsers) {
        if (onlineUsers[userId] === socket.id) {
          disconnectedUserId = userId;
          delete onlineUsers[userId];
          break;
        }
      }

      if (disconnectedUserId) {
        await updateUserOnlineStatus(disconnectedUserId, "offline");
        console.log("User disconnected:", disconnectedUserId);
      }
    });
  });
}

module.exports = { socketHandler, onlineUsers };
