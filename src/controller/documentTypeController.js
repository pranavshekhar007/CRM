const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const DocumentType = require("../model/documentType.schema");
const auth = require("../utils/auth");

const documentTypeController = express.Router();

documentTypeController.post("/create", async (req, res) => {
  try {
    const documentTypeCreated = await DocumentType.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Document type created successfully!",
      data: documentTypeCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

documentTypeController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
      required,
    } = req.body;

    const query = {};
    if (required !== undefined) query.required = required;
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const documentTypeList = await DocumentType.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await DocumentType.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Document type list retrieved successfully!",
      data: documentTypeList,
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

documentTypeController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    const documentTypeData = await DocumentType.findById(id);
    if (!documentTypeData) {
      return sendResponse(res, 404, "Failed", { message: "Document type not found" });
    }

    const updatedDocumentType = await DocumentType.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Document type updated successfully!",
      data: updatedDocumentType,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

documentTypeController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const documentTypeItem = await DocumentType.findById(id);
    if (!documentTypeItem) {
      return sendResponse(res, 404, "Failed", {
        message: "Document type not found",
      });
    }

    await DocumentType.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Document type deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = documentTypeController;
