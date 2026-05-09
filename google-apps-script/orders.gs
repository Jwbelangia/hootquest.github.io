function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, version: "orders-v1" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var payload = parsePayload_(e);
  var action = payload.action || "";

  if (action === "createOrder") {
    return createOrder_(payload);
  }

  if (action === "getOrderStatus") {
    return getOrderStatus_(payload);
  }

  if (payload.email || payload.email_address) {
    return saveNewsletter_(payload);
  }

  return json_({ ok: false, message: "Unknown action." });
}

function createOrder_(payload) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");

  if (!sheet) {
    return json_({ ok: false, message: "Orders sheet not found." });
  }

  var invoiceNumber = generateUniqueInvoiceNumber_(sheet);

  sheet.appendRow([
    payload.name || "",
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

function getOrderStatus_(payload) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");

  if (!sheet) {
    return json_({ ok: false, message: "Orders sheet not found." });
  }

  var invoiceNumber = String(payload.invoiceNumber || "").trim();

  if (!invoiceNumber) {
    return json_({ ok: false, message: "Invoice number is required." });
  }

  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
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

function saveNewsletter_(payload) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  var email = payload.email || payload.email_address || "";

  if (!email) {
    return json_({ ok: false, message: "Missing email" });
  }

  sheet.appendRow([email, new Date()]);

  return json_({ ok: true });
}

function generateUniqueInvoiceNumber_(sheet) {
  var existing = {};
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    existing[String(data[i][9]).trim()] = true;
  }

  var invoice = "";

  do {
    invoice = Utilities.getUuid().replace(/-/g, "").toUpperCase();
  } while (existing[invoice]);

  return invoice;
}

function parsePayload_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {}
  }

  return (e && e.parameter) ? e.parameter : {};
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
