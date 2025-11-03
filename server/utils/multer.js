import multer from "multer";

const upload = multer({ dest: "uploads/", limits: { fileSize: 1024 * 1024 * 500 } }); // 500MB
export default upload
