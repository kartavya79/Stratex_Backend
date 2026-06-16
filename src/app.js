const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const createRoutes = require('./routes/creation.routes')
const app = express();
app.use(express.json());
app.use(cookieParser());


//   #### redirect to routes

// *** auth route
app.use('/api/auth',authRoutes);


// *** creation route
app.use('/api/create',createRoutes)




module.exports = app;
