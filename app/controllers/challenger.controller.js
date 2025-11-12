const db = require("../models");
const axios = require("axios");
const crypto = require("crypto");
const { sendWhatsAppFailureNotification } = require("../services/email.service");
const logger = require("../config/logger.config");
const Challenger = db.challengers;
const Diet = db.dietplan;
const challangerProgress = db.challengerProgress;
const WebhookLogs = db.webhookLogs;
const WEBHOOK_SECRET = process.env.INTERAKT_WEBHOOK_SECRET || "your_interakt_secret";

exports.listAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        console.log("checking req", req?.query);
        // Build filter object
        let filter = {
          isDeleted: false,
          $and: [
            {
              $or: [
                { isDummy: false },
                { isDummy: null },
                { isDummy: { $exists: false } },
              ],
            },
            {
              $or: [
                { otpVerified: { $eq: true } },
                { isPrevious: { $eq: true } },
              ],
            },
          ],
        };
        const exactCountFilter = {
          isDeleted: false,
          $and: [
            {
              $or: [
                { otpVerified: { $eq: true } },
                { isPrevious: { $eq: true } },
              ],
            },
          ],
        };
        // ✅ Add search filter if present
        if (req?.query?.search) {
          filter.$and.push({
            $or: [
              { name: { $regex: req.query.search, $options: "i" } },
              { mobile: { $regex: req.query.search, $options: "i" } },
            ],
          });
          exactCountFilter.$and.push({  
            $or: [
              { name: { $regex: req.query.search, $options: "i" } },
              { mobile: { $regex: req.query.search, $options: "i" } },
            ],
          });
        }
        if (req.query.duration) filter.duration = req.query.duration;
        if (req.query.category) filter.category = req.query.category;
        if (req.query.subcategory) filter.subcategory = req.query.subcategory;
        if (req.query.utm_url) {
            filter.referer = req.query.utm_url;
            exactCountFilter.referer = req.query.utm_url;
        }
        if (req.query.from && req.query.to) {
            filter.createdAt = {};
            exactCountFilter.createdAt = {};
            
            if (req.query.from) {
                // beginning of the day
                filter.createdAt.$gte = new Date(new Date(req.query.from).setHours(0, 0, 0, 0));
                exactCountFilter.createdAt.$gte = new Date(new Date(req.query.from).setHours(0, 0, 0, 0));
            }
            if (req.query.to) {
                // end of the day
                filter.createdAt.$lte = new Date(new Date(req.query.to).setHours(23, 59, 59, 999));
                exactCountFilter.createdAt.$lte = new Date(new Date(req.query.to).setHours(23, 59, 59, 999));
            }
        }
        const records = await Challenger.find(filter,{name:1,mobile:1,duration:1,category:1,subcategory:1,type:1,pdf:1,createdAt:1})
            .sort({ otpVerified:-1, createdAt: -1})
            .skip(skip)
            .limit(limit);

        const total = await Challenger.countDocuments(filter);
        const actualCount = await Challenger.countDocuments(exactCountFilter);
        const result = await Challenger.aggregate([
            { $match: filter},
            {
                $group: {
                    _id: {
                        $cond: {
                            if: {
                                $or: [
                                    { $eq: ["$category", null] },
                                    { $eq: ["$category", ""] },
                                ],
                            },
                            then: "None",
                            else: "$category",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } }
        ]);
        res.send({
            data: records,
            overview: result,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            actualCount:actualCount
        });
    } catch (err) {
        console.error("problem in challenger list for admin", err);
        res.status(500).send({
            message:
                err.message || "Some error occurred while retrieving diet plans.",
        });
    }
};

exports.register = async (req, res) => {
    try {
        let body = req?.body;
        let otp = generate(6);
        let ip = req.headers['cf-connecting-ip'] ||
            req.headers['client-ip'] ||
            req.headers['x-forwarded-for']?.split(',')[0] ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '';

        let referer = req.headers['referer'] || req.headers['referrer'] || req.headers['x-referer'] || req.headers['x-referrer'] || req.headers['x-forwarded-host'] || req.headers['x-requested-from'] || '';

        let saveTo = new Challenger({ ...body, otp ,ip, referer});
        let saved = await saveTo.save();
        // Check for existing challenger with the same mobile number
        // let existingChallenger = await Challenger.findOne({
        //     mobile: body.mobile,
        //     isDeleted: false
        // }).sort({ createdAt: -1 }); // Get the latest one

        // let saved;
        // if (existingChallenger) {
        //     // Update existing challenger with new data
        //     existingChallenger.name = body.name;
        //     existingChallenger.duration = body.duration;
        //     existingChallenger.countryCode = body.countryCode;
        //     existingChallenger.otp = otp;
        //     existingChallenger.ip = ip;
        //     existingChallenger.referer = referer;
        //     existingChallenger.updatedAt = new Date();
        //     saved = await existingChallenger.save();
        // } else {
        //     // Create new challenger if no existing one found
        //     let saveTo = new Challenger({ ...body, otp, ip, referer });
        //     saved = await saveTo.save();
        // }

        let whatsappResp = await sendOTP(body?.mobile, otp, body.countryCode);
        // await fireTrackingPixel(11031, saved?.name, saved?.mobile);
        return res.status(200).json({
            data: {
                _id: saved?._id,
                duration: saved?.duration,
                name: saved?.name,
                mobile: saved?.mobile,
                createdAt: saved?.createdAt,
            },
            message: "OTP Sent !",
            error: null,
            statusCode: 200,
        });
    } catch (error) {
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500,
        });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        let body = req?.body;

        let found = await Challenger?.findById(body?.userId, {
            otp: 1,
            otpVerified: 1,
            mobile: 1,
            name: 1,
            duration: 1
        });

        logger.info("OTP verification attemptt", {
            ip: req.headers['cf-connecting-ip'] ||
                req.headers['client-ip'] ||
                req.headers['x-forwarded-for']?.split(',')[0] ||
                req.headers['x-real-ip'] ||
                req.socket?.remoteAddress ||
                '',
            otp: found?.otp,
            userId: body?.userId,
            mobile: found?.mobile,
            timestamp: new Date().toISOString()
        });

        if (!found) {
            logger.warn("Invalid user ID during OTP verification", {
                userId: body?.userId,
                ip: req.headers['cf-connecting-ip'] ||
                    req.headers['client-ip'] ||
                    req.headers['x-forwarded-for']?.split(',')[0] ||
                    req.headers['x-real-ip'] ||
                    req.socket?.remoteAddress ||
                    '',
                userAgent: req.get('User-Agent')
            });
            return res.status(400).json({
                data: null,
                message: "Invalid User Id !",
                error: "Bad Request !",
                statusCode: 400,
            });
        }

        if (found?.otp != body?.otp) {
            logger.error("Invalid OTP provided", {
                userId: body?.userId,
                userName: found?.name,
                mobile: found.mobile,
                providedOtp: body?.otp,
                ip: req.headers['cf-connecting-ip'] ||
                    req.headers['client-ip'] ||
                    req.headers['x-forwarded-for']?.split(',')[0] ||
                    req.headers['x-real-ip'] ||
                    req.socket?.remoteAddress ||
                    '',
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
            return res.status(400).json({
                data: null,
                message: "Invalid OTP !",
                error: "Bad Request !",
                statusCode: 400,
            });
        }

        found.otpVerified = true;
        found.updatedAt = new Date();
        let saved = await found?.save();

        logger.info("OTP verified successfully", {
            ip: req.headers['cf-connecting-ip'] ||
                req.headers['client-ip'] ||
                req.headers['x-forwarded-for']?.split(',')[0] ||
                req.headers['x-real-ip'] ||
                req.socket?.remoteAddress ||
                '',
            userId: body?.userId,
            userName: found?.name,
            mobile: found.mobile,
            duration: found?.duration,
            timestamp: new Date().toISOString()
        });
        // if(req.body?.key){
        //     const url = `https://tracking.icubeswire.co/aff_a?offer_id=7333&transaction_id=${req.body?.key}&adv_sub1=${encodeURIComponent(found?.name)}&adv_sub2=${encodeURIComponent(found?.mobile)}&goal_name=rtyui`;
        //     await fireTrackingPixel(url);
        // }
        
        return res.status(200).json({
            data: saved?.otpVerified,
            message: "OTP Verified !",
            error: null,
            statusCode: 200,
        });
    } catch (error) {
        logger.error("Server error during OTP verification", {
            userId: req?.body?.userId,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500,
        });
    }
};

exports.getMeta = async (req, res) => {
    try {
        let body = req?.body;
        console.log("checking req of challenge verify OTP", body);
        let records = await Diet.aggregate([
            {
                $match: {
                    isActive: true,
                },
            },
            {
                $facet: {
                    categories: [
                        { $group: { _id: "$category" } },
                        { $sort: { _id: 1 } },
                        {
                            $project: {
                                _id: 0,
                                title: "$_id",
                            },
                        },
                    ],
                    subcategories: [
                        { $group: { _id: "$subcategory" } },
                        { $sort: { _id: 1 } },
                        {
                            $project: {
                                _id: 0,
                                title: "$_id",
                            },
                        },
                    ],
                    types: [
                        { $group: { _id: "$type" } },
                        { $sort: { _id: 1 } },
                        {
                            $project: {
                                _id: 0,
                                title: "$_id",
                            },
                        },
                    ],
                },
            },
        ]);
        return res.status(200).json({
            data: records?.length ? records[0] : null,
            message: "Data Fetched !",
            error: null,
            statusCode: 200,
        });
    } catch (error) {
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500,
        });
    }
};

exports.submit = async (req, res) => {
    try {
        let body = req?.body;
        console.log("checking req of challenge verify OTP", body);
        
        let found;
        
        // ✅ Check if type is "test" - create user on the fly if userId is not a valid ObjectId
        if (body?.type === "test") {
            // Try to find if userId is a valid MongoDB ObjectId and exists
            let isValidObjectId = /^[0-9a-fA-F]{24}$/.test(body?.userId);
            
            if (isValidObjectId) {
                found = await Challenger?.findById(body?.userId);
            }
            
            // If not found or invalid ObjectId, create a new test user with MongoDB-generated ObjectId
            if (!found) {
                let ip = req.headers['cf-connecting-ip'] ||
                    req.headers['client-ip'] ||
                    req.headers['x-forwarded-for']?.split(',')[0] ||
                    req.headers['x-real-ip'] ||
                    req.socket?.remoteAddress ||
                    '';

                let referer = req.headers['referer'] || req.headers['referrer'] || req.headers['x-referer'] || req.headers['x-referrer'] || req.headers['x-forwarded-host'] || req.headers['x-requested-from'] || '';

                // Create new test user (MongoDB will auto-generate a proper ObjectId for _id)
                let testUser = new Challenger({
                    // Note: _id is NOT set here - MongoDB will generate it automatically
                    name: body?.name || "Test User",
                    mobile: body?.mobile || `test-${Date.now()}`, // Use timestamp for unique mobile if not provided
                    countryCode: body?.countryCode || "+91",
                    duration: body?.duration || "7 days",
                    otp: "0000",
                    otpVerified: true, // Auto-verify for test
                    ip: ip,
                    referer: referer,
                    type: "test"
                });
                found = await testUser.save(); // MongoDB generates proper ObjectId here
            } else {
                // If user already exists, ensure otpVerified is true for test type
                found.otpVerified = true;
            }
            
            // Update user with category, subcategory FIRST (before PDF lookup)
            found.category = body?.category;
            found.subcategory = body?.subcategory;
            found.type = body?.type;
            found.otpVerified = true; // Ensure otpVerified is true for test type
            found.updatedAt = new Date();
            
            // Fetch PDF same as normal flow
            let records = await Diet.aggregate([
                {
                    $match: {
                        isActive: true,
                        category: body?.category,
                        subcategory: body?.subcategory,
                        duration: found?.duration
                    },
                },
                {
                    $limit: 1,
                },
                {
                    $project: {
                        pdf: "$pdfFile.s3Url",
                        name: 1
                    },
                },
            ]);
            
            // Update user with pdf if found
            if (records?.length) {
                found.pdf = records[0]?.pdf;
            } else {
                // Log when no PDF is found, but don't treat it as an error
                logger.warn('No PDF found for test submission', {
                    userId: found._id,
                    category: body?.category,
                    subcategory: body?.subcategory,
                    duration: found?.duration,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Save the user data regardless of PDF availability
            let saved = await found?.save();
            
            // Return success response (with or without PDF)
            return res.status(200).json({
                data: records?.length ? records[0]?.pdf : null,
                message: records?.length 
                    ? "PDF fetched!" 
                    : "No PDF available for selected options",
                error: null,
                statusCode: 200,
            });
        }
        
        // Normal flow for non-test users
        found = await Challenger?.findById(body?.userId);
        if (!found) {
            return res.status(400).json({
                data: null,
                message: "Invalid User Id !",
                error: "Bad Request !",
                statusCode: 400,
            });
        }

        // ✅ Check if OTP has been verified
        if (!found.otpVerified) {
            logger.warn("Attempt to access submit without OTP verification", {
                userId: body?.userId,
                userName: found?.name,
                mobile: found.mobile,
                ip: req.headers['cf-connecting-ip'] ||
                    req.headers['client-ip'] ||
                    req.headers['x-forwarded-for']?.split(',')[0] ||
                    req.headers['x-real-ip'] ||
                    req.socket?.remoteAddress ||
                    '',
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
            return res.status(403).json({
                data: null,
                message: "OTP verification required before accessing this resource!",
                error: "Forbidden - OTP Not Verified",
                statusCode: 403,
            });
        }
        
        // Update user with category, subcategory, type FIRST (before PDF lookup)
        found.category = body?.category;
        found.subcategory = body?.subcategory;
        found.type = body?.type;
        found.updatedAt = new Date();
        
        let records = await Diet.aggregate([
            {
                $match: {
                    isActive: true,
                    category: body?.category,
                    subcategory: body?.subcategory,
                    duration: found?.duration
                    // type: body?.type,
                },
            },
            {
                $limit: 1,
            },
            {
                $project: {
                    pdf: "$pdfFile.s3Url",
                    name: 1
                },
            },
        ]);
        
        // Update user with pdf if found
        if (records?.length) {
            found.pdf = records[0]?.pdf;
        } else {
            // Log when no PDF is found, but don't treat it as an error
            logger.warn('No PDF found for submission', {
                userId: found._id,
                category: body?.category,
                subcategory: body?.subcategory,
                duration: found?.duration,
                timestamp: new Date().toISOString()
            });
        }
        
        // Save the user data regardless of PDF availability
        let saved = await found?.save();
        
        // Only send WhatsApp if PDF is available
        if (records?.length) {
            let whatsappResp = await sendPlan(found?.mobile, found?.name, records[0]?.pdf, records[0]?.name, found?.duration, found?.countryCode);
            // await fireTrackingPixel(11032, found?.name, found?.mobile);
        }
        
        // Return success response (with or without PDF)
        return res.status(200).json({
            data: records?.length ? records[0]?.pdf : null,
            message: records?.length 
                ? "Data Fetched !" 
                : "Submission successful - No PDF available for selected options",
            error: null,
            statusCode: 200,
        });
    } catch (error) {
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500,
        });
    }
};

exports.updateEngagement = async (req, res) => {
    try {
        const count = Number(req.body?.count) || 0;

        // Find the last engagement entry
        let lastER = await challangerProgress
            .findOne({ name: "engagement" })
            .sort({ createdAt: -1 });

        let newER;

        if (!lastER) {
            // Fetch baseline data from external API
            const { data: externalData } = await axios.get(
                "https://apis.icubeswire.co/api/v1/campaign-contents/analysis",
                {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    params: { "hashtags[0]": "daawatbiryani" },
                }
            );

            const initialValue = externalData?.total_engagements || 0;

            // Insert baseline record
            await challangerProgress.create({
                name: "engagement",
                previousValue: 0,
                currentValue: initialValue,
                manualEntries: 0,
                difference: 0,
            });

            // Create and return the new entry
            newER = await challangerProgress.create({
                name: "engagement",
                previousValue: initialValue,
                currentValue: initialValue + count,
                manualEntries: count,
                difference: count,
            });
        } else {
            // Increment from last entry
            newER = await challangerProgress.create({
                name: "engagement",
                previousValue: lastER.currentValue,
                currentValue: lastER.currentValue + count,
                manualEntries: count,
                difference: count,
            });
        }

        return res.status(200).json({
            data: newER,
            message: "Engagement Updated!",
            error: null,
            statusCode: 200,
        });
    } catch (error) {
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500,
        });
    }
};

exports.getEngagement = async (req, res) => {

    try {
        // const lastER = await challangerProgress
        //     .findOne({ name: "engagement" })
        //     .sort({ createdAt: -1 });

        // // Common API call parameters
        // const apiConfig = {
        //     headers: {
        //         Accept: "application/json",
        //         "Content-Type": "application/json",
        //     },
        //     params: {
        //         "hashtags[0]": "onlydaawatnovember",
        //         "hashtags[1]": "onlyricenovember",
        //         "hashtags[2]": "riceyourawareness",
        //     },
        // };

        // // Fetch external data once
        // const { data: externalData } = await axios.get(
        //     "https://apis.icubeswire.co/api/v1/campaign-contents/analysis",
        //     apiConfig
        // );

        // const currentValue = externalData?.total_engagements || 0;

        // let newRecord = lastER;

        // // Only create new record if there's no last record or values are different
        // if (!lastER || currentValue !== lastER.currentValue) {
        //     // Prepare insert data
        //     const progressData = {
        //         name: "engagement",
        //         previousValue: lastER ? lastER.currentValue : 0,
        //         currentValue,
        //         manualEntries: lastER ? currentValue - lastER.currentValue : 0,
        //         difference: lastER ? currentValue - lastER.currentValue : 0,
        //     };

        //     // Create new progress record
        //     newRecord = await challangerProgress.create(progressData);
        // }

        const progressData = {
            name: "engagement",
            previousValue: 188582,
            currentValue: 188582,
            manualEntries: 0,
            difference: 0,
        };
        let challengerCount = await Challenger.countDocuments({
            isDeleted: false,
            $or: [
                { otpVerified: { $eq: true } },
                { isPrevious: { $eq: true } }
            ]
        });
        let challengerProgress = await challangerProgress
            .findOne({ name: "challenge" })
            .sort({ createdAt: -1 });
        if (challengerCount != (challengerProgress?.currentValue || 0)) {
            let newCP = await challangerProgress.create({
                name: "challenge",
                previousValue: challengerProgress?.currentValue || 0,
                currentValue: challengerCount,
                manualEntries: 0,
                difference: challengerCount - (challengerProgress?.currentValue || 0),
            });
            challengerProgress = newCP;
        }

        let data = {
            erProgress: progressData,
            challengerProgress: challengerProgress,
        };

        return res.status(200).json({
            data: data,
            message: "Engagement Fetched!",
            error: null,
            statusCode: 200,
        });
    } catch (error) {
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500,
        });
    }
};

// function generate(n) {
//     var add = 1,
//         max = 12 - add; // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.

//     if (n > max) {
//         return generate(max) + generate(n - max);
//     }

//     max = Math.pow(10, n + add);
//     var min = max / 10; // Math.pow(10, n) basically
//     var number = Math.floor(Math.random() * (max - min + 1)) + min;

//     return ("" + number).substring(add);
// }

function generate(n) {
    // Always generate exactly n digits
    var min = Math.pow(10, n - 1);
    var max = Math.pow(10, n) - 1;
    var number = Math.floor(Math.random() * (max - min + 1)) + min;
    return number.toString();
}

async function sendOTP(mobile, otp, countryCode) {
    return new Promise(async (resolve, reject) => {
        try {
            // Example: simulate sending WhatsApp message via API
            const payload = {
                "countryCode": countryCode,
                "phoneNumber": mobile,
                "type": "Template",
                "template": {
                    "name": "opt_verification",
                    "languageCode": "en",
                    "bodyValues": [
                        otp.toString()
                    ],
                    "buttonValues": {
                        "0": [
                            otp.toString()
                        ]
                    }
                }
            };
            // Example using axios
            const response = await axios.post("https://api.interakt.ai/v1/public/message/", payload, {
                headers: {
                    Authorization: `Basic ${process.env.Interakt_API_KEY}`,
                    "Content-Type": "application/json",
                },
            });
            if (response.data.result) {
                console.log("✅ WhatsApp message sent successfully");
                resolve(response.data); // return API response
            } else {
                console.log("❌ Failed to send WhatsApp message");
                // Send email notification on API failure
                await sendWhatsAppFailureNotification(
                    'OTP',
                    mobile,
                    'WhatsApp API returned false result',
                    {
                        OTP: otp,
                        Response: JSON.stringify(response.data),
                        Payload: JSON.stringify(payload)
                    }
                );
                reject(new Error("Failed to send WhatsApp message"));
            }
        } catch (error) {
            console.error("Error in sendOTP:", error.message);
            // Send email notification on API error
            await sendWhatsAppFailureNotification(
                'OTP',
                mobile,
                error.message,
                {
                    OTP: otp,
                    // Payload: JSON.stringify(payload),
                    ErrorStack: error.stack
                }
            );
            reject(error); // reject promise on failure
        }
    });
}

async function sendPlan(mobile, name, pdf, filename, duration, countryCode) {
    return new Promise(async (resolve, reject) => {
        try {
            const payload = {
                "countryCode": countryCode,
                "phoneNumber": mobile,
                "type": "Template",
                "template": {
                    "name": "meal_plan_9",
                    "languageCode": "en",
                    "headerValues": [
                        pdf
                    ],
                    "fileName": filename,
                    "bodyValues": [
                        name,
                        duration
                    ]
                }
            };
            // Example using axios
            const response = await axios.post("https://api.interakt.ai/v1/public/message/", payload, {
                headers: {
                    Authorization: `Basic ${process.env.Interakt_API_KEY}`,
                    "Content-Type": "application/json",
                },
            });
            if (response.data.result) {
                console.log(response.data);
                console.log("✅ WhatsApp message sent successfully");
                resolve(response.data); // return API response
            } else {
                // Send email notification on API failure
                await sendWhatsAppFailureNotification(
                    'Plan',
                    mobile,
                    'WhatsApp API returned false result',
                    {
                        Name: name,
                        PDF: pdf,
                        Filename: filename,
                        Duration: duration,
                        Response: JSON.stringify(response.data),
                        Payload: JSON.stringify(payload)
                    }
                );
                reject(new Error("Failed to send WhatsApp message"));
            }
        } catch (error) {
            console.error("Error in sendPlan:", error.message);
            // Send email notification on API error
            await sendWhatsAppFailureNotification(
                'Plan',
                mobile,
                error.message,
                {
                    Name: name,
                    PDF: pdf,
                    Filename: filename,
                    Duration: duration,
                    Payload: JSON.stringify(payload),
                    ErrorStack: error.stack
                }
            );
            reject(error); // reject promise on failure
        }
    });
}

async function fireTrackingPixel(url) {
  try {
    // const url = `https://tracking.icubeswire.co/aff_a?offer_id=7333&goal_id=${goalId}&adv_sub1=${encodeURIComponent(name)}&adv_sub2=${encodeURIComponent(mobile)}`;
    const response = await axios.get(url);
    console.log(`Pixel fired successfully:`, response.status);
  } catch (error) {
    console.error(`Error firing pixel`, error.message);
  }
}

exports.getERValue = async (req, res) => {
    try {
        const { data: externalData } = await axios.get(
            "https://apis.icubeswire.co/api/v1/campaign-contents/analysis",
            {
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                params: {
                    "hashtags[0]": "onlydaawatnovember",
                    "hashtags[1]": "onlyricenovember",
                    "hashtags[2]": "riceyourawareness",
                },
            }
        );
        const initialValue = externalData?.total_engagements || 0;
        let challengerCount = await Challenger.countDocuments({
            isDeleted: false,
            // $or: [
            //     { otpVerified: { $eq: true } },
            //     { isPrevious: { $eq: true } }
            // ]
        });

        let data = {
            intractionCount: initialValue,
            challengerCount: challengerCount,
        };

        return res.status(200).json({
            data: data,
            message: "Engagement Fetched!",
            error: null,
            statusCode: 200,
        });
    } catch (error) {
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500,
        });
    }
};

exports.interaktWebhookHandler = async (req, res) => {
  try {
    let status, message_id, response_data;
    if (req.body.data && req.body.data.message) {
      // New format (like your example)
      status = req.body.data.message.message_status;
      message_id = req.body.data.message.id;
      response_data = req.body.data;
    } else if (req.body.data) {
      // Old format
      status = req.body.data.status;
      message_id = req.body.data.message_id;
      response_data = req.body.data;
    }

    if (!status || !message_id) {
      console.log("ℹ️ Ignored event: missing status or message_id");
      return res.status(200).send("Ignored");
    }

    // 3️⃣ Store unique message status
    try {
      await WebhookLogs.updateOne(
        { message_id, status }, // prevent same status for same message
        {
          $setOnInsert: {
            message_id,
            status,
            response_data,
          },
        },
        { upsert: true }
      );

      console.log(`✅ Stored status "${status}" for message ${message_id}`);
    } catch (err) {
      if (err.code === 11000) {
        console.log(`⏩ Duplicate ignored: ${message_id} - ${status}`);
      } else {
        console.error("❌ DB Error:", err);
      }
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    return res.status(500).send("Error");
  }
};
