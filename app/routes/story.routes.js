const { authJwt, upload } = require("../middlewares");
const controller = require("../controllers/story.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Create a new Story
  app.post(
    "/api/stories",
    [authJwt.verifyToken, upload],
    controller.create
  );

  // Retrieve all Stories
  app.get("/api/stories",[authJwt.verifyToken], controller.findAll);

  // Retrieve a single Story with id
  app.get("/api/stories/:id", [authJwt.verifyToken],controller.findOne);

  // Update a Story with id
  app.put(
    "/api/stories/:id",
    [authJwt.verifyToken, upload],
    controller.update
  );

  // Delete a Story with id
  app.delete(
    "/api/stories/:id",
    [authJwt.verifyToken],
    controller.delete
  );

  //dashboard api
  app.get("/api/dashboard",[authJwt.verifyToken], controller.dashboard);
};