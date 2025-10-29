const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Goal = require("../model/goal.schema");
const Employee = require("../model/employee.schema");
const PerformanceGoalType = require("../model/performanceGoalType.schema");
const goalController = express.Router();

goalController.post("/create", async (req, res) => {
  try {
    const { employee, goalType } = req.body;

    const employeeExists = await Employee.findById(employee);
    if (!employeeExists)
      return sendResponse(res, 400, "Failed", { message: "Invalid employee ID" });

    const goalTypeExists = await PerformanceGoalType.findById(goalType);
    if (!goalTypeExists)
      return sendResponse(res, 400, "Failed", { message: "Invalid goal type ID" });

    const createdGoal = await Goal.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Goal created successfully!",
      data: createdGoal,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

goalController.post("/list", async (req, res) => {
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
    if (searchKey) {
      query.$or = [
        { goalTitle: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const goals = await Goal.find(query)
      .populate("employee", "fullName")
      .populate("goalType", "name")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Goal.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Goal list retrieved successfully!",
      data: goals,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

goalController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    const existingGoal = await Goal.findById(id);
    if (!existingGoal)
      return sendResponse(res, 404, "Failed", { message: "Goal not found" });

    const updatedGoal = await Goal.findByIdAndUpdate(id, req.body, { new: true });

    sendResponse(res, 200, "Success", {
      message: "Goal updated successfully!",
      data: updatedGoal,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

goalController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await Goal.findById(id);
    if (!goal)
      return sendResponse(res, 404, "Failed", { message: "Goal not found" });

    await Goal.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Goal deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = goalController;
