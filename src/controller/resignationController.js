const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Resignation = require("../model/resignation.schema");
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");

const resignationController = express.Router();

resignationController.post(
  "/create",
  upload.single("documents"),
  async (req, res) => {
    try {
      const {
        employee,
        resignationDate,
        lastWorkingDay,
        noticePeriod,
        reason,
        description,
        status,
        exitInterviewConducted,
        exitInterviewDate,
        exitFeedback,
      } = req.body;

      const resignationData = {
        employee,
        resignationDate,
        lastWorkingDay,
        noticePeriod,
        reason,
        description,
        status,
        exitInterviewConducted,
        exitInterviewDate,
        exitFeedback,
      };

      if (req.file) {
        const uploadedFile = await cloudinary.uploader.upload(req.file.path);
        resignationData.documents = uploadedFile.secure_url;
      }

      const createdResignation = await Resignation.create(resignationData);

      sendResponse(res, 200, "Success", {
        message: "Resignation created successfully!",
        data: createdResignation,
        statusCode: 200,
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal Server Error",
      });
    }
  }
);

resignationController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      employee,
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};

    if (employee) query.employee = employee;
    if (status) query.status = status;
    if (searchKey)
      query.reason = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const resignationList = await Resignation.find(query)
      .populate("employee")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Resignation.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Resignation list retrieved successfully!",
      data: resignationList,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal Server Error",
    });
  }
});

resignationController.put(
  "/update",
  upload.single("documents"),
  async (req, res) => {
    try {
      const id = req.body._id;
      const existingResignation = await Resignation.findById(id);

      if (!existingResignation) {
        return sendResponse(res, 404, "Failed", {
          message: "Resignation not found",
        });
      }

      const updateData = { ...req.body };

      if (req.file) {
        const uploadedFile = await cloudinary.uploader.upload(req.file.path);
        updateData.documents = uploadedFile.secure_url;
      }

      const updatedResignation = await Resignation.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      sendResponse(res, 200, "Success", {
        message: "Resignation updated successfully!",
        data: updatedResignation,
        statusCode: 200,
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal Server Error",
      });
    }
  }
);

resignationController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const resignation = await Resignation.findById(id);
    if (!resignation) {
      return sendResponse(res, 404, "Failed", {
        message: "Resignation not found",
      });
    }

    await Resignation.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Resignation deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal Server Error",
    });
  }
});

module.exports = resignationController;
