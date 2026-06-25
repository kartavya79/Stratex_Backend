const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
require("dotenv").config();

const chkUser = async (req, res, next) => {
    try {

        const token =
            req.cookies?.access_token ||
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;
        req.user._id = decoded.userId;
        req.authUser = await userModel
            .findById(decoded.userId)
            .select("-password -setupToken -setupTokenExpiry");

        if (!req.authUser) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        next();

    } catch (err) {

        console.error(err.message);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = {
    chkUser
};
