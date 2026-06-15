const { ImageKit } = require("@imagekit/nodejs")
require('dotenv').config()
const imagekitClient = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
})

const UploadFile = async (fileBuffer,originalName) => {
    try {
        const extension = originalName.split('.').pop();

        return await imagekitClient.files.upload({
            file: fileBuffer.toString("base64"),
            fileName: `User-${Date.now()}.${extension}`,
            folder: "/userProfiles"
        });
        return response
    }
    catch (err) {
        console.error("Error uploading file:", err.message);
        throw err;
    }
}


module.exports = UploadFile