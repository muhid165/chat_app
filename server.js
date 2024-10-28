const http = require('http');
const express = require('express');
const path = require('path');
const {Server} = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require("dotenv").config();

const User = require('./Models/User');      // using the user model for mongoose
const { error } = require('console');

// Express App setup
const app =express();
app.use(express.static(path.join(path.resolve(),'public')));
app.use(express.urlencoded({extended:true}))
app.use(express.json());
app.use(cors());

// JWT Secret Key
const JWT_SECRET = 'your_jwt_secret_key';


mongoose.connect(process.env.MONGO_URI,{
    dbName: "backend",
  })
.then(() => {
    console.log("connected to the database !!!!");
}).catch( err => {
    console.log(err);
});



app.get('/',async(req,res) => {
    res.sendFile('public/index.html');
});

app.post('/register',async(req,res) => {
    const {email, password} = req.body;    
    const existingUser = await User.findOne({email});

    if (existingUser) {        
        return res.status(400).json({message:'User already exist  '})
    }

    const hashedPasssword = await bcrypt.hash(password,10);
    let data = {email: email,password:hashedPasssword}
    const newUser = await User.create(data)
    res.status(201).json({ message: 'User registered successfully' });    
    
});

app.post('/login',async(req,res) => {
    const {email,password} = req.body;

    // checking if the user exists!!!
    const user = await User.findOne({email});

    if(!user){
        res.status(400).send({message:" Invalid Email or Password "})
    }

    // if user exists then validating the password!!!
    const isValid = await bcrypt.compare(password,user.password);
    console.log('the password is valid:- ',isValid);
    
    if(!isValid){
        res.status(400).json({message:'Invalid Username or Password'});
    }
    

    // generating jwt token 
    const token = jwt.sign({id:user._id,email: user.email},JWT_SECRET,{expiresIn:'1y'})
    res.json({token});    
});




// socket.io setup   users == sockets !!
const server = http.createServer(app);
const io = new Server(server);              // this will handle the sockets 
       
    
io.use((socket,next) => {
    const token = socket.handshake.auth.token;
    if(!token){
        return next(new Error('Authentication error'));
    }

    try {
        const decoded = jwt.verify(token,JWT_SECRET);
        socket.user = decoded    // attach user info to the socket object 
        next();

    } catch (err) {
        return next(new Error('Authentication error'));
    }
});


    
io.on("connection",(socket)=> {    
    console.log(`${socket.user.email} connected!!`);

    socket.broadcast.emit('chat message',`${socket.user.email} has joined the chat `)
    
    
    // socket.on("user-message",(message) => {
    //     io.emit("message",message);  
    // }); 
    
   socket.on('chat message',(mssg) => {
        const messageData = {
            email:socket.user.email,
            message: mssg
        };
        io.emit('chat message',messageData)    
   }); 

   socket.on('disconnect',() => {
    io.emit('chat message',`${socket.user.email} has left the chat `)
   });
});

server.listen(9000,()=> {
    console.log("server is running on port 9000!!");
});
