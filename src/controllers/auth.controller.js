const crypto = require('crypto');
const userModel = require('../models/user.model');
const auditLogModel = require('../models/auditlog.model')
const UploadFiles = require("../services/storage.service")
const sendSetupEmail = require("../services/email.service")
const multer = require("multer");

require('dotenv').config();

const storage = multer.memoryStorage();
const registerUser = async (req, res) => {
    try {
        const {
            profileImage = null,
            firstName,
            lastName,
            personalEmail,
            universityAccount,
            roles,
            schoolId,
            programId,
            specializationId
        } = req.body;



        // chk if user is other than superAdmin or schoolAdmin
        if (
            !req.user.roles.includes("superAdmin") &&
            !req.user.roles.includes("schoolAdmin")
        ) {
            return res.status(403).json({
                message: "Unauthorized"
            });
        }



        if (roles.includes("superAdmin")) {
            return res.status(403).json({ message: "Cannot register superAdmin through this endpoint" });
        }

        if (req.user.roles.includes("schoolAdmin") &&
            roles.includes("schoolAdmin")) {
            return res.status(403).json({
                message: "SchoolAdmin Cannot create another SchoolAdmin"
            })
        }

        //chk if data already exsists

        const existingUser = await userModel.findOne({
            $or: [
                {
                    "universityAccount.universityEmail":
                        universityAccount.universityEmail
                },
                {
                    "universityAccount.institutionId":
                        universityAccount.institutionId
                }
            ]
        });

        if (existingUser) {
            return res.status(422).json({
                message: "User Already Exsists With Us Try To Rest Your Password "
            })
        }


        // accounts created by superadmin  
        if (req.user.roles.includes("superAdmin") ||
            req.user.roles.includes("schoolAdmin")) {

            if (
                req.user.roles.includes("schoolAdmin") &&
                roles.includes("admin")
            ) {
                return res.status(403).json({
                    message: "Cannot create admin accounts"
                });
            }

            if (
                req.user.roles.includes("schoolAdmin") &&
                req.user.schoolId.toString() !== schoolId
            ) {
                return res.status(403).json({
                    message:
                        "School Admin can only create users for their own school"
                });
            }

            const rawToken =
                crypto.randomBytes(32).toString("hex");

            const hashedToken = crypto
                .createHash("sha256")
                .update(rawToken)
                .digest("hex");


            let uploadImg = null;
            if (req.file) {
                uploadImg = await UploadFiles(req.file.buffer,
                    req.file.originalname)
            }

            const user = await userModel.create({

                profileImage: uploadImg ? uploadImg.url : null,
                firstName: firstName,
                lastName: lastName,
                personalEmail: personalEmail,
                universityAccount: universityAccount,
                roles: roles,
                schoolId: schoolId,
                programId: programId,
                specializationId: specializationId,
                setupToken: hashedToken,
                setupTokenExpiry:
                    Date.now() + 24 * 60 * 60 * 1000,
                createdBy: req.user._id,
            })


            const setupLink =
                `${process.env.CLIENT_URL}/setup-password/${rawToken}`;


            const emails = [user.universityAccount.universityEmail];

            if (user.personalEmail) {
                emails.push(user.personalEmail);
            }

            await sendSetupEmail(
                emails,
                `${user.firstName} ${user.lastName}`,
                setupLink
            );

            await auditLogModel.create({
                performedBy: req.user._id,

                action: "CREATE",

                module: "User",

                targetId: user._id,

                targetName:
                    `${user.firstName} ${user.lastName}`,

                remarks: "User account created"
            });



            res.status(201).json({
                message: "User account created sucessfully",
                user: user
            })
        }




    }
    catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}


module.exports = { register: registerUser };