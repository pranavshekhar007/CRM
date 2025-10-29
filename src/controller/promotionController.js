const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Promotion = require("../model/promotion.schema");
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");

const promotionController = express.Router();

promotionController.post(
  "/create",
  upload.single("document"),
  async (req, res) => {
    try {
      const {
        employee,
        previousDesignation,
        newDesignation,
        promotionDate,
        effectiveDate,
        salaryAdjustment,
        reasonForPromotion,
        status,
      } = req.body;

      const promotionData = {
        employee,
        previousDesignation,
        newDesignation,
        promotionDate,
        effectiveDate,
        salaryAdjustment,
        reasonForPromotion,
        status,
      };

      if (req.file) {
        const uploadedDoc = await cloudinary.uploader.upload(req.file.path);
        promotionData.document = uploadedDoc.secure_url;
      }

      const createdPromotion = await Promotion.create(promotionData);

      sendResponse(res, 200, "Success", {
        message: "Promotion created successfully!",
        data: createdPromotion,
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

promotionController.post("/list", async (req, res) => {
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
      query.reasonForPromotion = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const promotionList = await Promotion.find(query)
      .populate("employee newDesignation")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Promotion.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Promotion list retrieved successfully!",
      data: promotionList,
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

promotionController.put(
  "/update",
  upload.single("document"),
  async (req, res) => {
    try {
      const id = req.body._id;
      const existingPromotion = await Promotion.findById(id);
      if (!existingPromotion) {
        return sendResponse(res, 404, "Failed", {
          message: "Promotion not found",
        });
      }

      const updateData = { ...req.body };

      if (req.file) {
        const uploadedDoc = await cloudinary.uploader.upload(req.file.path);
        updateData.document = uploadedDoc.secure_url;
      }

      const updatedPromotion = await Promotion.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      sendResponse(res, 200, "Success", {
        message: "Promotion updated successfully!",
        data: updatedPromotion,
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

promotionController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return sendResponse(res, 404, "Failed", {
        message: "Promotion not found",
      });
    }

    await Promotion.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Promotion deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal Server Error",
    });
  }
});

module.exports = promotionController;
