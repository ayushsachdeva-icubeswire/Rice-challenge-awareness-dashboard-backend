const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.set('strictQuery', true);

const db = {};

db.mongoose = mongoose;

db.user = require("./user.model");
db.role = require("./role.model");
db.dietplan = require("./dietplan.model");
db.story = require("./story.model");
db.challengers = require("./challengers");
db.challengerProgress = require("./challengeProgress.model");
db.notificationLog = require("./notificationLog.model");
db.webhookLogs = require("./webhookLogs.model");

db.ROLES = ["user", "admin", "moderator", "challengers"];

module.exports = db;