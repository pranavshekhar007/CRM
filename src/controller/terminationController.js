const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Termination = require("../model/termination.schema");
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");

const terminationController = express.Router();

terminationController.post(
  "/create",
  upload.single("documents"),
  async (req, res) => {
    try {
      const {
        employee,
        terminationType,
        noticeDate,
        terminationDate,
        noticePeriod,
        reason,
        description,
      } = req.body;

      const terminationData = {
        employee,
        terminationType,
        noticeDate,
        terminationDate,
        noticePeriod,
        reason,
        description,
      };

      if (req.file) {
        const uploadedFile = await cloudinary.uploader.upload(req.file.path);
        terminationData.documents = uploadedFile.secure_url;
      }

      const createdTermination = await Termination.create(terminationData);

      sendResponse(res, 200, "Success", {
        message: "Termination created successfully!",
        data: createdTermination,
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

terminationController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      terminationType,
      employee,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (employee) query.employee = employee;
    if (terminationType) query.terminationType = terminationType;
    if (searchKey)
      query.reason = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const terminationList = await Termination.find(query)
      .populate("employee")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Termination.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Termination list retrieved successfully!",
      data: terminationList,
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

terminationController.put(
  "/update",
  upload.single("documents"),
  async (req, res) => {
    try {
      const id = req.body._id;
      const terminationData = await Termination.findById(id);

      if (!terminationData) {
        return sendResponse(res, 404, "Failed", {
          message: "Termination record not found",
        });
      }

      const updateData = { ...req.body };

      if (req.file) {
        const uploadedFile = await cloudinary.uploader.upload(req.file.path);
        updateData.documents = uploadedFile.secure_url;
      }

      const updatedTermination = await Termination.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      sendResponse(res, 200, "Success", {
        message: "Termination updated successfully!",
        data: updatedTermination,
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

terminationController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const termination = await Termination.findById(id);
    if (!termination) {
      return sendResponse(res, 404, "Failed", {
        message: "Termination not found",
      });
    }

    await Termination.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Termination deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal Server Error",
    });
  }
});

module.exports = terminationController;
