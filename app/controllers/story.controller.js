const db = require("../models");
const Story = db.story;
const axios = require('axios');
require('dotenv').config();

// Get base URL from environment or default to localhost
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 8080}`;

// Create and Save a new Story
exports.create = async (req, res) => {
  try {
    // Validate request
    if (!req.body.handle) {
      res.status(400).send({ message: "Handle cannot be empty!" });
      return;
    }
    // Fetch influencer details from external API
    const apiResponse = await axios.get(
      `https://apis.icubeswire.co/api/v1/campaign-analytics/influencer/detail?handle=${encodeURIComponent(req.body.handle)}`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    // Check if API response is successful and contains data
    if (!apiResponse.data) {
      res.status(404).send({ message: "Influencer not found!" });
      return;
    }

    // Extract influencer data from API response
    const influencerData = await apiResponse.data;
    // Create a Story with API data
    const story = new Story({
      handle: req.body.handle,
      influencer: {
        id: influencerData.data.influencer._id || '',
        fullName: influencerData.data.influencer.fullname || '',
        profilePicUrl: influencerData.data.influencer.new_profile_pic_url || '',
        followerCount: influencerData.data.influencer.instagram.follower_count_actual || 0,
        gender: influencerData.data.influencer.instagram.gender || '',
        engagementRate: influencerData.data.influencer.instagram.engagement_ratio  || 0
      },
      storyLink: req.body.storyLink,
      imageUrl: req.file ? `${BASE_URL}/uploads/stories/${req.file.filename}` : '',
      views: req.body.views || 0,
      likes: req.body.likes || 0
    });

    // Save Story in the database
    const savedStory = await story.save();
    res.send(savedStory);
  } catch (err) {
    // Handle API errors
    if (err.response) {
      return res.status(err.response.status).send({
        message: "Error fetching influencer data",
        error: err.response.data
      });
    }
    // Handle other errors
    res.status(500).send({
      message: err.message || "Some error occurred while creating the Story."
    });
  }
};

// Retrieve all Stories with filters and pagination
exports.findAll = async (req, res) => {
  try {
    const { 
      handle, 
      influencerName, 
      gender, 
      minFollowers, 
      maxFollowers, 
      minEngagement, 
      maxEngagement,
      page = 1,
      limit = 10
    } = req.query;
    
    // Build the query conditions
    let condition = {};
    
    if (handle) {
      condition.handle = { $regex: new RegExp(handle), $options: "i" };
    }
    
    if (influencerName) {
      condition['influencer.fullName'] = { $regex: new RegExp(influencerName), $options: "i" };
    }
    
    if (gender) {
      condition['influencer.gender'] = gender;
    }
    
    if (minFollowers || maxFollowers) {
      condition['influencer.followerCount'] = {};
      if (minFollowers) condition['influencer.followerCount'].$gte = parseInt(minFollowers);
      if (maxFollowers) condition['influencer.followerCount'].$lte = parseInt(maxFollowers);
    }
    
    if (minEngagement || maxEngagement) {
      condition['influencer.engagementRate'] = {};
      if (minEngagement) condition['influencer.engagementRate'].$gte = parseFloat(minEngagement);
      if (maxEngagement) condition['influencer.engagementRate'].$lte = parseFloat(maxEngagement);
    }

    // Calculate pagination values
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await Story.countDocuments(condition);

    // Get aggregated stats
    const stats = await Story.aggregate([
      { $match: condition },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: "$likes" },
        }
      }
    ]);

    // Get paginated data
    const stories = await Story.find(condition)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Prepare response
    const response = {
      stories,
      pagination: {
        total: totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        perPage: limitNum
      },
      stats: {
        totalViews: stats[0]?.totalViews || 0,
        totalLikes: stats[0]?.totalLikes || 0
      }
    };

    res.send(response);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving stories."
    });
  }
};

// Find a single Story with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  Story.findById(id)
    .populate('createdBy', '-password')
    .then(data => {
      if (!data) {
        res.status(404).send({ message: "Story not found with id " + id });
      } else {
        res.send(data);
      }
    })
    .catch(err => {
      res.status(500).send({ message: "Error retrieving Story with id=" + id });
    });
};

// Update a Story by the id
exports.update = (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Data to update can't be empty!"
    });
  }

  const id = req.params.id;
  const updateData = {
    handle: req.body.handle,
    'influencer.id': req.body.influencerId,
    'influencer.fullName': req.body.influencerName,
    'influencer.profilePicUrl': req.body.profilePicUrl,
    'influencer.followerCount': req.body.followerCount,
    'influencer.gender': req.body.gender,
    'influencer.engagementRate': req.body.engagementRate,
    storyLink: req.body.storyLink,
    views: req.body.views,
    likes: req.body.likes,
    updatedAt: Date.now()
  };

  // Remove undefined fields
  Object.keys(updateData).forEach(key => 
    updateData[key] === undefined && delete updateData[key]
  );

  if (req.file) {
    updateData.imageUrl = `${BASE_URL}/uploads/stories/${req.file.filename}`;
  }

  Story.findByIdAndUpdate(id, updateData, { useFindAndModify: false, new: true })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update Story with id=${id}. Maybe Story was not found!`
        });
      } else {
        res.send({ message: "Story was updated successfully.", data });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating Story with id=" + id
      });
    });
};

// Delete a Story with the specified id
exports.delete = (req, res) => {
  const id = req.params.id;

  Story.findByIdAndRemove(id)
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete Story with id=${id}. Maybe Story was not found!`
        });
      } else {
        res.send({
          message: "Story was deleted successfully!"
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Could not delete Story with id=" + id
      });
    });
};

// Dashboard statistics
exports.dashboard = async (req, res) => {
  try {
    const totalStories = await Story.countDocuments();
    const totalViews = await Story.aggregate([
      { $group: { _id: null, total: { $sum: "$views" } } }
    ]);
    const totalLikes = await Story.aggregate([
      { $group: { _id: null, total: { $sum: "$likes" } } }
    ]);

    const apiResponse = await axios.get(
      "https://apis.icubeswire.co/api/v1/campaign-analytics/graph-data",
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        params: {
          "hashtags[0]": "itchotels"
        }
      }
    );
    const externalData = await apiResponse.data;
    res.send({
      totalStories,
      totalViews: totalViews[0]?.total || 0,
      totalLikes: totalLikes[0]?.total || 0,
      postGraphData : externalData[0] || []
    });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving dashboard data."
    });
  }
};