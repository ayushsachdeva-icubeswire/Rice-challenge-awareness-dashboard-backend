const db = require("../models");
const Challenger = db.challengers;

exports.listAdmin = (req, res) => {
    res.status(200).send("getting list for admin.");
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