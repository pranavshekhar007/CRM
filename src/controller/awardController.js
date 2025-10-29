const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Award = require("../model/award.schema");
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");
const awardController = express.Router();

awardController.post(
  "/create",
  upload.fields([
    { name: "certificate", maxCount: 1 },
    { name: "photo", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { employee, awardType, awardDate, gift, monetaryValue, description } =
        req.body;

      const awardData = {
        employee,
        awardType,
        awardDate,
        gift,
        monetaryValue,
        description,
      };

      if (req.files?.certificate) {
        const uploadedCert = await cloudinary.uploader.upload(
          req.files.certificate[0].path
        );
        awardData.certificate = uploadedCert.secure_url;
      }

      if (req.files?.photo) {
        const uploadedPhoto = await cloudinary.uploader.upload(
          req.files.photo[0].path
        );
        awardData.photo = uploadedPhoto.secure_url;
      }

      const awardCreated = await Award.create(awardData);

      sendResponse(res, 200, "Success", {
        message: "Award created successfully!",
        data: awardCreated,
        statusCode: 200,
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
      });
    }
  }
);

awardController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      employee,
      awardType,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (employee) query.employee = employee;
    if (awardType) query.awardType = awardType;
    if (searchKey)
      query.description = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const awardList = await Award.find(query)
      .populate("employee awardType")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Award.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Award list retrieved successfully!",
      data: awardList,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

awardController.put(
  "/update",
  upload.fields([
    { name: "certificate", maxCount: 1 },
    { name: "photo", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const id = req.body._id;
      const awardData = await Award.findById(id);
      if (!awardData) {
        return sendResponse(res, 404, "Failed", { message: "Award not found" });
      }

      let updatedData = { ...req.body };

      if (req.files?.certificate) {
        const uploadedCert = await cloudinary.uploader.upload(
          req.files.certificate[0].path
        );
        updatedData.certificate = uploadedCert.secure_url;
      }

      if (req.files?.photo) {
        const uploadedPhoto = await cloudinary.uploader.upload(
          req.files.photo[0].path
        );
        updatedData.photo = uploadedPhoto.secure_url;
      }

      const updatedAward = await Award.findByIdAndUpdate(id, updatedData, {
        new: true,
      });

      sendResponse(res, 200, "Success", {
        message: "Award updated successfully!",
        data: updatedAward,
        statusCode: 200,
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
      });
    }
  }
);

awardController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const awardItem = await Award.findById(id);
    if (!awardItem) {
      return sendResponse(res, 404, "Failed", {
        message: "Award not found",
      });
    }

    await Award.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Award deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = awardController;
