function doGet(e) {
  const action = e && e.parameter ? e.parameter.action || "" : "";
  const callback = e && e.parameter ? e.parameter.callback || "" : "";

  if (action === "getOrderStatus") {
    const payload = getProductRequestStatus_(e.parameter || {}, true);
    return json_(payload, callback);
  }

  return json_({ ok: true, version: "orders-v3" }, callback);
}

function doPost(e) {
  const payload = parsePayload_(e);

  if (payload.action === "createOrder") {
    return createProductRequest_(payload);
  }

  if (payload.action === "getOrderStatus") {
    return json_(getProductRequestStatus_(payload, true));
  }

  let email = "";

  if (e && e.parameter) {
    email = e.parameter.email || e.parameter.email_address || "";
  }

  if (!email && e && e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      email = body.email || body.email_address || "";
    } catch (err) {}
  }

  if (!email) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        message: "Missing email",
        parameter: e ? e.parameter : null,
        postData: e && e.postData ? e.postData.contents : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Email Collection");
  sheet.appendRow([email, new Date()]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, email: email }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createProductRequest_(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ProductRequest");

  if (!sheet) {
    return json_({ ok: false, message: "ProductRequest sheet not found." });
  }

  let invoiceNumber = String(payload.invoiceNumber || "").trim();
  let existingRow = 0;

  if (invoiceNumber) {
    existingRow = findProductRequestRow_(sheet, invoiceNumber);
  }

  if (!invoiceNumber && payload.holdOnly && payload.email) {
    const existingHold = findOpenCartHoldByEmail_(sheet, payload.email);
    if (existingHold.row > 0) {
      existingRow = existingHold.row;
      invoiceNumber = existingHold.invoiceNumber;
    }
  }

  if (!invoiceNumber) {
    invoiceNumber = generateUniqueInvoiceNumber_(sheet);
  }

  const rowValues = [
    payload.email || "",
    payload.address || "",
    payload.contact || "",
    payload.package || "",
    payload.pretaxSales || "0.00",
    payload.buildStatus || "Build Prep Request",
    payload.shippingLabel || "",
    payload.paymentMethod || "",
    payload.paymentStatus || "",
    invoiceNumber
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return json_({
    ok: true,
    invoiceNumber: invoiceNumber,
    buildStatus: payload.buildStatus || "Build Prep Request"
  });
}

function findProductRequestRow_(sheet, invoiceNumber) {
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][9]).trim() === invoiceNumber) {
      return i + 1;
    }
  }

  return 0;
}

function findOpenCartHoldByEmail_(sheet, email) {
  const data = sheet.getDataRange().getValues();
  const targetEmail = String(email || "").trim().toLowerCase();

  for (let i = data.length - 1; i >= 1; i--) {
    const rowEmail = String(data[i][0] || "").trim().toLowerCase();
    const buildStatus = String(data[i][5] || "").trim();
    const invoiceNumber = String(data[i][9] || "").trim();

    if (rowEmail === targetEmail && buildStatus === "Cart Hold Request" && invoiceNumber) {
      return {
        row: i + 1,
        invoiceNumber: invoiceNumber
      };
    }
  }

  return {
    row: 0,
    invoiceNumber: ""
  };
}

function getProductRequestStatus_(payload, returnPayloadOnly) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ProductRequest");
  let result;

  if (!sheet) {
    result = { ok: false, message: "ProductRequest sheet not found." };
    return returnPayloadOnly ? result : json_(result);
  }

  const invoiceNumber = String(payload.invoiceNumber || "").trim();

  if (!invoiceNumber) {
    result = { ok: false, message: "Invoice number is required." };
    return returnPayloadOnly ? result : json_(result);
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][9]).trim() === invoiceNumber) {
      result = {
        ok: true,
        invoiceNumber: invoiceNumber,
        buildStatus: data[i][5] || "Build Prep Request",
        shippingLabel: data[i][6] || "",
        paymentStatus: data[i][8] || ""
      };

      return returnPayloadOnly ? result : json_(result);
    }
  }

  result = { ok: false, message: "Order invoice number not found." };
  return returnPayloadOnly ? result : json_(result);
}

function generateUniqueInvoiceNumber_(sheet) {
  const data = sheet.getDataRange().getValues();
  const existing = {};

  for (let i = 1; i < data.length; i++) {
    existing[String(data[i][9]).trim()] = true;
  }

  let invoiceNumber = "";

  do {
    invoiceNumber = Utilities.getUuid().replace(/-/g, "").toUpperCase();
  } while (existing[invoiceNumber]);

  return invoiceNumber;
}

function parsePayload_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {}
  }

  return e && e.parameter ? e.parameter : {};
}

function json_(payload, callback) {
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(payload)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
