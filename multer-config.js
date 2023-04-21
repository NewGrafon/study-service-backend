const multer = require("multer");

const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "localImgStorage");
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {

    if (file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg" ||
        file.mimetype === "image/gif")
        cb(null, true);
    else
        cb(null, false);
}

const upload = multer({
    storage: storageConfig,
    fileFilter: fileFilter,
});

module.exports.storageConfig = storageConfig;
module.exports.fileFilter = fileFilter;
module.exports.upload = upload;
