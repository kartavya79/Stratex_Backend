const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const createRoutes = require('./routes/creation.routes')
const assigneRoutes = require('./routes/assigne.routes')
const removeRoutes = require("./routes/remove.routes")
const getRoutes = require("./routes/get.routes")
const app = express();
app.use(express.json());
app.use(cookieParser());


//   #### redirect to routes

// *** auth route
app.use('/api/auth',authRoutes);


// *** creation route
app.use('/api/create',createRoutes)

// *** assigne routes

app.use('/api/assigne',assigneRoutes)


// **** remove route
app.use('/api/remove',removeRoutes)


// *** get routes

app.use("/api/get",getRoutes)

module.exports = app;
