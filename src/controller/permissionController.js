const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Permission = require("../model/permission.schema");
const permissionController = express.Router();
const auth = require("../utils/auth"); 

permissionController.post("/create", async (req, res) => {
  try {
    const { module, actions } = req.body;

    const permissionCreated = await Permission.create({
      module,
      actions: actions && actions.length ? actions : undefined,
      description: req.body.description || "",
    });


    sendResponse(res, 200, "Success", {
      message: "Permission created successfully!",
      data: permissionCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

permissionController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      module,
      action,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (module) query.module = module;
    if (action) query.action = action;
    if (searchKey) query.module = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "desc" ? -1 : 1;
    const sortOption = { [sortField]: sortOrder };

    const permissionList = await Permission.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Permission.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Permission list retrieved successfully!",
      data: permissionList,
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

permissionController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    const permissionData = await Permission.findById(id);
    if (!permissionData) {
      return sendResponse(res, 404, "Failed", { message: "Permission not found" });
    }

    const updatedPermission = await Permission.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Permission updated successfully!",
      data: updatedPermission,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

permissionController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const permissionItem = await Permission.findById(id);
    if (!permissionItem) {
      return sendResponse(res, 404, "Failed", {
        message: "Permission not found",
      });
    }

    await Permission.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Permission deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = permissionController;
