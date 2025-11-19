const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const LoanCollection = require("../model/loanCollection.schema");
const Profit = require("../model/profit.schema"); 
const loanCollectionController = express.Router();
const auth = require("../utils/auth");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

async function upsertManualProfitForLoan({ loanId, name, phone, manualProfit, createdAt }) {
  if (manualProfit === null || manualProfit === undefined) return null;
  const amount = Number(manualProfit || 0);
  if (isNaN(amount) || amount <= 0) return null;

  const title = `Manual Profit - ${name || phone || loanId}`;
  const description = `Manual profit entered for loan ${loanId} (${phone || "N/A"})`;

  // Try to find a Profit already linked to this loan (manual)
  let existing = await Profit.findOne({ loanRef: loanId });

  if (existing) {
    existing.title = title;
    existing.amount = amount;
    existing.date = createdAt || new Date();
    existing.description = description;
    await existing.save();
    return existing;
  } else {
    const prof = new Profit({
      title,
      amount,
      date: createdAt || new Date(),
      description,
      loanRef: loanId,
    });
    await prof.save();
    return prof;
  }
}

loanCollectionController.post("/create", async (req, res) => {
  try {
    const data = req.body;

    // Add defaults / calculations
    data.remainingLoan = data.loanAmount;
    data.totalDueInstallments = Math.ceil(
      data.loanAmount / data.perDayCollection
    );

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + parseInt(data.daysForLoan || 0));
    data.loanStartDate = startDate;
    data.loanEndDate = endDate;

    // Normalize loanType if provided
    if (data.loanType) {
      data.loanType = String(data.loanType).toLowerCase() === "renew" ? "renew" : "new";
    } else {
      data.loanType = "new";
    }

    // ensure manualProfit is either null or a number
    if (data.manualProfit === "" || data.manualProfit === undefined) data.manualProfit = null;
    if (data.manualProfit !== null) data.manualProfit = Number(data.manualProfit);

    const loanCreated = await LoanCollection.create(data);

    // If manualProfit provided, create/attach a Profit entry and DO NOT treat this loan for auto-profit
    if (loanCreated.manualProfit && Number(loanCreated.manualProfit) > 0) {
      await upsertManualProfitForLoan({
        loanId: loanCreated._id,
        name: loanCreated.name,
        phone: loanCreated.phone,
        manualProfit: loanCreated.manualProfit,
        createdAt: loanCreated.createdAt,
      });
    }

    sendResponse(res, 200, "Success", {
      message: "Loan created successfully!",
      data: loanCreated,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField = "createdAt",
      sortByOrder = "desc",
      fromDate,
      toDate,
    } = req.body;

    const query = {};

    // Filter by status
    if (status) query.status = status;

    // Filter by search
    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { phone: { $regex: searchKey, $options: "i" } },
        { referenceBy: { $regex: searchKey, $options: "i" } },
      ];
    }

    // ✅ Strict date range filter: only loans fully inside the range
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999); // include the entire end day

      query.$and = [
        { loanStartDate: { $gte: start } },
        { loanEndDate: { $lte: end } },
      ];
    } else if (fromDate) {
      const start = new Date(fromDate);
      query.loanStartDate = { $gte: start };
    } else if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      query.loanEndDate = { $lte: end };
    }

    const sortOption = { [sortByField]: sortByOrder === "asc" ? 1 : -1 };

    const loanList = await LoanCollection.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount))
      .lean();

    const totalCount = await LoanCollection.countDocuments(query);

    // ✅ Include start & end date for each loan
    const loanData = loanList.map((loan) => ({
      ...loan,
      loanStartDate: loan.loanStartDate
        ? new Date(loan.loanStartDate).toISOString().split("T")[0]
        : null,
      loanEndDate: loan.loanEndDate
        ? new Date(loan.loanEndDate).toISOString().split("T")[0]
        : null,
    }));

    sendResponse(res, 200, "Success", {
      message: "Loan list fetched successfully!",
      data: loanData,
      total: totalCount,
    });
  } catch (error) {
    console.error("Loan list error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.get("/details/:id", async (req, res) => {
  try {
    const loan = await LoanCollection.findById(req.params.id);
    if (!loan)
      return sendResponse(res, 404, "Failed", { message: "Loan not found" });

    sendResponse(res, 200, "Success", {
      message: "Loan details fetched successfully!",
      data: loan,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    if (!id) {
      return sendResponse(res, 400, "Failed", { message: "Loan ID missing" });
    }

    const { _id, createdAt, updatedAt, ...updateData } = req.body;

    const existingLoan = await LoanCollection.findById(id);
    if (!existingLoan) {
      return sendResponse(res, 404, "Failed", { message: "Loan not found" });
    }

    let shouldRecalculate = false;

    if (
      updateData.loanAmount !== undefined &&
      updateData.loanAmount !== existingLoan.loanAmount
    )
      shouldRecalculate = true;

    if (
      updateData.perDayCollection !== undefined &&
      updateData.perDayCollection !== existingLoan.perDayCollection
    )
      shouldRecalculate = true;

    if (
      updateData.daysForLoan !== undefined &&
      updateData.daysForLoan !== existingLoan.daysForLoan
    )
      shouldRecalculate = true;

    if (shouldRecalculate) {
      const newLoanAmount = updateData.loanAmount ?? existingLoan.loanAmount;
      const newPerDayCollection =
        updateData.perDayCollection ?? existingLoan.perDayCollection;
      const newDaysForLoan = updateData.daysForLoan ?? existingLoan.daysForLoan;

      const totalPaidLoan = existingLoan.totalPaidLoan || 0;
      updateData.remainingLoan = Math.max(newLoanAmount - totalPaidLoan, 0);

      if (updateData.remainingLoan <= 0) {
        updateData.totalDueInstallments = 0;
        updateData.status = "Closed";
      } else {
        updateData.totalDueInstallments = Math.ceil(
          updateData.remainingLoan / newPerDayCollection
        );
      }

      const startDate = existingLoan.loanStartDate || new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(newDaysForLoan));
      updateData.loanEndDate = endDate;
    }

    // Normalize loanType & manualProfit
    if (updateData.loanType) {
      updateData.loanType = String(updateData.loanType).toLowerCase() === "renew" ? "renew" : "new";
    }

    if (updateData.manualProfit === "" || updateData.manualProfit === undefined) {
      // keep as is or null
      updateData.manualProfit = updateData.manualProfit ?? existingLoan.manualProfit;
    } else {
      updateData.manualProfit = Number(updateData.manualProfit);
    }

    const updatedLoan = await LoanCollection.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    // If manualProfit present -> upsert profit record (and this will ensure profitController won't count auto profit)
    if (updatedLoan && updatedLoan.manualProfit && Number(updatedLoan.manualProfit) > 0) {
      await upsertManualProfitForLoan({
        loanId: updatedLoan._id,
        name: updatedLoan.name,
        phone: updatedLoan.phone,
        manualProfit: updatedLoan.manualProfit,
        createdAt: updatedLoan.updatedAt || new Date(),
      });
    }

    sendResponse(res, 200, "Success", {
      message: "Loan updated successfully!",
      data: updatedLoan,
    });
  } catch (error) {
    console.error("Update loan error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.delete("/delete/:id", async (req, res) => {
  try {
    const loan = await LoanCollection.findById(req.params.id);
    if (!loan)
      return sendResponse(res, 404, "Failed", { message: "Loan not found" });

    // Remove any linked manual profit as well
    await Profit.deleteMany({ loanRef: loan._id });

    await LoanCollection.findByIdAndDelete(req.params.id);
    sendResponse(res, 200, "Success", {
      message: "Loan deleted successfully!",
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.post("/addInstallment/:id", async (req, res) => {
  try {
    const { installAmount } = req.body;
    const { id } = req.params;

    const loan = await LoanCollection.findById(id);
    if (!loan)
      return sendResponse(res, 404, "Failed", { message: "Loan not found" });

    // ✅ Check: prevent paying more than remaining loan
    if (installAmount > loan.remainingLoan) {
      return sendResponse(res, 400, "Failed", {
        message: `The entered installment amount ₹${installAmount} is higher than the remaining loan balance of ₹${loan.remainingLoan}. Please enter an amount up to ₹${loan.remainingLoan}.`,
      });
    }

    // ✅ Add installment to history
    loan.installments.push({
      installAmount,
      remainingAfterInstallment: Math.max(
        loan.remainingLoan - installAmount,
        0
      ),
      date: new Date(),
    });

    // ✅ Update totals
    loan.totalPaidLoan += installAmount;
    loan.remainingLoan = Math.max(loan.loanAmount - loan.totalPaidLoan, 0);
    loan.totalPaidInstallments += 1;

    // ✅ Calculate remaining due installments
    if (loan.remainingLoan <= 0) {
      loan.totalDueInstallments = 0;
      loan.status = "Closed";
    } else {
      const remainingDues = Math.ceil(
        loan.remainingLoan / loan.perDayCollection
      );
      loan.totalDueInstallments = Math.max(remainingDues, 0);
    }

    const updatedLoan = await loan.save();

    sendResponse(res, 200, "Success", {
      message: "Installment added successfully!",
      data: updatedLoan,
    });
  } catch (error) {
    console.error("Add installment error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.post("/addNewLoanForExisting", async (req, res) => {
  try {
    const {
      phone,
      loanAmount,
      perDayCollection,
      daysForLoan,
      givenAmount,
      loanStartDate,
      loanEndDate,
      remainingLoan,
      totalPaidLoan,
      totalPaidInstallments,
      totalDueInstallments,
      status,
      manualProfit,
      loanType,
    } = req.body;

    if (!phone) {
      return sendResponse(res, 400, "Failed", {
        message: "Phone number is required.",
      });
    }

    const existingLoan = await LoanCollection.findOne({ phone }).sort({
      createdAt: -1,
    });

    if (!existingLoan) {
      return sendResponse(res, 404, "Failed", {
        message: "No customer found with this phone number.",
      });
    }

    existingLoan.loanAmount = loanAmount ?? existingLoan.loanAmount;
    existingLoan.perDayCollection = perDayCollection ?? existingLoan.perDayCollection;
    existingLoan.daysForLoan = daysForLoan ?? existingLoan.daysForLoan;
    existingLoan.givenAmount = givenAmount ?? existingLoan.givenAmount;
    existingLoan.loanStartDate = loanStartDate ? new Date(loanStartDate) : new Date();
    existingLoan.loanEndDate = loanEndDate ? new Date(loanEndDate) : null;

    existingLoan.remainingLoan = remainingLoan ?? loanAmount ?? existingLoan.remainingLoan;
    existingLoan.totalPaidLoan = totalPaidLoan ?? 0;
    existingLoan.totalPaidInstallments = totalPaidInstallments ?? 0;
    existingLoan.totalDueInstallments = totalDueInstallments ?? 0;
    existingLoan.status = status || "Open";

    // New fields
    existingLoan.manualProfit = manualProfit ?? existingLoan.manualProfit;
    existingLoan.loanType = loanType ? String(loanType).toLowerCase() : existingLoan.loanType;

    const updatedLoan = await existingLoan.save();

    // upsert manual profit if provided
    if (updatedLoan.manualProfit && Number(updatedLoan.manualProfit) > 0) {
      await upsertManualProfitForLoan({
        loanId: updatedLoan._id,
        name: updatedLoan.name,
        phone: updatedLoan.phone,
        manualProfit: updatedLoan.manualProfit,
        createdAt: updatedLoan.updatedAt || new Date(),
      });
    }

    sendResponse(res, 200, "Success", {
      message: "New loan details overwritten successfully. Previous installment history retained.",
      data: updatedLoan,
    });
  } catch (error) {
    console.error("Add new loan overwrite error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.get("/history/:id", async (req, res) => {
  try {
    const loan = await LoanCollection.findById(req.params.id).lean();
    if (!loan)
      return sendResponse(res, 404, "Failed", { message: "Loan not found" });

    const history = loan.installments.map((inst) => ({
      date: inst.date,
      amountPaid: inst.installAmount,
      remainingAfterInstallment: inst.remainingAfterInstallment,
    }));

    sendResponse(res, 200, "Success", {
      message: "Loan payment history fetched successfully!",
      data: {
        name: loan.name,
        phone: loan.phone,
        totalLoan: loan.loanAmount,
        remainingLoan: loan.remainingLoan,
        loanStartDate: loan.loanStartDate,
        loanEndDate: loan.loanEndDate,
        totalPaidLoan: loan.totalPaidLoan,
        history,
      },
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.get("/download/excel", async (req, res) => {
  try {
    // fields: comma-separated list of field keys to include, or 'all'
    const fieldsParam = req.query.fields || "all"; // e.g. name,phone,loanAmount
    const fields = fieldsParam === "all" ? null : fieldsParam.split(",").map(f => f.trim());

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Loans");

    // map of allowed fields to header labels and keys
    const allowed = {
      name: { header: "Name", key: "name", width: 20 },
      phone: { header: "Phone", key: "phone", width: 15 },
      loanAmount: { header: "Loan", key: "loanAmount", width: 12 },
      givenAmount: { header: "Given", key: "givenAmount", width: 12 },
      perDayCollection: { header: "Per Day", key: "perDayCollection", width: 12 },
      daysForLoan: { header: "Days", key: "daysForLoan", width: 10 },
      totalDueInstallments: { header: "Due Inst.", key: "totalDueInstallments", width: 12 },
      totalPaidInstallments: { header: "Paid Inst.", key: "totalPaidInstallments", width: 12 },
      totalPaidLoan: { header: "Paid Loan", key: "totalPaidLoan", width: 12 },
      remainingLoan: { header: "Remaining", key: "remainingLoan", width: 12 },
      adharCard: { header: "Aadhaar", key: "adharCard", width: 18 },
      panCard: { header: "PAN", key: "panCard", width: 18 },
      referenceBy: { header: "Reference", key: "referenceBy", width: 18 },
      status: { header: "Status", key: "status", width: 10 },
      loanType: { header: "Loan Type", key: "loanType", width: 10 },
      manualProfit: { header: "Manual Profit", key: "manualProfit", width: 12 },
    };

    const loans = await LoanCollection.find().lean();

    // Build columns based on selection
    let columns = [];
    if (!fields) {
      // all allowed fields plus an index at front
      columns = [{ header: "#", key: "index", width: 5 }, ...Object.values(allowed)];
    } else {
      columns = [{ header: "#", key: "index", width: 5 }, ...fields.map(f => allowed[f]).filter(Boolean)];
    }

    worksheet.columns = columns;

    loans.forEach((loan, index) => {
      const rowObj = { index: index + 1 };
      // populate only selected keys
      columns.slice(1).forEach(col => {
        if (!col) return;
        const k = col.key;
        if (k === "manualProfit") rowObj[k] = loan.manualProfit ?? "-";
        else if (k === "loanType") rowObj[k] = loan.loanType ?? "-";
        else rowObj[k] = loan[k] ?? (typeof loan[k] === "number" ? 0 : "-");
      });
      worksheet.addRow(rowObj);
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=loans.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.get("/download/pdf", async (req, res) => {
  try {
    const fieldsParam = req.query.fields || "all";
    const fields = fieldsParam === "all" ? null : fieldsParam.split(",").map(f => f.trim());

    const loans = await LoanCollection.find().lean();

    // choose columns like excel
    const allowed = {
      name: "Name",
      phone: "Phone",
      loanAmount: "Loan",
      givenAmount: "Given",
      perDayCollection: "Per Day",
      daysForLoan: "Days",
      totalDueInstallments: "Due Inst.",
      totalPaidInstallments: "Paid Inst.",
      totalPaidLoan: "Paid Loan",
      remainingLoan: "Remaining",
      adharCard: "Aadhaar",
      panCard: "PAN",
      referenceBy: "Reference",
      status: "Status",
      loanType: "Loan Type",
      manualProfit: "Manual Profit",
    };

    const keys = fields ? fields.filter(k => allowed[k]) : Object.keys(allowed);
    const colTitles = ["#"].concat(keys.map(k => allowed[k]));

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=loan_collection.pdf");
    doc.pipe(res);

    doc.fontSize(18).font("Helvetica-Bold").text("Loan Collection Report", { align: "center" });
    doc.moveDown(1);

    // Draw headers simple horizontal table
    const startX = 40;
    let x = startX;
    const colW = Math.floor((doc.page.width - 2 * startX) / (colTitles.length)); // rough width
    doc.fontSize(10).font("Helvetica-Bold");
    colTitles.forEach(title => {
      doc.text(title, x, doc.y, { width: colW, align: "left" });
      x += colW;
    });

    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(9);

    let y = doc.y;
    loans.forEach((loan, idx) => {
      if (y > doc.page.height - 80) {
        doc.addPage({ margin: 40, size: "A4", layout: "landscape" });
        y = 60;
      }
      x = startX;
      doc.text(String(idx + 1), x, y, { width: colW });
      x += colW;
      keys.forEach(k => {
        let textVal = "-";
        if (k === "manualProfit") textVal = loan.manualProfit != null ? String(loan.manualProfit) : "-";
        else if (k === "loanType") textVal = loan.loanType || "-";
        else textVal = loan[k] != null ? String(loan[k]) : "-";
        doc.text(textVal, x, y, { width: colW });
        x += colW;
      });
      y += 18;
    });

    doc.end();
  } catch (error) {
    console.error("PDF download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.get("/profit", async (req, res) => {
  try {
    const loans = await LoanCollection.find().lean();

    let totalProfit = 0;
    let lastMonthProfit = 0;
    const dailyProfit = {};

    const now = new Date();
    const lastMonth = now.getMonth() - 1;
    const lastMonthYear = now.getFullYear() - (lastMonth < 0 ? 1 : 0);
    const correctedLastMonth = (lastMonth + 12) % 12;

    loans.forEach((loan) => {
      const createdAt = new Date(loan.createdAt);
      const dateKey = createdAt.toISOString().split("T")[0];

      const profit = (loan.loanAmount || 0) - (loan.givenAmount || 0);

      totalProfit += profit;

      // Profit for last month
      if (
        createdAt.getMonth() === correctedLastMonth &&
        createdAt.getFullYear() === lastMonthYear
      ) {
        lastMonthProfit += profit;
      }

      if (!dailyProfit[dateKey]) dailyProfit[dateKey] = 0;
      dailyProfit[dateKey] += profit;
    });

    const result = Object.entries(dailyProfit).map(([date, profit]) => ({
      date,
      profit,
    }));

    sendResponse(res, 200, "Success", {
      message: "Daily profit calculated successfully!",
      data: {
        totalProfit,
        lastMonthProfit,
        totalLoans: loans.length,
        dailyTrend: result,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Profit calc error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.get("/expense", async (req, res) => {
  try {
    const loans = await LoanCollection.find().lean();

    const dailyExpense = {};

    loans.forEach((loan) => {
      const dateKey = new Date(loan.createdAt).toISOString().split("T")[0];
      const expense = loan.givenAmount || 0;

      if (!dailyExpense[dateKey]) dailyExpense[dateKey] = 0;
      dailyExpense[dateKey] += expense;
    });

    const result = Object.entries(dailyExpense).map(([date, expense]) => ({
      date,
      expense,
    }));

    sendResponse(res, 200, "Success", {
      message: "Daily expense calculated successfully!",
      data: result,
    });
  } catch (error) {
    console.error("Expense calc error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ------------------------- 📘 Excel Download -------------------------
loanCollectionController.get("/download/profit/excel", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const query = {};

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        const df = new Date(dateFrom);
        if (!isNaN(df.getTime())) query.createdAt.$gte = df;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        if (!isNaN(dt.getTime())) {
          dt.setHours(23, 59, 59, 999);
          query.createdAt.$lte = dt;
        }
      }
      if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
    }

    const loans = await LoanCollection.find(query).lean();

    // Calculate daily profit
    const dailyProfit = {};
    loans.forEach((loan) => {
      const dateKey = new Date(loan.createdAt).toISOString().split("T")[0];
      const profit = (loan.loanAmount || 0) - (loan.givenAmount || 0);
      if (!dailyProfit[dateKey]) dailyProfit[dateKey] = 0;
      dailyProfit[dateKey] += profit;
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Daily Profit");

    worksheet.columns = [
      { header: "S.No", key: "sno", width: 10 },
      { header: "Date", key: "date", width: 20 },
      { header: "Profit", key: "profit", width: 20 },
    ];

    let totalProfit = 0;
    Object.entries(dailyProfit).forEach(([date, profit], index) => {
      totalProfit += profit;
      worksheet.addRow({ sno: index + 1, date, profit });
    });

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 20;

    // ✅ Add Total row
    const totalRow = worksheet.addRow({
      sno: "",
      date: "Total",
      profit: totalProfit,
    });
    totalRow.font = { bold: true };

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
    res.setHeader("Content-Disposition", "attachment; filename=profit.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Profit Excel download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ------------------------- 📕 PDF Download -------------------------
loanCollectionController.get("/download/profit/pdf", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const query = {};

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        const df = new Date(dateFrom);
        if (!isNaN(df.getTime())) query.createdAt.$gte = df;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        if (!isNaN(dt.getTime())) {
          dt.setHours(23, 59, 59, 999);
          query.createdAt.$lte = dt;
        }
      }
      if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
    }

    const loans = await LoanCollection.find(query).lean();

    // Calculate daily profit
    const dailyProfit = {};
    loans.forEach((loan) => {
      const dateKey = new Date(loan.createdAt).toISOString().split("T")[0];
      const profit = (loan.loanAmount || 0) - (loan.givenAmount || 0);
      if (!dailyProfit[dateKey]) dailyProfit[dateKey] = 0;
      dailyProfit[dateKey] += profit;
    });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=profit.pdf");
    doc.pipe(res);

    // Title
    doc
      .fontSize(18)
      .text("Daily Profit Report", { align: "center", underline: true });
    doc.moveDown(1);

    // Table Header
    const tableTop = doc.y;
    const columnPositions = {
      sno: 80,
      date: 120,
      profit: 300,
    };

    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("S.No", columnPositions.sno, tableTop);
    doc.text("Date", columnPositions.date, tableTop);
    doc.text("Profit", columnPositions.profit, tableTop);
    doc.moveDown(0.5);
    doc.moveTo(60, doc.y).lineTo(500, doc.y).stroke();

    // Table Rows
    doc.font("Helvetica").fontSize(10);
    let total = 0;
    let y = doc.y + 5;

    Object.entries(dailyProfit).forEach(([date, profit], index) => {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }
      doc.text(index + 1, columnPositions.sno, y);
      doc.text(date, columnPositions.date, y);
      doc.text(`${profit.toLocaleString()}`, columnPositions.profit, y, {
        width: 60,
        align: "right",
      });
      total += profit;
      y += 18;
    });

    // Draw line before total
    doc.moveTo(60, y).lineTo(500, y).stroke();

    // ✅ Total Row
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Total", columnPositions.date, y + 5);
    doc.text(`${total.toLocaleString()}`, columnPositions.profit, y + 5, {
      width: 60,
      align: "right",
    });

    doc.end();
  } catch (error) {
    console.error("Profit PDF download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.get("/download/expense/excel", async (req, res) => {
  try {
    const loans = await LoanCollection.find().lean();

    const dailyExpense = {};
    loans.forEach((loan) => {
      const dateKey = new Date(loan.createdAt).toISOString().split("T")[0];
      const expense = loan.givenAmount || 0;
      if (!dailyExpense[dateKey]) dailyExpense[dateKey] = 0;
      dailyExpense[dateKey] += expense;
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Daily Expense");

    worksheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Expense (₹)", key: "expense", width: 15 },
    ];

    Object.entries(dailyExpense).forEach(([date, expense]) => {
      worksheet.addRow({ date, expense });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=expense.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Expense Excel download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

loanCollectionController.get("/download/expense/pdf", async (req, res) => {
  try {
    const loans = await LoanCollection.find().lean();

    const dailyExpense = {};
    loans.forEach((loan) => {
      const dateKey = new Date(loan.createdAt).toISOString().split("T")[0];
      const expense = loan.givenAmount || 0;
      if (!dailyExpense[dateKey]) dailyExpense[dateKey] = 0;
      dailyExpense[dateKey] += expense;
    });

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=expense.pdf");
    doc.pipe(res);

    doc.fontSize(18).text("Daily Expense Report", { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(10).text("Date", 80, doc.y, { continued: true });
    doc.text("Expense (₹)", 300);
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    Object.entries(dailyExpense).forEach(([date, expense]) => {
      doc.moveDown(0.5);
      doc.fontSize(10).text(date, 80, doc.y, { continued: true });
      doc.text(expense.toFixed(2), 300);
    });

    doc.end();
  } catch (error) {
    console.error("Expense PDF download error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = loanCollectionController;
