import mongoose, { Schema } from "mongoose";

const maxItems = (n) => ({
  validator: (arr) => arr.length <= n,
  message: `Maximum ${n} items allowed`
});

const packageSchema = new Schema(
  {
    packageName: { 
        type: String, 
        required: true, 
        trim: true 

    },
    description: { 
        type: String, 
        trim: true 

    },
    price: { 
        type: Number, 
        required: true, 
        min: 1 

    },
    bulletFeatures: { 
        type: [String], 
        default: [] 

    },
    workPhotos: { 
        type: [String], 
        validate: maxItems(8) 
        
    },
    workVideos: { 
        type: [String], 
        validate: maxItems(3) 
        
    }, // Cloudinary URLs
    visibility: { 
        type: String, 
        enum: ["visible", "hidden"], 
        default: "visible", 
        index: true 
        
    }
  },
  { timestamps: true }
);

export const Package = mongoose.model("Package", packageSchema);