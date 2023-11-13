require("dotenv").config();
const express = require("express");
const cors = require("cors")
const multer = require("multer")
const cloudinary = require("cloudinary").v2;
const DatauriParser = require('datauri/parser');


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors())


// multer settings
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/jgp"];

//use memorystorage for multer upload
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        if (ALLOWED_FORMATS.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(" not supported file type"), false);
        }
    },
});

const singleUpload = upload.single("file");
const singleUploadCtrl = (req, res, next) => {
    singleUpload(req, res, (error) => {
        if (error) {
            return res.status(422).send({
                message: "image upload failed",
            });
        }
        next();
    });
};

// use datauri to stream buffer
const parser = new DatauriParser();
const path = require("path");
const formatBuffer = (file) => {
    return parser.format(path.extname(file.originalname).toString().toLowerCase(), file.buffer
    );
};

//seting cloudinayry
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

cloudinaryUpload = (file) =>
    cloudinary.uploader.upload(file, {
        upload_preset: process.env.UPLOAD_PRESET,
    });

// get images from folder using cloudinary search API
getImages = async (next_cursor) => {
    const resources = await cloudinary.search.expression("folder:samples").max_results(20).sort_by("uploaded_at", "desc").next_cursor(next_cursor).execute();
    return resources;
}
// get Images API
app.get("/api/photos", async (req, res) => {
    const response = await getImages(req.query.next_cursor || "");
    const results = {
        images: [],
        next_cursor: null,
    };

    response.resources.forEach((item)=> {
        results.images.push({
            public_id: item.public_id,
            created_at: item.created_at,
            secure_url: item.secure_url
        })
    })
    if(response.next_cursor){
        results.next_cursor = response.next_cursor;
    }
    return res.json({
        results,
    });
})
// upload API
app.post("/api/upload", singleUploadCtrl, async (req, res) => {
    const uploadFile = req.body.file || req.file;
    try {
        if (!uploadFile) {
            return res.status(422).send({
                message: "there is error when uploading",
            });
        }
        let uploadResut;
        if (!uploadFile.buffer) {
            uploadResult = await cloudinaryUpload(uploadFile);
        } else {
            const file64 = formatBuffer(req.file);
            uploadResult = await cloudinaryUpload(file64.content);
        }
        // convert stream to base64 format

        return res.json({
            cloudinaryId: uploadResult.puclic_id,
            url: uploadResult.secure_url,
            message: "upload thanh cong",
        });
    } catch (error) {
        return res.status(422).send({
            message: error.message,
        });
    }
});
const port = 3002;

app.get("/api", (req, res) => {
    console.log("hello");
});
app.listen(port, () => {
    console.log("port is running on", port);
});