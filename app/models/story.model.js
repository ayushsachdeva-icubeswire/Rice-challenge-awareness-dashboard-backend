const mongoose = require("mongoose");

const Story = mongoose.model(
  "Story",
  new mongoose.Schema({
    handle: String,
    influencer:{
        id: String,
        fullName: String,
        profilePicUrl: String,
        followerCount: Number,
        gender:String,
        engagementRate: Number
    },
    storyLink: String,
    imageUrl: String,
    views:Number,
    likes: Number,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  })
);

module.exports = Story;