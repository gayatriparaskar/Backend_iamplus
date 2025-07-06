const User = require("../models/Auth");
const { encrypt, decrypt } = require("../utils/encryption");
const { sendPushNotification } = require("../utils/sendPushNotification");
const ConversationGroup = require("../models/conversation");
const MessageModel = require("../models/Message");
const mongoose = require("mongoose");
const onlineUsers = {};

async function updateUserOnlineStatus(userId, status) {
   if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.warn(`⚠️ Skipping updateUserOnlineStatus — Invalid ObjectId: ${userId}`);
    return;
  }
  await User.findByIdAndUpdate(userId, {
    online_status: status,
    ...(status === "offline" ? { last_seen: new Date() } : {}),
  });
}
// function generateConversationId(mobile1, mobile2) {
//   if (!mobile1 || !mobile2) return null;
//   const sorted = [mobile1, mobile2].sort();
//   return `${sorted[0]}_${sorted[1]}`;
// }

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // ========================
    //✅ Online Status Handling
    socket.on("joinConversation", (conversationId) => {
      socket.join(conversationId);
    });

    // ========================
    socket.on("userOnline", async (userId) => {
      onlineUsers[userId] = socket.id;
     if (mongoose.Types.ObjectId.isValid(userId)) {
    await updateUserOnlineStatus(userId, "online");
  } else {
    console.warn(`⚠️ userOnline event received with invalid ID: ${userId}`);
  }
      console.log(`🟢 ${userId} is online`);
    });

    socket.on("join", ({ userId }) => {
      onlineUsers[userId] = socket.id;
    });

    socket.on("joinGroup", ({ groupId }) => {
      socket.join(groupId);
      console.log(`🟦 Joined group ${groupId}`);
    });

    socket.on(
      "sendMessage",
      async ({
        senderId,
        receiverId, // Optional in case of group
        message,
        messageType = "text",
        payload = {},
        conversationId,
        type,
      }) => {
        try {
          console.log(
            conversationId,
            "conversationIdddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
          );

          // 1️⃣ Validate conversationId
          if (!conversationId) {
            console.error("❌ Missing conversationId");
            return;
          }

          let conversation = null;

          // 🛠 Convert to ObjectId ONLY if it's valid
          if (mongoose.Types.ObjectId.isValid(conversationId)) {
            // Group conversation (ObjectId)
            conversation = await ConversationGroup.findById(
              new mongoose.Types.ObjectId(conversationId)
            );
          } else {
            // 1-on-1 chat (String _id)
            conversation = await ConversationGroup.findOne({
              _id: conversationId,
            });
          }
          console.log(conversation, "conversationnnnnnnn");
          if (!conversation) {
            if (type === "1on1") {
              // Auto-create for 1on1 (receiverId is required)
              if (!receiverId) {
                console.error("❌ Missing receiverId for 1on1 chat");
                return;
              }

              conversation = await ConversationGroup.create({
                _id: conversationId,
                type,
                members: [{ _id: senderId }, { _id: receiverId }],
                createdBy: senderId,
                createdAt: new Date(),
              });
            } else if (type === "group") {
              console.error(
                "❌ Group conversation must exist before sending messages"
              );
              // return;
            }
          }

          // 3️⃣ Prepare Message Payload
          const chatData = {
            type,
            senderId,
            receiverId: receiverId || null, // group may not have receiverId
            conversationId,
            message,
            messageType,
            payload,
            timestamp: new Date(),
            read: false,
          };

          chatData.status = "sent";
          const savedMsg = await MessageModel.create(chatData);

          let updateResult = null;
          const lastMessage = {
            senderId,
            message:message,
            messageType:messageType || "text",
            payload,
            fileUrl: chatData.fileUrl || null,
            timestamp: new Date(),
            read: false,
          };

          // console.log(conversation1,"conversation")
          if (mongoose.Types.ObjectId.isValid(conversationId)) {
            // ✅ It's a group (ObjectId)
            console.log("grouppppppppppppppppppppppppppppppppppppppp");
            updateResult = await ConversationGroup.findByIdAndUpdate(
              new mongoose.Types.ObjectId(conversationId),
              { lastMessage, updatedAt: new Date() },
              { new: true }
            );
            console.log(
              "✅ Updated conversationnnnnnnnnnnnnnnnnnnnnnnnn:",
              updateResult
            );
          } else {
            // ✅ It's a 1-on-1 (String ID)
            console.log("1111111111111111111111111111111111111111111");
            updateResult = await ConversationGroup.findOneAndUpdate(
              { _id: conversationId },
              { lastMessage, updatedAt: new Date() },
              { new: true }
            );
          }

          console.log("✅ Updated conversation:", updateResult);

          // console.log(updatedCon,"updatedConnnnnnnnnnnnnnnnnnnnnnn")
          const msgPayload = { ...chatData, timestamp: savedMsg.timestamp };

          // 5️⃣ Emit Real-Time Messages to Conversation Room
          io.to(conversationId).emit("newMessageReceived", msgPayload);

          // For all group members (except sender), emit unread update
          if (conversation.members && Array.isArray(conversation.members)) {
            for (const member of conversation.members) {
              const memberId = member._id.toString();

              if (memberId !== senderId && onlineUsers[memberId]) {
                const unreadCount = await MessageModel.countDocuments({
                  conversationId,
                  senderId: { $ne: memberId },
                  read: false,
                  "seenBy.userId": { $ne: memberId }, // Optional, if you track seenBy

                });
                
                io.to(onlineUsers[memberId]).emit("unreadCountUpdate", {
                  conversationId,
                  unreadCount, // or fetch actual count if needed
                });
                // ✅ Emit to sender: delivery confirmation
                io.to(onlineUsers[senderId]).emit("messageDelivered", {
                  messageId: savedMsg._id,
                  to: memberId,
                  conversationId,
                });

                // ✅ Optionally: update message status in DB (delivered)
                await MessageModel.findByIdAndUpdate(savedMsg._id, {
                  status: "delivered",
                });
              }
            }
          }
          // 6️⃣ Handle Notification Differently:
          if (type === "1on1") {
            const receiverSocketId = onlineUsers[receiverId];
            if (receiverSocketId) {
              io.to(receiverSocketId).emit("newUnreadMessage", {
                from: senderId,
                message,
                messageType,
                payload,
                conversationId,
                timestamp: savedMsg.timestamp,
              });
            } else {
              await sendPushNotification(receiverId, {
                title: "New Message ",
                body: message,
                url: `/chat/${conversationId}`,
              });
            }
          }
        } catch (err) {
          console.error("❌ Error sending message:", err);
          socket.emit("messageError", {
            message: "Failed to send message",
            code: "MESSAGE_FAILED",
          });
        }
      }
    );

    // ========================
    // ✅ Message Read
    // ========================
    // ✅ Mark 1-to-1 messages as read
    socket.on(
      "markMessagesRead",
      async ({ userId, conversationId }) => {
        try {
          await MessageModel.updateMany(
            {
              conversationId,
              read: false,
              "seenBy.userId": { $ne: userId },
            },
            {
              $addToSet: { seenBy: {userId:userId,timestamp:new Date()} }, // add user to read list
              $set: { read: true, status: "read" },
            }
          );
          // const io = getIO();
          io.to(conversationId).emit("messagesReadBy", {
            from: userId,
            conversationId,
          });
          console.log(
            `Marked messages from ${userId} as read by ${userId}`
          );
        } catch (err) {
          console.error("Failed to mark 1-to-1 messages read", err);
        }
      }
    );
    // ========================
    // ✅ Call Signaling (WebRTC)
    // ========================
    socket.on("startCall", ({ fromUserId, toUserId, isVideo }) => {
      const toSocketId = onlineUsers[toUserId];
      if (toSocketId) {
        io.to(toSocketId).emit("incomingCall", {
          fromUserId,
          isVideo,
        });
        console.log(
          `📞 ${
            isVideo ? "Video" : "Audio"
          } call from ${fromUserId} to ${toUserId}`
        );
      } else {
        socket.emit("userOffline", { toUserId });
        console.log(`❌ User ${toUserId} offline for call`);
      }
    });

    socket.on("callDeclined", ({ toUserId }) => {
      const toSocketId = onlineUsers[toUserId];
      if (toSocketId) {
        io.to(toSocketId).emit("callDeclined");
        console.log(`❌ Call declined for ${toUserId}`);
      }
    });

    socket.on("joinCall", (roomId) => {
      socket.join(roomId);
      console.log(`📞 User ${socket.id} joined call room ${roomId}`);
      socket.to(roomId).emit("user-joined-call", socket.id);
    });

    socket.on("signal", ({ roomId, data, to }) => {
      io.to(to).emit("signal", { from: socket.id, data });
      console.log(`📡 Signal from ${socket.id} to ${to} in room ${roomId}`);
    });

    socket.on("leaveCall", (roomId) => {
      socket.leave(roomId);
      socket.to(roomId).emit("user-left-call", socket.id);
      console.log(`🚪 Left call room ${roomId}`);
    });

    // ========================
    // ✅ Disconnect Handling
    // ========================
    socket.on("disconnect", async () => {
      const disconnectedUserId = Object.keys(onlineUsers).find(
        (key) => onlineUsers[key] === socket.id
      );

      if (disconnectedUserId) {
        delete onlineUsers[disconnectedUserId];
        await updateUserOnlineStatus(disconnectedUserId, "offline");
        console.log(`❌ ${disconnectedUserId} disconnected`);
      }
    });
  });
}

module.exports = { socketHandler, onlineUsers };
