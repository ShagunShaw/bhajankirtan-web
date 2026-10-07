import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcrypt'

const adminSchema= new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    password: {
        type: String,          
        required: [true, "Password is required"]
    }, 
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    refreshToken: {
        type: String
    }
}, {timestamps: true})

adminSchema.pre("save", async function(next) {      
    if(this.isModified("password") == true )        
    {
        this.password= await bcrypt.hash(this.password, 10)     
    }
    next()     
})

adminSchema.methods.isPasswordCorrect = async function (enteredPassword) {          
    return await bcrypt.compare(enteredPassword, this.password)     
}

export const Admin = mongoose.model("Admin", adminSchema)