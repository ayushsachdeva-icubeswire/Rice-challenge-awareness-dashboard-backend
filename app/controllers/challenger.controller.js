const db = require("../models");
const axios = require("axios");
const { sendWhatsAppFailureNotification } = require("../services/email.service");
const logger = require("../config/logger.config");
const Challenger = db.challengers;
const Diet = db.dietplan;
const challangerProgress = db.challengerProgress;

exports.listAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        console.log("checking req", req?.query);
        // Build filter object
        let filter = { isDeleted: false };
        if (req?.query?.search)
            filter = {
                ...filter,
                $or: [
                    { name: { $regex: req?.query?.search, $options: "i" } },
                    { mobile: { $regex: req?.query?.search, $options: "i" } },
                ],
            };
    if (req.query.duration) filter.duration = req.query.duration;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.subcategory) filter.subcategory = req.query.subcategory;
        const records = await Challenger.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Challenger.countDocuments(filter);
        const result = await Challenger.aggregate([
        { $match: filter },
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
        let otp = generate(4);

        // Check for existing challenger with the same mobile number
        let existingChallenger = await Challenger.findOne({ 
            mobile: body.mobile,
            isDeleted: false 
        }).sort({ createdAt: -1 }); // Get the latest one

        let saved;
        if (existingChallenger) {
            // Update existing challenger with new data
            existingChallenger.name = body.name;
            existingChallenger.duration = body.duration;
            existingChallenger.countryCode = body.countryCode;
            existingChallenger.otp = otp;
            saved = await existingChallenger.save();
        } else {
            // Create new challenger if no existing one found
            let saveTo = new Challenger({ ...body, otp });
            saved = await saveTo.save();
        }

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
        logger.info("OTP verification attempt", {
            userId: body?.userId,
            mobile: body.mobile,
            timestamp: new Date().toISOString()
        });

        let found = await Challenger?.findById(body?.userId, {
            otp: 1,
            otpVerified: 1,
            mobile: 1,
            name: 1,
            duration: 1
        });

        if (!found) {
            logger.warn("Invalid user ID during OTP verification", {
                userId: body?.userId,
                ip: req.ip,
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
                ip: req.ip,
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
        let saved = await found?.save();

        logger.info("OTP verified successfully", {
            userId: body?.userId,
            userName: found?.name,
            mobile: found.mobile,
            duration: found?.duration,
            timestamp: new Date().toISOString()
        });

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
        let found = await Challenger?.findById(body?.userId);
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
                ip: req.ip,
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
        if (!records?.length) {
            return res.status(200).json({
                data: null,
                message: "No Relevent PDF File !",
                error: null,
                statusCode: 400,
            });
        }
        found.category = body?.category;
        found.subcategory = body?.subcategory;
        found.type = body?.type;
        found.pdf = records[0]?.pdf;
        let saved = await found?.save();
        let whatsappResp = await sendPlan(found?.mobile, found?.name, records[0]?.pdf, records[0]?.name, found?.duration, found?.countryCode);
        // await fireTrackingPixel(11032, found?.name, found?.mobile);
        return res.status(200).json({
            data: records?.length ? records[0]?.pdf : null,
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
        const lastER = await challangerProgress
            .findOne({ name: "engagement" })
            .sort({ createdAt: -1 });

        // Common API call parameters
        const apiConfig = {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            params: {
                "hashtags[0]": "onlydaawatnovember",
                "hashtags[1]": "onlyricenovember",
                "hashtags[2]": "riceyourawareness",
            },
        };

        // Fetch external data once
        const { data: externalData } = await axios.get(
            "https://apis.icubeswire.co/api/v1/campaign-contents/analysis",
            apiConfig
        );

        const currentValue = externalData?.total_engagements || 0;

        // Prepare insert data
        const progressData = {
            name: "engagement",
            previousValue: lastER ? lastER.currentValue : 0,
            currentValue,
            manualEntries: lastER ? currentValue - lastER.currentValue : 0,
            difference: 0,
        };

        // Create new progress record
        const newRecord = await challangerProgress.create(progressData);


        let challengerCount = await Challenger.countDocuments({
            isDeleted: false,
            // $or: [
            //     { otpVerified: { $eq: true } },
            //     { isPrevious: { $eq: true } }
            // ]
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
            erProgress: newRecord,
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

function generate(n) {
    var add = 1,
        max = 12 - add; // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.

    if (n > max) {
        return generate(max) + generate(n - max);
    }

    max = Math.pow(10, n + add);
    var min = max / 10; // Math.pow(10, n) basically
    var number = Math.floor(Math.random() * (max - min + 1)) + min;

    return ("" + number).substring(add);
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
                    Authorization: 'Basic VHY2aVQ2bFMyWGFtSFR5ZC14bS1HN1IzVVp1d28zVlZFOVoyV2hXdUJlWTo=',
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
                    Payload: JSON.stringify(payload),
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
                    "name": "meal_plan_8",
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
                    Authorization: 'Basic VHY2aVQ2bFMyWGFtSFR5ZC14bS1HN1IzVVp1d28zVlZFOVoyV2hXdUJlWTo=',
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

// async function fireTrackingPixel(goalId, name, mobile) {
//   try {
//     const url = `https://tracking.icubeswire.co/aff_a?offer_id=7333&goal_id=${goalId}&adv_sub1=${encodeURIComponent(name)}&adv_sub2=${encodeURIComponent(mobile)}`;
//     const response = await axios.get(url);
//     console.log(`Pixel (goal_id=${goalId}) fired successfully:`, response.status);
//   } catch (error) {
//     console.error(`Error firing pixel (goal_id=${goalId}):`, error.message);
//   }
// }

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
