const mongoose = require('mongoose');
const dns = require('node:dns');
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require('dotenv').config();
const Connection = async () => {
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to Stratex Database');

    }
    catch(err){
        console.log(err);
    }
}

module.exports = Connection;

