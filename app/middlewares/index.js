const authJwt = require("./authJwt");
const verifySignUp = require("./verifySignUp");
const { uploadPDF, uploadPdfConfig, uploadImageConfig, handleUploadError, upload } = require("./upload");

module.exports = {
  authJwt,
  verifySignUp,
  uploadPDF,
  upload,
  handleUploadError
};
