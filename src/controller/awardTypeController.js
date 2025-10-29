const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const AwardType = require("../model/awardType.schema");
const awardTypeController = express.Router();
const auth = require("../utils/auth");

awardTypeController.post("/create", async (req, res) => {
  try {
    const awardTypeCreated = await AwardType.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Award Type created successfully!",
      data: awardTypeCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

awardTypeController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (status) query.status = status;
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const awardTypeList = await AwardType.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await AwardType.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Award Type list retrieved successfully!",
      data: awardTypeList,
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

awardTypeController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    const awardTypeData = await AwardType.findById(id);
    if (!awardTypeData) {
      return sendResponse(res, 404, "Failed", {
        message: "Award Type not found",
      });
    }

    const updatedAwardType = await AwardType.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Award Type updated successfully!",
      data: updatedAwardType,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

awardTypeController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const awardTypeItem = await AwardType.findById(id);
    if (!awardTypeItem) {
      return sendResponse(res, 404, "Failed", {
        message: "Award Type not found",
      });
    }

    await AwardType.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Award Type deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = awardTypeController;
