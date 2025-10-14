const { authJwt } = require("../middlewares");
const { uploadPDF, handleUploadError } = require("../middlewares/upload");
const controller = require("../controllers/dietplan.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept, Authorization"
    );
    next();
  });

  // Create a new Diet Plan (Admin/Moderator only)
  app.post(
    "/api/dietplans",
    [authJwt.verifyToken, authJwt.isModeratorOrAdmin, uploadPDF, handleUploadError],
    controller.create
  );

  // Retrieve all Diet Plans (Public access)
  app.get("/api/dietplans", [authJwt.verifyToken], controller.findAll);

  // Retrieve a single Diet Plan with id (Public access)
  app.get("/api/dietplans/:id", [authJwt.verifyToken], controller.findOne);

  // Update a Diet Plan with id (Admin/Moderator only)
  app.put(
    "/api/dietplans/:id",
    [authJwt.verifyToken, authJwt.isModeratorOrAdmin, uploadPDF, handleUploadError],
    controller.update
  );

  // Delete a Diet Plan with id (Admin only)
  app.delete(
    "/api/dietplans/:id",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.delete
  );

  // Delete all Diet Plans (Admin only)
  app.delete(
    "/api/dietplans",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.deleteAll
  );

  // Download PDF file (Authenticated users only)
  app.get(
    "/api/dietplans/:id/download",
    [authJwt.verifyToken],
    controller.downloadPDF
  );
};