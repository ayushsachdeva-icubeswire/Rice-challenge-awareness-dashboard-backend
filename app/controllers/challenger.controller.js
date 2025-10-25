const db = require("../models");
const axios = require("axios");
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
        const records = await Challenger.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Challenger.countDocuments(filter);
        res.send({
            data: records,
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
        let saveTo = new Challenger({ ...body, otp });
        let saved = await saveTo.save();
        let whatsappResp = await sendOTP(body?.mobile, otp);
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
        console.log("checking req of challenge verify OTP", body);
        let found = await Challenger?.findById(body?.userId, {
            otp: 1,
            otpVerified: 1,
            mobile: 1,
            name: 1,
            duration: 1
        });
        if (!found) {
            return res.status(400).json({
                data: null,
                message: "Invalid User Id !",
                error: "Bad Request !",
                statusCode: 400,
            });
        }
        if (found?.otp != body?.otp) {
            return res.status(400).json({
                data: null,
                message: "Invalid OTP !",
                error: "Bad Request !",
                statusCode: 400,
            });
        }
        found.otpVerified = true;
        let saved = await found?.save();
        return res.status(200).json({
            data: saved?.otpVerified,
            message: "OTP Verified !",
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
        let whatsappResp = await sendPlan(found?.mobile, found?.name, records[0]?.pdf, records[0]?.name, found?.duration);
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
        let lastER = await challangerProgress
            .findOne({ name: "engagement" })
            .sort({ createdAt: -1 });

        if (!lastER) {
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
        }

        let challengerCount = await Challenger.countDocuments({ isDeleted: false });
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
            erProgress: lastER,
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

async function sendOTP(mobile, otp) {
    return new Promise(async (resolve, reject) => {
        try {
            // Example: simulate sending WhatsApp message via API
            const payload = {
                "countryCode": "+91",
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
                reject(new Error("Failed to send WhatsApp message"));
            }
        } catch (error) {
            console.error("Error in sendOTP:", error.message);
            reject(error); // reject promise on failure
        }
    });
}

async function sendPlan(mobile, name, pdf, filename, duration) {
    return new Promise(async (resolve, reject) => {
        try {
            const payload = {
                "countryCode": "+91",
                "phoneNumber": mobile,
                "type": "Template",
                "template": {
                    "name": "meal_plan_7",
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
                resolve(response.data); // return API response
            } else {
                reject(new Error("Failed to send WhatsApp message"));
            }
        } catch (error) {
            console.error("Error in sendOTP:", error.message);
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