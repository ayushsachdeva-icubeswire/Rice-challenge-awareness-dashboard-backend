// Load environment variables
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");

const dbConfig = require("./app/config/db.config");
const {startDummyCron} =require('./app/services/dummy-cron.service.js');

const app = express();

// Configure CORS to allow credentials
app.use(cors({
  credentials: true,
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://13.201.26.193',
      'https://www.daawat.com',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now, can be restricted later
    }
  }
}));

// Configure session for CSRF
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'your-secret-key-change-this'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// Serve uploaded files
app.use('/uploads', express.static('uploads'));


const db = require("./app/models");
const Role = db.role;
const { startReminderCron } = require('./app/services/cron.service');

db.mongoose
  .connect(`${dbConfig.MONGODBURI}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
    initial();
    // Start the reminder cron job
    if(process.env.CRON_ENV === 'production'){
      console.log("Starting Reminder Cron Job in production mode.");
      startReminderCron();
      startDummyCron();
    } else {
      console.log("Skipping Reminder Cron Job in non-production mode.");
    }
  })
  .catch(err => {
    console.error("Connection error", err);
    process.exit();
  });

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to unified application." });
});

//doc routes and design
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Rice Challenge Awareness Dashboard API",
      version: "1.0.0",
      description: "API for Rice Challenge Awareness Dashboard including diet plans, stories, challengers, and user management",
    },
    servers: [
      {
        url: "http://192.168.1.203:" + process.env.PORT,
      },
      // {
      //   url: "https://api.spiritualbharat.com",
      // },
      {
        url: "http://3.7.79.213:" + process.env.PORT,
      },
      {
        url: "http://192.168.1.148:" + process.env.PORT,
      },
    ],
    components: {
      securitySchemes: {
        jwt: {
          type: "http",
          scheme: "bearer",
          in: "header",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        jwt: [],
      },
    ],
  },
  apis: ["./app/routes/*.js"],
};

const swaggerSpac = swaggerJSDoc(options);
app.use("/doc", swaggerUi.serve, swaggerUi.setup(swaggerSpac));

// Import CSRF middleware
const { csrfProtection, provideCsrfToken, csrfErrorHandler } = require("./app/middlewares");

// Add CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, provideCsrfToken, (req, res) => {
  res.json({
    csrfToken: req.csrfToken(),
    message: 'CSRF token generated successfully'
  });
});

// routes
require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);
require("./app/routes/dietplan.routes")(app);
require("./app/routes/story.routes")(app);
require("./app/routes/challengers")(app);

// Add CSRF error handler after all routes
app.use(csrfErrorHandler);

// set port, listen for requests
const PORT = process.env.PORT || 8080;
const BASE_URL = `http://localhost:${PORT}`;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API endpoint: ${BASE_URL}/api`);
});

function initial() {
  Role.estimatedDocumentCount((err, count) => {
    if (!err && count === 0) {
      new Role({
        name: "user"
      }).save(err => {
        if (err) {
          console.log("error", err);
        }

        console.log("added 'user' to roles collection");
      });

      new Role({
        name: "moderator"
      }).save(err => {
        if (err) {
          console.log("error", err);
        }

        console.log("added 'moderator' to roles collection");
      });

      new Role({
        name: "admin"
      }).save(err => {
        if (err) {
          console.log("error", err);
        }

        console.log("added 'admin' to roles collection");
      });
    }
  });
}
