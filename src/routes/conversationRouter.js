const express = require ("express");
const { getMessageListAll, getMessage1on1, markGroupChatAsRead , markPersonalChatAsRead} = require("../controllers/conversationChatController");
const conversationChatRouter = express.Router();

conversationChatRouter.get("/conversation/:userId",getMessageListAll);
conversationChatRouter.get("/messages/:conversationId",getMessage1on1);
conversationChatRouter.post("/chat/markRead/:userId/:conversationId", markPersonalChatAsRead);
conversationChatRouter.post("/groupchat/markRead/:groupId/:userId", markGroupChatAsRead);

module.exports = conversationChatRouter ;