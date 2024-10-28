const mongoose = require('mongoose');

// defining user schema
const userSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    }
});

// exporting the user mmodel
module.exports = mongoose.model('users',userSchema)

