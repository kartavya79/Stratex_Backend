const Connection = require("../db/stratex")
const bcrypt = require("bcryptjs");
const userModel = require("../models/user.model");
require("dotenv").config();

const createSuperAdmin = async () => {
    try {

        await Connection()

        const existingSuperAdmin =
            await userModel.findOne({
                roles: "superAdmin"
            });

        if (existingSuperAdmin) {
            console.log("Super Admin already exists");
            process.exit(0);
        }

        const hashedPassword =
            await bcrypt.hash(
                process.env.SUPER_ADMIN_PASSWORD,
                12
            );

        const superAdmin =
            await userModel.create({
                firstName: "Super",
                lastName: "Admin",
                personalEmail:
                    process.env.SUPER_ADMIN_EMAIL,
                password: hashedPassword,
                roles: ["superAdmin"],
                status: "active",
                isEmailVerified: true,
                mustChangePassword: false
            });

        console.log(
            "Super Admin created:",
            superAdmin.personalEmail
        );

        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

createSuperAdmin();