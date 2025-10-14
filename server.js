const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");

const dbConfig = require("./app/config/db.config");

const app = express();

app.use(cors());
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// Serve uploaded files
app.use('/uploads', express.static('uploads'));


const db = require("./app/models");
const Role = db.role;

db.mongoose
  .connect(`${dbConfig.MONGODBURI}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
    initial();
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

// routes
require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);
require("./app/routes/dietplan.routes")(app);
require("./app/routes/story.routes")(app);
require("./app/routes/challengers")(app);

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
