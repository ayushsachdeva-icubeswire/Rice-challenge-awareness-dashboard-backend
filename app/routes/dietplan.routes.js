const { authJwt } = require("../middlewares");
const { uploadPDF, handleUploadError } = require("../middlewares/upload");
const controller = require("../controllers/dietplan.controller");

/**
 * @swagger
 * components:
 *   schemas:
 *     DietPlan:
 *       type: object
 *       required:
 *         - name
 *         - duration
 *         - type
 *         - category
 *         - pdfFile
 *         - createdBy
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the diet plan
 *           example: "64f7b1c5d4a3b8e9f2c1d5a6"
 *         name:
 *           type: string
 *           description: Name of the diet plan
 *           example: "Keto Weight Loss Plan"
 *         duration:
 *           type: string
 *           description: Duration of the diet plan
 *           example: "30 days"
 *         type:
 *           type: string
 *           description: Type of diet plan
 *           example: "Weight Loss"
 *         category:
 *           type: string
 *           description: Category of diet plan
 *           example: "Keto"
 *         subcategory:
 *           type: string
 *           description: Subcategory of diet plan
 *           example: "Low Carb"
 *         description:
 *           type: string
 *           description: Description of the diet plan
 *           example: "A comprehensive ketogenic diet plan for weight loss"
 *         pdfFile:
 *           type: object
 *           properties:
 *             filename:
 *               type: string
 *               example: "dietplan-1760433805301-581850864.pdf"
 *             originalName:
 *               type: string
 *               example: "Keto_Diet_Plan.pdf"
 *             path:
 *               type: string
 *               example: "uploads/dietplans/dietplan-1760433805301-581850864.pdf"
 *             size:
 *               type: number
 *               example: 2048576
 *             uploadDate:
 *               type: string
 *               format: date-time
 *               example: "2023-10-14T10:30:00.000Z"
 *         isActive:
 *           type: boolean
 *           default: true
 *           example: true
 *         createdBy:
 *           type: string
 *           description: ID of the user who created the diet plan
 *           example: "64f7b1c5d4a3b8e9f2c1d5a6"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-10-14T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-10-14T10:30:00.000Z"
 *     
 *     DietPlanCreate:
 *       type: object
 *       required:
 *         - name
 *         - duration
 *         - type
 *         - category
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the diet plan
 *           example: "Keto Weight Loss Plan"
 *         duration:
 *           type: string
 *           description: Duration of the diet plan
 *           example: "30 days"
 *         type:
 *           type: string
 *           description: Type of diet plan
 *           example: "Weight Loss"
 *         category:
 *           type: string
 *           description: Category of diet plan
 *           example: "Keto"
 *         subcategory:
 *           type: string
 *           description: Subcategory of diet plan
 *           example: "Low Carb"
 *         description:
 *           type: string
 *           description: Description of the diet plan
 *           example: "A comprehensive ketogenic diet plan for weight loss"
 *         isActive:
 *           type: boolean
 *           default: true
 *           example: true
 * 
 *     DietPlanResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Diet plan created successfully!"
 *         data:
 *           $ref: '#/components/schemas/DietPlan'
 * 
 *     DietPlanListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DietPlan'
 *         currentPage:
 *           type: number
 *           example: 1
 *         totalPages:
 *           type: number
 *           example: 5
 *         totalItems:
 *           type: number
 *           example: 50
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Error message"
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept, Authorization"
    );
    next();
  });

  /**
   * @swagger
   * /api/dietplans:
   *   post:
   *     summary: Create a new diet plan
   *     description: Create a new diet plan with PDF file upload. Requires admin or moderator role.
   *     tags: [Diet Plans]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - duration
   *               - type
   *               - category
   *               - file
   *             properties:
   *               name:
   *                 type: string
   *                 description: Name of the diet plan
   *                 example: "Keto Weight Loss Plan"
   *               duration:
   *                 type: string
   *                 description: Duration of the diet plan
   *                 example: "30 days"
   *               type:
   *                 type: string
   *                 description: Type of diet plan
   *                 example: "Weight Loss"
   *               category:
   *                 type: string
   *                 description: Category of diet plan
   *                 example: "Keto"
   *               subcategory:
   *                 type: string
   *                 description: Subcategory of diet plan
   *                 example: "Low Carb"
   *               description:
   *                 type: string
   *                 description: Description of the diet plan
   *                 example: "A comprehensive ketogenic diet plan for weight loss"
   *               isActive:
   *                 type: boolean
   *                 description: Whether the diet plan is active
   *                 example: true
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: PDF file containing the diet plan
   *     responses:
   *       201:
   *         description: Diet plan created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DietPlanResponse'
   *       400:
   *         description: Bad request - missing required fields or invalid file
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Forbidden - insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.post(
    "/api/dietplans",
    [authJwt.verifyToken, authJwt.isModeratorOrAdmin, uploadPDF, handleUploadError],
    controller.create
  );

  /**
   * @swagger
   * /api/dietplans:
   *   get:
   *     summary: Retrieve all diet plans
   *     description: Get a paginated list of diet plans with optional filtering
   *     tags: [Diet Plans]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of items per page
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *         description: Filter by diet plan type
   *         example: "Weight Loss"
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter by diet plan category
   *         example: "Keto"
   *       - in: query
   *         name: subcategory
   *         schema:
   *           type: string
   *         description: Filter by diet plan subcategory
   *         example: "Low Carb"
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *         description: Filter by active status
   *         example: true
   *     responses:
   *       200:
   *         description: List of diet plans retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DietPlanListResponse'
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.get("/api/dietplans", [authJwt.verifyToken], controller.findAll);

  /**
   * @swagger
   * /api/dietplans/{id}:
   *   get:
   *     summary: Get a diet plan by ID
   *     description: Retrieve a single diet plan by its ID
   *     tags: [Diet Plans]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Diet plan ID
   *         example: "64f7b1c5d4a3b8e9f2c1d5a6"
   *     responses:
   *       200:
   *         description: Diet plan retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   $ref: '#/components/schemas/DietPlan'
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Diet plan not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.get("/api/dietplans/:id", [authJwt.verifyToken], controller.findOne);

  /**
   * @swagger
   * /api/dietplans/{id}:
   *   put:
   *     summary: Update a diet plan
   *     description: Update an existing diet plan. Requires admin or moderator role.
   *     tags: [Diet Plans]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Diet plan ID
   *         example: "64f7b1c5d4a3b8e9f2c1d5a6"
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 description: Name of the diet plan
   *                 example: "Updated Keto Weight Loss Plan"
   *               duration:
   *                 type: string
   *                 description: Duration of the diet plan
   *                 example: "45 days"
   *               type:
   *                 type: string
   *                 description: Type of diet plan
   *                 example: "Weight Loss"
   *               category:
   *                 type: string
   *                 description: Category of diet plan
   *                 example: "Keto"
   *               subcategory:
   *                 type: string
   *                 description: Subcategory of diet plan
   *                 example: "Low Carb"
   *               description:
   *                 type: string
   *                 description: Description of the diet plan
   *                 example: "An updated comprehensive ketogenic diet plan for weight loss"
   *               isActive:
   *                 type: boolean
   *                 description: Whether the diet plan is active
   *                 example: true
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: New PDF file (optional, only if updating the file)
   *     responses:
   *       200:
   *         description: Diet plan updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Diet Plan was updated successfully."
   *                 data:
   *                   $ref: '#/components/schemas/DietPlan'
   *       400:
   *         description: Bad request - invalid data
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Forbidden - insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Diet plan not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.put(
    "/api/dietplans/:id",
    [authJwt.verifyToken, authJwt.isModeratorOrAdmin, uploadPDF, handleUploadError],
    controller.update
  );

  /**
   * @swagger
   * /api/dietplans/{id}:
   *   delete:
   *     summary: Delete a diet plan
   *     description: Delete a specific diet plan by ID. Requires admin role.
   *     tags: [Diet Plans]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Diet plan ID
   *         example: "64f7b1c5d4a3b8e9f2c1d5a6"
   *     responses:
   *       200:
   *         description: Diet plan deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Diet Plan was deleted successfully!"
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Forbidden - insufficient permissions (admin required)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Diet plan not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.delete(
    "/api/dietplans/:id",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.delete
  );

  /**
   * @swagger
   * /api/dietplans:
   *   delete:
   *     summary: Delete all diet plans
   *     description: Delete all diet plans from the database. Requires admin role. ⚠️ Use with caution!
   *     tags: [Diet Plans]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All diet plans deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "50 Diet Plans were deleted successfully!"
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Forbidden - insufficient permissions (admin required)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.delete(
    "/api/dietplans",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.deleteAll
  );

  /**
   * @swagger
   * /api/dietplans/{id}/download:
   *   get:
   *     summary: Download diet plan PDF
   *     description: Download the PDF file associated with a specific diet plan
   *     tags: [Diet Plans]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Diet plan ID
   *         example: "64f7b1c5d4a3b8e9f2c1d5a6"
   *     responses:
   *       200:
   *         description: PDF file download
   *         content:
   *           application/pdf:
   *             schema:
   *               type: string
   *               format: binary
   *         headers:
   *           Content-Disposition:
   *             description: Attachment filename
   *             schema:
   *               type: string
   *               example: 'attachment; filename="Keto_Diet_Plan.pdf"'
   *           Content-Type:
   *             description: MIME type of the file
   *             schema:
   *               type: string
   *               example: "application/pdf"
   *       401:
   *         description: Unauthorized - invalid or missing token
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Diet plan or PDF file not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  app.get(
    "/api/dietplans/:id/download",
    [authJwt.verifyToken],
    controller.downloadPDF
  );
};