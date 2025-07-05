const { errorResponse } = require("../helper/successAndError");
const UserModel = require("../models/User");

function checkRole(...role) {
  return async function (req, res, next) {
    const user = await UserModel.findById(req.userId);
    req.user = user;

    if (req.user && role.includes(req.user.role)) {
      return next();
    } else {
      return res
        .status(404)
        .json(
          errorResponse(
            404,
            "Unauthorized - You are not allowed to access this route. need admin access connect to Backend Developer"
          )
        );
    }
  };

};

module.exports = checkRole;

