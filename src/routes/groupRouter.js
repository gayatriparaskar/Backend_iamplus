const express = require("express");

const { createGroup , getGroup , addMembers , groupMessage} = require ("../controllers/groupController");

const groupRouter = express.Router();

groupRouter.post("/groups",createGroup);
groupRouter.get("/getGroups/:userId",getGroup);
groupRouter.post("/groups/:groupId/add-member",addMembers);
// groupRouter.post("/group-messages/:groupId",groupMessage);

module.exports = groupRouter; 