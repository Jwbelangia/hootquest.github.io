function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, version: "orders-v2" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = parsePayload_(e);

  if (payload.action === "createOrder") {
    return createProductRequest_(payload);
  }

  if (payload.action === "getOrderStatus") {
    return getProductRequestStatus_(payload);
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

  const invoiceNumber = generateUniqueInvoiceNumber_(sheet);

  sheet.appendRow([
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
  ]);

  return json_({
    ok: true,
    invoiceNumber: invoiceNumber,
    buildStatus: payload.buildStatus || "Build Prep Request"
  });
}

function getProductRequestStatus_(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ProductRequest");

  if (!sheet) {
    return json_({ ok: false, message: "ProductRequest sheet not found." });
  }

  const invoiceNumber = String(payload.invoiceNumber || "").trim();

  if (!invoiceNumber) {
    return json_({ ok: false, message: "Invoice number is required." });
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][9]).trim() === invoiceNumber) {
      return json_({
        ok: true,
        invoiceNumber: invoiceNumber,
        buildStatus: data[i][5] || "Build Prep Request",
        shippingLabel: data[i][6] || "",
        paymentStatus: data[i][8] || ""
      });
    }
  }

  return json_({ ok: false, message: "Order invoice number not found." });
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

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
