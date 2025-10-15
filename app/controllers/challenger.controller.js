const db = require("../models");
const Challenger = db.challengers;
const Diet = db.dietplan;

exports.listAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        console.log("checking req", req?.query)
        // Build filter object
        let filter = { isDeleted: false };
        if (req?.query?.search)
            filter = {
                ...filter,
                $or: [
                    { name: { $regex: req?.query?.search, $options: "i" } },
                    { mobile: { $regex: req?.query?.search, $options: "i" } }
                ]
            }
        if (req.query.duration) filter.duration = req.query.duration;
        const records = await Challenger.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Challenger.countDocuments(filter);
        res.send({
            data: records,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total
        });
    } catch (err) {
        console.error("problem in challenger list for admin", err)
        res.status(500).send({
            message: err.message || "Some error occurred while retrieving diet plans."
        });
    }
};

exports.register = async (req, res) => {
    try {
        let body = req?.body;
        let otp = generate(4);
        let saveTo = new Challenger({ ...body, otp });
        let saved = await saveTo.save();
        return res.status(200).json({
            data: {
                _id: saved?._id,
                duration: saved?.duration,
                name: saved?.name,
                mobile: saved?.mobile,
                createdAt: saved?.createdAt
            },
            message: "OTP Sent !",
            error: null,
            statusCode: 200
        });
    } catch (error) {
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500
        });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        let body = req?.body;
        console.log("checking req of challenge verify OTP", body);
        let found = await Challenger?.findById(body?.userId, { otp: 1, otpVerified: 1 });
        if (!found) {
            return res.status(400).json({
                data: null,
                message: "Invalid User Id !",
                error: "Bad Request !",
                statusCode: 400
            });
        }
        if (found?.otp != body?.otp) {
            return res.status(400).json({
                data: null,
                message: "Invalid OTP !",
                error: "Bad Request !",
                statusCode: 400
            });
        }
        found.otpVerified = true;
        let saved = await found?.save();
        return res.status(200).json({
            data: saved?.otpVerified,
            message: "OTP Verified !",
            error: null,
            statusCode: 200
        });
    } catch (error) {
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500
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
                }
            },
            {
                $facet: {
                    categories: [
                        { $group: { _id: "$category" } },
                        { $sort: { _id: 1 } },
                        {
                            $project: {
                                _id: 0,
                                title: "$_id"
                            }
                        }

                    ],
                    subcategories: [
                        { $group: { _id: "$subcategory" } },
                        { $sort: { _id: 1 } },
                        {
                            $project: {
                                _id: 0,
                                title: "$_id"
                            }
                        }
                    ],
                    types: [
                        { $group: { _id: "$type" } },
                        { $sort: { _id: 1 } },
                        {
                            $project: {
                                _id: 0,
                                title: "$_id"
                            }
                        }
                    ]
                }
            }
        ]);
        return res.status(200).json({
            data: records?.length ? records[0] : null,
            message: "Data Fetched !",
            error: null,
            statusCode: 200
        });
    } catch (error) {
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500
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
                statusCode: 400
            });
        }
        let records = await Diet.aggregate([
            {
                $match: {
                    isActive: true,
                    category: body?.category,
                    subcategory: body?.subcategory,
                    type: body?.type,
                }
            },
            {
                $limit: 1
            },
            {
                $project: {
                    pdf: "$pdfFile.path"
                }
            }

        ]);
        if (!records?.length) {
            return res.status(200).json({
                data: null,
                message: "No Relevent PDF File !",
                error: null,
                statusCode: 400
            });
        }
        found.category = body?.category;
        found.subcategory = body?.subcategory;
        found.type = body?.type;
        found.pdf = records[0]?.pdf;
        let saved = await found?.save();
        return res.status(200).json({
            data: records?.length ? records[0]?.pdf : null,
            message: "Data Fetched !",
            error: null,
            statusCode: 200
        });
    } catch (error) {
        return res.status(500).json({
            data: null,
            message: "Server Error!",
            error: error.message,
            statusCode: 500
        });
    }
};

function generate(n) {
    var add = 1, max = 12 - add;   // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.   

    if (n > max) {
        return generate(max) + generate(n - max);
    }

    max = Math.pow(10, n + add);
    var min = max / 10; // Math.pow(10, n) basically
    var number = Math.floor(Math.random() * (max - min + 1)) + min;

    return ("" + number).substring(add);
}