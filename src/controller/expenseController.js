const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Expense = require("../model/expense.schema");
const expenseController = express.Router();
const auth = require("../utils/auth");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

expenseController.post("/create", async (req, res) => {
  try {
    const { name, date, amount, description = "" } = req.body;

    if (!name || !date || amount === undefined) {
      return sendResponse(res, 422, "Failed", {
        message: "name, date and amount are required",
      });
    }

    const expenseDate = new Date(date);
    if (isNaN(expenseDate.getTime())) {
      return sendResponse(res, 422, "Failed", { message: "Invalid date" });
    }

    const expense = new Expense({
      name,
      date: expenseDate,
      amount: Number(amount),
      description,
    });

    await expense.save();

    sendResponse(res, 201, "Success", {
      message: "Expense created successfully",
      data: expense,
    });
  } catch (error) {
    console.error("Create expense error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


expenseController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      dateFrom,
      dateTo,
      pageNo = 1,
      pageCount = 10,
      sortByField = "createdAt",
      sortByOrder = -1,
    } = req.body;

    const query = {};

    // Text search on name/description
    if (searchKey && searchKey.trim()) {
      query.$or = [
        { name: { $regex: searchKey.trim(), $options: "i" } },
        { description: { $regex: searchKey.trim(), $options: "i" } },
      ];
    }

    // Date range filter (based on expense.date)
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) {
        const df = new Date(dateFrom);
        if (!isNaN(df.getTime())) query.date.$gte = df;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        if (!isNaN(dt.getTime())) {
          // include the whole day
          dt.setHours(23, 59, 59, 999);
          query.date.$lte = dt;
        }
      }
      // If both invalid, delete
      if (Object.keys(query.date).length === 0) delete query.date;
    }

    const skip = (Number(pageNo) - 1) * Number(pageCount);
    const limit = Number(pageCount);

    const sort = { [sortByField]: Number(sortByOrder) };

    const [expenses, totalCountAgg] = await Promise.all([
      Expense.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Expense.countDocuments(query),
    ]);

    // Calculate totalExpense for the returned set (or for all if pageCount = huge)
    const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    sendResponse(res, 200, "Success", {
      message: "Expenses listed",
      data: {
        expenses,
        totalCount: totalCountAgg,
        totalExpense,
        pageNo: Number(pageNo),
        pageCount: Number(pageCount),
      },
    });
  } catch (error) {
    console.error("List expense error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


expenseController.get("/summary", async (req, res) => {
  try {
    const expenses = await Expense.find().lean();

    let totalExpense = 0;
    let lastMonthExpense = 0;
    const dailyExpense = {};

    const now = new Date();
    // determine last month in numeric month/year
    const lastMonthIndex = now.getMonth() - 1;
    const correctedLastMonth = (lastMonthIndex + 12) % 12;
    const lastMonthYear = lastMonthIndex < 0 ? now.getFullYear() - 1 : now.getFullYear();

    expenses.forEach((exp) => {
      const dateObj = new Date(exp.date || exp.createdAt);
      const dateKey = dateObj.toISOString().split("T")[0];
      const amount = Number(exp.amount || 0);

      totalExpense += amount;

      if (dateObj.getMonth() === correctedLastMonth && dateObj.getFullYear() === lastMonthYear) {
        lastMonthExpense += amount;
      }

      if (!dailyExpense[dateKey]) dailyExpense[dateKey] = 0;
      dailyExpense[dateKey] += amount;
    });

    const dailyTrend = Object.entries(dailyExpense).map(([date, expense]) => ({ date, expense }));

    sendResponse(res, 200, "Success", {
      message: "Expense summary calculated successfully",
      data: {
        totalExpense,
        lastMonthExpense,
        totalCount: expenses.length,
        dailyTrend,
      },
    });
  } catch (error) {
    console.error("Expense summary error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


expenseController.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Expense.findByIdAndDelete(id);
    if (!deleted) {
      return sendResponse(res, 404, "Failed", { message: "Expense not found" });
    }
    sendResponse(res, 200, "Success", { message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


// ------------------------- 📘 Excel Download -------------------------
expenseController.get("/download/excel", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const query = {};
  
      if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) {
          const df = new Date(dateFrom);
          if (!isNaN(df.getTime())) query.date.$gte = df;
        }
        if (dateTo) {
          const dt = new Date(dateTo);
          if (!isNaN(dt.getTime())) {
            dt.setHours(23, 59, 59, 999);
            query.date.$lte = dt;
          }
        }
        if (Object.keys(query.date).length === 0) delete query.date;
      }
  
      const expenses = await Expense.find(query).sort({ date: 1 }).lean();
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Expenses");
  
      worksheet.columns = [
        { header: "S.No", key: "sno", width: 10 },
        { header: "Date", key: "date", width: 15 },
        { header: "Name", key: "name", width: 25 },
        { header: "Amount (₹)", key: "amount", width: 18 },
        { header: "Description", key: "description", width: 40 },
      ];
  
      let totalAmount = 0;
      expenses.forEach((e, index) => {
        const row = {
          sno: index + 1,
          date: new Date(e.date).toISOString().split("T")[0],
          name: e.name,
          amount: e.amount,
          description: e.description || "",
        };
        totalAmount += Number(e.amount || 0);
        worksheet.addRow(row);
      });
  
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12 };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 20;
  
      // ✅ Add Total row
      const totalRow = worksheet.addRow({
        sno: "",
        date: "",
        name: "Total",
        amount: totalAmount,
        description: "",
      });
      totalRow.font = { bold: true };
      totalRow.getCell("amount").numFmt = "₹#,##0.00";
  
      worksheet.eachRow((row) => {
        row.alignment = { vertical: "middle", horizontal: "left" };
        row.height = 18;
      });
  
      // ✅ Set borders
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });
  
      // Send file
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=expenses.xlsx");
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Expense Excel download error:", error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  
  
  
  // ------------------------- 📕 PDF Download -------------------------
expenseController.get("/download/pdf", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const query = {};
  
      if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) {
          const df = new Date(dateFrom);
          if (!isNaN(df.getTime())) query.date.$gte = df;
        }
        if (dateTo) {
          const dt = new Date(dateTo);
          if (!isNaN(dt.getTime())) {
            dt.setHours(23, 59, 59, 999);
            query.date.$lte = dt;
          }
        }
        if (Object.keys(query.date).length === 0) delete query.date;
      }
  
      const expenses = await Expense.find(query).sort({ date: 1 }).lean();
  
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=expenses.pdf");
      doc.pipe(res);
  
      // Title
      doc.fontSize(18).text("Expenses Report", { align: "center", underline: true });
      doc.moveDown(1);
  
      // Table Header
      const tableTop = doc.y;
      const columnPositions = {
        sno: 50,
        date: 90,
        name: 160,
        amount: 350,
        description: 430,
      };
  
      doc.fontSize(11).font("Helvetica-Bold");
      doc.text("S.No", columnPositions.sno, tableTop);
      doc.text("Date", columnPositions.date, tableTop);
      doc.text("Name", columnPositions.name, tableTop);
      doc.text("Amount", columnPositions.amount, tableTop);
      doc.text("Description", columnPositions.description, tableTop);
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
  
      // Table Rows
      doc.font("Helvetica").fontSize(10);
      let total = 0;
      let y = doc.y + 5;
  
      expenses.forEach((e, index) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const dateStr = new Date(e.date).toISOString().split("T")[0];
        doc.text(index + 1, columnPositions.sno, y);
        doc.text(dateStr, columnPositions.date, y);
        doc.text(e.name, columnPositions.name, y, { width: 180 });
        doc.text(`${Number(e.amount || 0).toLocaleString()}`, columnPositions.amount, y, {
          width: 60,
          align: "right",
        });
        doc.text(e.description || "-", columnPositions.description, y, { width: 120 });
  
        total += Number(e.amount || 0);
        y += 18;
      });
  
      // Draw line before total
      doc.moveTo(40, y).lineTo(550, y).stroke();
  
      // ✅ Total Row
      doc.font("Helvetica-Bold").fontSize(12);
      doc.text("Total", columnPositions.name, y + 5);
      doc.text(`${total.toLocaleString()}`, columnPositions.amount, y + 5, {
        width: 60,
        align: "right",
      });
  
      doc.end();
    } catch (error) {
      console.error("Expense PDF download error:", error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  

module.exports = expenseController;
