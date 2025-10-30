const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const LoanCollection = require("../model/loanCollection.schema");
const loanCollectionController = express.Router();
const auth = require("../utils/auth");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

loanCollectionController.post("/create", async (req, res) => {
  try {
    const data = req.body;

    // Auto calculate remainingLoan and due installments
    data.remainingLoan = data.loanAmount;
    data.totalDueInstallments = Math.ceil(
      data.loanAmount / data.perDayCollection
    );

    // Calculate loanEndDate
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + parseInt(data.daysForLoan));
    data.loanStartDate = startDate;
    data.loanEndDate = endDate;

    const loanCreated = await LoanCollection.create(data);
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

    // ✅ Filter by date range (loanStartDate)
    if (fromDate && toDate) {
      query.loanStartDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    } else if (fromDate) {
      query.loanStartDate = { $gte: new Date(fromDate) };
    } else if (toDate) {
      query.loanStartDate = { $lte: new Date(toDate) };
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

    // Remove immutable fields
    const { _id, createdAt, updatedAt, ...updateData } = req.body;

    // Fetch the existing loan
    const existingLoan = await LoanCollection.findById(id);
    if (!existingLoan) {
      return sendResponse(res, 404, "Failed", { message: "Loan not found" });
    }

    // --- Recalculate fields if relevant values changed ---
    let shouldRecalculate = false;

    // Detect if loanAmount or perDayCollection or daysForLoan changed
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

    // ✅ Recalculate dependent fields if needed
    if (shouldRecalculate) {
      const newLoanAmount = updateData.loanAmount ?? existingLoan.loanAmount;
      const newPerDayCollection =
        updateData.perDayCollection ?? existingLoan.perDayCollection;
      const newDaysForLoan = updateData.daysForLoan ?? existingLoan.daysForLoan;

      // Keep already paid amount
      const totalPaidLoan = existingLoan.totalPaidLoan || 0;

      // Recalculate remaining loan
      updateData.remainingLoan = Math.max(newLoanAmount - totalPaidLoan, 0);

      // Recalculate due installments
      if (updateData.remainingLoan <= 0) {
        updateData.totalDueInstallments = 0;
        updateData.status = "Closed";
      } else {
        updateData.totalDueInstallments = Math.ceil(
          updateData.remainingLoan / newPerDayCollection
        );
      }

      // Recalculate loan end date (from loanStartDate + daysForLoan)
      const startDate = existingLoan.loanStartDate || new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(newDaysForLoan));
      updateData.loanEndDate = endDate;
    }

    // ✅ Update the loan
    const updatedLoan = await LoanCollection.findByIdAndUpdate(id, updateData, {
      new: true,
    });

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
      // Calculate remaining dues based on perDayCollection
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
      newLoanAmount,
      loanAmount,
      perDayCollection,
      daysForLoan,
      givenAmount,
      addDueInstallments,
    } = req.body;

    const effectiveLoanAmount = Number(newLoanAmount ?? loanAmount ?? 0);
    const numPerDayCollection = Number(perDayCollection ?? 0);
    const numDaysForLoan = Number(daysForLoan ?? 0);
    const numGivenAmount = Number(givenAmount ?? 0);
    const numAddDueInst =
      typeof addDueInstallments !== "undefined"
        ? Number(addDueInstallments)
        : null; 

    if (!phone || !effectiveLoanAmount || !numPerDayCollection) {
      return sendResponse(res, 400, "Failed", {
        message:
          "Missing required fields (phone, loanAmount/newLoanAmount, perDayCollection).",
      });
    }

    // Find latest loan for this phone
    const existingLoan = await LoanCollection.findOne({ phone }).sort({
      createdAt: -1,
    });

    if (!existingLoan) {
      return sendResponse(res, 404, "Failed", {
        message: "No customer found with this phone number.",
      });
    }

    // Prepare dates for the new piece
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + numDaysForLoan);

    // CASE: previous loan CLOSED -> start fresh cycle
    if (existingLoan.status === "Closed") {
      existingLoan.loanAmount = effectiveLoanAmount;
      existingLoan.givenAmount = numGivenAmount;
      existingLoan.perDayCollection = numPerDayCollection;
      existingLoan.daysForLoan = numDaysForLoan;
      existingLoan.loanStartDate = startDate;
      existingLoan.loanEndDate = endDate;

      existingLoan.remainingLoan = effectiveLoanAmount;
      existingLoan.totalPaidLoan = 0;
      existingLoan.totalPaidInstallments = 0;
      existingLoan.totalDueInstallments = Math.ceil(
        effectiveLoanAmount / numPerDayCollection
      );
      existingLoan.status = "Open";
      existingLoan.installments = [];

      const updatedLoan = await existingLoan.save();
      return sendResponse(res, 200, "Success", {
        message: "Existing closed loan renewed successfully!",
        data: updatedLoan,
      });
    }

    if (existingLoan.status === "Open") {
      const oldLoanAmount = Number(existingLoan.loanAmount || 0);
      const oldGivenAmount = Number(existingLoan.givenAmount || 0);
      const oldRemainingLoan = Number(existingLoan.remainingLoan || 0);
      const oldTotalPaidLoan = Number(existingLoan.totalPaidLoan || 0);
      const oldTotalPaidInstallments = Number(
        existingLoan.totalPaidInstallments || 0
      );
      const oldTotalDueInstallments = Number(
        existingLoan.totalDueInstallments || 0
      );
      const oldDaysForLoan = Number(existingLoan.daysForLoan || 0);

      const newLoanAmountNumber = effectiveLoanAmount; 
      const combinedLoanAmount = oldLoanAmount + newLoanAmountNumber;
      const combinedGivenAmount = oldGivenAmount + numGivenAmount;

      const combinedRemainingLoan = oldRemainingLoan + newLoanAmountNumber;

      const combinedDaysForLoan = oldDaysForLoan + numDaysForLoan;


      let finalTotalDueInstallments = oldTotalDueInstallments;

      if (oldTotalDueInstallments <= 0) {
        finalTotalDueInstallments = Math.ceil(
          newLoanAmountNumber / numPerDayCollection
        );
      } else {
        const computedDueFromRemaining = Math.ceil(
          combinedRemainingLoan / numPerDayCollection
        );
        finalTotalDueInstallments = Math.max(
          oldTotalDueInstallments,
          computedDueFromRemaining
        );
      }

      existingLoan.loanAmount = combinedLoanAmount;
      existingLoan.givenAmount = combinedGivenAmount;
      existingLoan.perDayCollection = numPerDayCollection;
      existingLoan.daysForLoan = combinedDaysForLoan;
      existingLoan.loanStartDate = startDate;
      // recompute loanEndDate from start + combinedDaysForLoan
      const newEnd = new Date(startDate);
      newEnd.setDate(startDate.getDate() + combinedDaysForLoan);
      existingLoan.loanEndDate = newEnd;

      existingLoan.totalPaidLoan = oldTotalPaidLoan;
      existingLoan.totalPaidInstallments = oldTotalPaidInstallments;
      existingLoan.remainingLoan = combinedRemainingLoan;
      existingLoan.totalDueInstallments = finalTotalDueInstallments;
      existingLoan.status = "Open";

      const updatedLoan = await existingLoan.save();

      return sendResponse(res, 200, "Success", {
        message: "New loan amount added — dues and days merged successfully!",
        data: updatedLoan,
      });
    }

    // fallback (shouldn't reach here)
    return sendResponse(res, 400, "Failed", {
      message: "Unable to process addNewLoanForExisting for this record.",
    });
  } catch (error) {
    console.error("Add new loan error:", error);
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
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Loans");

    // Define columns
    worksheet.columns = [
      { header: "#", key: "index", width: 5 },
      { header: "Name", key: "name", width: 20 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Loan", key: "loanAmount", width: 12 },
      { header: "Given", key: "givenAmount", width: 12 },
      { header: "Per Day", key: "perDayCollection", width: 12 },
      { header: "Days", key: "daysForLoan", width: 10 },
      { header: "Due Inst.", key: "totalDueInstallments", width: 12 },
      { header: "Paid Inst.", key: "totalPaidInstallments", width: 12 },
      { header: "Paid Loan", key: "totalPaidLoan", width: 12 },
      { header: "Remaining", key: "remainingLoan", width: 12 },
      { header: "Aadhaar", key: "adharCard", width: 18 },
      { header: "PAN", key: "panCard", width: 18 },
      { header: "Reference", key: "referenceBy", width: 18 },
      { header: "Status", key: "status", width: 10 },
    ];

    // Fetch all loans
    const loans = await LoanCollection.find().lean();

    loans.forEach((loan, index) => {
      worksheet.addRow({
        index: index + 1,
        name: loan.name,
        phone: loan.phone,
        loanAmount: loan.loanAmount || 0,
        givenAmount: loan.givenAmount || 0,
        perDayCollection: loan.perDayCollection || 0,
        daysForLoan: loan.daysForLoan || "-",
        totalDueInstallments: loan.totalDueInstallments || "-",
        totalPaidInstallments: loan.totalPaidInstallments || 0,
        totalPaidLoan: loan.totalPaidLoan || 0,
        remainingLoan: loan.remainingLoan || 0,
        adharCard: loan.adharCard || "-",
        panCard: loan.panCard || "-",
        referenceBy: loan.referenceBy || "-",
        status: loan.status || "Open",
      });
    });

    // Set header styles
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };

    // Write Excel to buffer and send
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
    const PDFDocument = require("pdfkit");

    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
      layout: "landscape",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=loan_collection.pdf"
    );

    // Pipe to response first
    doc.pipe(res);

    // Title
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Loan Collection Report", { align: "center" });
    doc.moveDown(1.5);

    // Fetch loans
    const loans = await LoanCollection.find().lean();

    // Define columns (same as Excel)
    const colTitles = [
      "#",
      "Name",
      "Phone",
      "Loan",
      "Given",
      "Per Day",
      "Days",
      "Due Inst.",
      "Paid Inst.",
      "Paid Loan",
      "Remaining",
      "Aadhaar",
      "PAN",
      "Reference",
      "Status",
    ];

    // Adjusted column widths to fit exactly in A4 landscape (≈ 782pt usable)
    const colWidths = [
      25, // #
      80, // Name
      70, // Phone
      53, // Loan
      40, // Given
      40, // Per Day
      30, // Days
      50, // Due Inst.
      50, // Paid Inst.
      50, // Paid Loan
      60, // Remaining
      70, // Aadhaar
      60, // PAN
      60, // Reference
      50, // Status
    ];

    const xStart = 30;
    const usableWidth = colWidths.reduce((a, b) => a + b, 0);
    let tableTop = 90;

    // Helper: draw single row
    const drawRow = (y, row, isHeader = false) => {
      let x = xStart;
      row.forEach((text, i) => {
        const width = colWidths[i];
        const height = 20;

        // Border box
        doc.rect(x, y - 5, width, height).stroke();

        if (isHeader) {
          doc
            .rect(x, y - 5, width, height)
            .fill("#f0f0f0")
            .stroke();
          doc.font("Helvetica-Bold").fontSize(8);
        } else {
          doc.font("Helvetica").fontSize(7);
        }

        // Text inside
        doc.fillColor("#000").text(String(text), x + 3, y, {
          width: width - 6,
          align: "left",
        });

        x += width;
      });
    };

    // Draw header
    drawRow(tableTop, colTitles, true);
    let y = tableTop + 23;

    // Draw table rows
    loans.forEach((loan, index) => {
      // New page if overflow
      if (y > 560) {
        doc.addPage({ margin: 30, size: "A4", layout: "landscape" });
        drawRow(50, colTitles, true);
        y = 73;
      }

      const row = [
        index + 1,
        loan.name || "-",
        loan.phone || "-",
        loan.loanAmount ?? 0,
        loan.givenAmount ?? 0,
        loan.perDayCollection ?? 0,
        loan.daysForLoan ?? "-",
        loan.totalDueInstallments ?? "-",
        loan.totalPaidInstallments ?? 0,
        loan.totalPaidLoan ?? 0,
        loan.remainingLoan ?? 0,
        loan.adharCard || "-",
        loan.panCard || "-",
        loan.referenceBy || "-",
        loan.status || "Open",
      ];

      drawRow(y, row);
      y += 20;
    });

    // Footer (optional)
    // doc.moveDown(2);
    // doc.fontSize(8).fillColor("#555").text(
    //   `Generated on: ${new Date().toLocaleString()}`,
    //   { align: "right" }
    // );

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
      const dateKey = new Date(loan.createdAt)
        .toISOString()
        .split("T")[0];
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


loanCollectionController.get("/download/profit/excel", async (req, res) => {
  try {
    const loans = await LoanCollection.find().lean();

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
      { header: "Date", key: "date", width: 20 },
      { header: "Profit (₹)", key: "profit", width: 15 },
    ];

    Object.entries(dailyProfit).forEach(([date, profit]) => {
      worksheet.addRow({ date, profit });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };

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


loanCollectionController.get("/download/profit/pdf", async (req, res) => {
  try {
    const loans = await LoanCollection.find().lean();

    const dailyProfit = {};
    loans.forEach((loan) => {
      const dateKey = new Date(loan.createdAt).toISOString().split("T")[0];
      const profit = (loan.loanAmount || 0) - (loan.givenAmount || 0);
      if (!dailyProfit[dateKey]) dailyProfit[dateKey] = 0;
      dailyProfit[dateKey] += profit;
    });

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=profit.pdf");
    doc.pipe(res);

    doc.fontSize(18).text("Daily Profit Report", { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(10).text("Date", 80, doc.y, { continued: true });
    doc.text("Profit (₹)", 300);
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    Object.entries(dailyProfit).forEach(([date, profit]) => {
      doc.moveDown(0.5);
      doc.fontSize(10).text(date, 80, doc.y, { continued: true });
      doc.text(profit.toFixed(2), 300);
    });

    doc.end();
  } catch (error) {
    console.error("Profit PDF download error:", error);
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
