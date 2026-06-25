const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});


router.post('/register',upload.single("profile"),authMiddleware.chkUser, authController.register);

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware.chkUser, authController.getMe);
router.post('/setup-password', authController.setupPassword);


module.exports = router;
