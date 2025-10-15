const { authJwt } = require("../middlewares");
const controller = require("../controllers/challenger.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.get("/api/challenger", controller.listAdmin);

    // new user registeration
    /**
     * @swagger
     * /challenger/register:
     *   post:
     *     summary: Save the user name and mobile and send OTP
     *     requestBody:
     *      required: true
     *      content:
     *        application/json:
     *         schema:
     *          type: object
     *          properties:
     *            duration:
     *              type: string
     *              example: 7 days / 1 month / 3 months
     *            name:
     *              type: string
     *              example: Viraj Goldy
     *            mobile:
     *              type: string
     *              example: 9675711509
     *     tags: [Challenger]
     *     responses:
     *       200:
     *         description: User object and authentication token for further API's
     *         content:
     *            application/json:
     *             schema:
     *               type: object
     *               properties:
     *                  data:
     *                     type: object
     *                     properties:
     *                       _id:
     *                         type: string
     *                         example: 62d7a96ecff8ac1770318059
     *                       name: 
     *                         type: string
     *                         example: Viraj Goldy
     *                       mobile: 
     *                         type: string
     *                         example: 9675711509
     *                       createdAt: 
     *                         type: string
     *                         example: 2025-10-13T12:46:20.215Z
     *                  error:
     *                     type: string
     *                     example: null
     *                  message:
     *                     type: string
     *                     example: OTP Sent !
     *                  statusCode:
     *                     type: integer
     *                     example: 200
     */

    app.post("/challenger/register", controller.register);

    // Verify OTP
    /**
     * @swagger
     * /challenger/verify:
     *   post:
     *     summary: Verify OTP
     *     requestBody:
     *      required: true
     *      content:
     *        application/json:
     *         schema:
     *          type: object
     *          properties:
     *            userId:
     *              type: string
     *              example: 68ecf1d723d4ade0dca9be9b (_id from register response)
     *            otp:
     *              type: string
     *              example: 1234
     *     tags: [Challenger]
     *     responses:
     *       200:
     *         description: User object and authentication token for further API's
     *         content:
     *            application/json:
     *             schema:
     *               type: object
     *               properties:
     *                  data:
     *                     type: boolean
     *                     example: true
     *                  error:
     *                     type: string
     *                     example: null
     *                  message:
     *                     type: string
     *                     example: OTP Verified !
     *                  statusCode:
     *                     type: integer
     *                     example: 200
     */

    app.post("/challenger/verify", controller.verifyOTP);

    /**
     * @swagger
     * /challenger/meta:
     *   get:
     *     summary: get drop down lists
     *     tags: [Challenger]
     *     responses:
     *       200:
     *         description: User object and authentication token for further API's
     *         content:
     *            application/json:
     *             schema:
     *               type: object
     *               properties:
     *                  data:
     *                     type: object
     *                     example: {"categories":[{"title":"Vegetarian"}],"subcategories":[{"title":"Beginner"}],"types":[{"title":"Weight Loss"}]}
     *                  error:
     *                     type: string
     *                     example: null
     *                  message:
     *                     type: string
     *                     example: Data Fetched !
     *                  statusCode:
     *                     type: integer
     *                     example: 200
     */

    app.get("/challenger/meta", controller.getMeta);

    /**
 * @swagger
 * /challenger/submit:
 *   post:
 *     summary: submit and get PDF url
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *         schema:
 *          type: object
 *          properties:
 *            userId:
 *              type: string
 *              example: 68ecf1d723d4ade0dca9be9b (_id from register response)
 *            category:
 *              type: string
 *              example: Vegetarian
 *            subcategory:
 *              type: string
 *              example: Beginner
 *            type:
 *              type: string
 *              example: Weight Loss
 *     tags: [Challenger]
 *     responses:
 *       200:
 *         description: User object and authentication token for further API's
 *         content:
 *            application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  data:
 *                     type: string
 *                     example: uploads/dietplans/dietplan-1760433805301-581850864.pdf
 *                  error:
 *                     type: string
 *                     example: null
 *                  message:
 *                     type: string
 *                     example: Data Fetched !
 *                  statusCode:
 *                     type: integer
 *                     example: 200
 */

    app.post("/challenger/submit", controller.submit);
};
