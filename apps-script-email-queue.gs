const APP_CONFIG = {
  version: "orders-v5-email-queue",
  newsletterSheetName: "Email Collection",
  productRequestSheetName: "ProductRequest",
  emailQueueSheetName: "EmailQueue",
	paymentSyncSharedSecret: "replace-with-your-worker-shared-secret",
  emailFromAlias: "replace-with-your-alias@hootquest.com",
  adminNotificationEmail: "replace-with-your-inbox@hootquest.com",
  senderName: "HootQuest",
  newsletterMinimumDelayMs: 3000,
  queueIntervalMinutes: 10,
  maxRecipientsPerHour: 20,
  maxSendAttempts: 5,
  dailyQuotaSafetyBuffer: 5
};

const EMAIL_QUEUE_HEADERS = [
  "Created At",
  "Send After",
  "Status",
  "Category",
  "To",
  "Cc",
  "Bcc",
  "Subject",
  "Html Body",
  "From Alias",
  "Recipient Count",
  "Attempts",
  "Last Attempt At",
  "Sent At",
  "Error",
  "Meta"
];

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action || "" : "";
  const callback = e && e.parameter ? e.parameter.callback || "" : "";

  if (action === "getOrderStatus") {
	const payload = getProductRequestStatus_(e.parameter || {}, true);
	return json_(payload, callback);
  }

  return json_({ ok: true, version: APP_CONFIG.version }, callback);
}

function doPost(e) {
  const payload = parsePayload_(e);

	if (payload.action === "markPaymentPaid") {
	return markProductRequestPaid_(payload);
  }

  if (payload.action === "createOrder") {
	return createProductRequest_(payload);
  }

  if (payload.action === "getOrderStatus") {
	return json_(getProductRequestStatus_(payload, true));
  }

  return handleNewsletterSignup_(payload);
}

function handleNewsletterSignup_(payload) {
  const email = normalizeEmail_(payload.email || payload.email_address || "");

  if (!email) {
	return json_({ ok: false, message: "Missing email" });
  }

  const botGuard = validateNewsletterBotGuard_(payload);

  if (botGuard.blocked) {
	return json_({ ok: true, blocked: true, reason: botGuard.reason });
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP_CONFIG.newsletterSheetName);

  if (!sheet) {
	return json_({ ok: false, message: `${APP_CONFIG.newsletterSheetName} sheet not found.` });
  }

  sheet.appendRow([email, new Date()]);

  queueEmail_({
	category: "newsletter-confirmation",
	to: email,
	subject: "Thanks for subscribing to HootQuest",
	htmlBody: [
	  "<h2>Thanks for subscribing!</h2>",
	  "<p>You are now on the HootQuest update list.</p>",
	  "<p>We will keep you posted on HootQuest, Owlcrest, Kickstarter updates, and development progress.</p>"
	].join(""),
	meta: {
	  formName: payload.form_name || payload.analytics_form || "newsletter",
	  source: "website"
	}
  });

  if (APP_CONFIG.adminNotificationEmail && APP_CONFIG.adminNotificationEmail.indexOf("replace-with-") !== 0) {
	queueEmail_({
	  category: "newsletter-admin-notice",
	  to: APP_CONFIG.adminNotificationEmail,
	  subject: "New HootQuest Tune-In signup",
	  htmlBody: [
		"<h2>New Tune-In signup</h2>",
		`<p><strong>Email:</strong> ${escapeHtml_(email)}</p>`,
		`<p><strong>Received:</strong> ${escapeHtml_(new Date().toISOString())}</p>`
	  ].join(""),
	  meta: {
		signupEmail: email
	  }
	});
  }

  return json_({ ok: true, email: email, queued: true });
}

function createProductRequest_(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP_CONFIG.productRequestSheetName);

  if (!sheet) {
	return json_({ ok: false, message: `${APP_CONFIG.productRequestSheetName} sheet not found.` });
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

  const previousRow = existingRow > 0 ? getProductRequestRowData_(sheet, existingRow) : null;
  const nextStatus = payload.buildStatus || "Build Prep Request";

  const rowValues = [
	payload.email || "",
	payload.address || "",
	payload.contact || "",
	payload.package || "",
	payload.pretaxSales || "0.00",
	nextStatus,
	payload.shippingLabel || "",
	payload.paymentMethod || "",
	payload.paymentStatus || "",
	invoiceNumber
  ];

  if (existingRow > 0) {
	sheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
	sheet.appendRow(rowValues);
	existingRow = sheet.getLastRow();
  }

  markProductRequestChanged_(sheet, existingRow);
  maybeQueueProductRequestEmail_({
	email: payload.email || "",
	invoiceNumber: invoiceNumber,
	nextStatus: nextStatus,
	previousRow: previousRow,
	paymentMethod: payload.paymentMethod || "",
	packageSummary: payload.package || "",
	pretaxSales: payload.pretaxSales || "0.00"
  });

  return json_({
	ok: true,
	invoiceNumber: invoiceNumber,
	buildStatus: nextStatus
  });
}

function markProductRequestPaid_(payload) {
  if (!isAuthorizedPaymentSync_(payload.sharedSecret)) {
	return json_({ ok: false, message: "Unauthorized payment sync request." });
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP_CONFIG.productRequestSheetName);

  if (!sheet) {
	return json_({ ok: false, message: `${APP_CONFIG.productRequestSheetName} sheet not found.` });
  }

  const invoiceNumber = String(payload.invoiceNumber || "").trim();

  if (!invoiceNumber) {
	return json_({ ok: false, message: "Invoice number is required for payment sync." });
  }

  const rowNumber = findProductRequestRow_(sheet, invoiceNumber);

  if (!rowNumber) {
	return json_({ ok: false, message: "Matching invoice was not found." });
  }

  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 10)).getValues()[0];
  const paymentStatusCol = headers.indexOf("paymentStatus") + 1 || 9;
  let stripeSessionCol = headers.indexOf("Stripe Session ID") + 1;
  let stripePaymentIntentCol = headers.indexOf("Stripe Payment Intent ID") + 1;
  let paidAtCol = headers.indexOf("Paid At") + 1;
  let paymentAmountCol = headers.indexOf("Payment Amount") + 1;
  let paymentCurrencyCol = headers.indexOf("Payment Currency") + 1;
  let paymentMethodCol = headers.indexOf("Payment Method Detail") + 1;
  let webhookEventCol = headers.indexOf("Stripe Event ID") + 1;
  let figurineMemoCol = headers.indexOf("Figurine Memo") + 1;
  let siteCartIdsCol = headers.indexOf("Site Cart IDs") + 1;

  stripeSessionCol = ensureSheetColumn_(sheet, stripeSessionCol, "Stripe Session ID");
  stripePaymentIntentCol = ensureSheetColumn_(sheet, stripePaymentIntentCol, "Stripe Payment Intent ID");
  paidAtCol = ensureSheetColumn_(sheet, paidAtCol, "Paid At");
  paymentAmountCol = ensureSheetColumn_(sheet, paymentAmountCol, "Payment Amount");
  paymentCurrencyCol = ensureSheetColumn_(sheet, paymentCurrencyCol, "Payment Currency");
  paymentMethodCol = ensureSheetColumn_(sheet, paymentMethodCol, "Payment Method Detail");
  webhookEventCol = ensureSheetColumn_(sheet, webhookEventCol, "Stripe Event ID");
  figurineMemoCol = ensureSheetColumn_(sheet, figurineMemoCol, "Figurine Memo");
  siteCartIdsCol = ensureSheetColumn_(sheet, siteCartIdsCol, "Site Cart IDs");

  sheet.getRange(rowNumber, paymentStatusCol).setValue(String(payload.paymentStatus || "Paid"));
  sheet.getRange(rowNumber, stripeSessionCol).setValue(String(payload.stripeSessionId || ""));
  sheet.getRange(rowNumber, stripePaymentIntentCol).setValue(String(payload.stripePaymentIntentId || ""));
  sheet.getRange(rowNumber, paidAtCol).setValue(new Date());
  sheet.getRange(rowNumber, paymentAmountCol).setValue(formatStripeAmount_(payload.amountTotal));
  sheet.getRange(rowNumber, paymentCurrencyCol).setValue(String(payload.currency || "").toUpperCase());
  sheet.getRange(rowNumber, paymentMethodCol).setValue(String(payload.paymentMethod || "Stripe"));
  sheet.getRange(rowNumber, webhookEventCol).setValue(String(payload.stripeEventId || ""));
  sheet.getRange(rowNumber, figurineMemoCol).setValue(String(payload.figurineMemo || ""));
  sheet.getRange(rowNumber, siteCartIdsCol).setValue(String(payload.siteCartIds || ""));

  markProductRequestChanged_(sheet, rowNumber);

  return json_({
	ok: true,
	invoiceNumber: invoiceNumber,
	paymentStatus: String(payload.paymentStatus || "Paid")
  });
}

function maybeQueueProductRequestEmail_(context) {
  const email = normalizeEmail_(context.email || "");

  if (!email) {
	return;
  }

  const previousStatus = context.previousRow ? String(context.previousRow.buildStatus || "").trim() : "";
  const nextStatus = String(context.nextStatus || "").trim();
  const hadPreviousRow = !!context.previousRow;
  const wasCartStatus = isCartStatus_(previousStatus);
  const isNowCartStatus = isCartStatus_(nextStatus);

  if (!hadPreviousRow && isNowCartStatus) {
	queueEmail_({
	  category: "cart-hold-customer",
	  to: email,
	  subject: "HootQuest cart hold saved",
	  htmlBody: [
		"<h2>Your cart hold was saved</h2>",
		`<p><strong>Invoice:</strong> ${escapeHtml_(context.invoiceNumber)}</p>`,
		`<p><strong>Status:</strong> ${escapeHtml_(nextStatus)}</p>`,
		"<p>Your cart request was saved so you can come back and finish it later.</p>"
	  ].join(""),
	  meta: { invoiceNumber: context.invoiceNumber, status: nextStatus }
	});

	queueAdminOrderNotice_("Cart hold saved", context);
	return;
  }

  if (hadPreviousRow && wasCartStatus && isNowCartStatus) {
	return;
  }

  if ((!hadPreviousRow && !isNowCartStatus) || (hadPreviousRow && wasCartStatus && !isNowCartStatus)) {
	queueEmail_({
	  category: "order-request-customer",
	  to: email,
	  subject: "HootQuest order request received",
	  htmlBody: [
		"<h2>Your order request was received</h2>",
		`<p><strong>Invoice:</strong> ${escapeHtml_(context.invoiceNumber)}</p>`,
		`<p><strong>Status:</strong> ${escapeHtml_(nextStatus)}</p>`,
		`<p><strong>Payment Method:</strong> ${escapeHtml_(context.paymentMethod || "Not selected yet")}</p>`,
		`<p><strong>Pretax Total:</strong> $${escapeHtml_(String(context.pretaxSales || "0.00"))}</p>`,
		"<p>We will review your request and follow up soon.</p>"
	  ].join(""),
	  meta: { invoiceNumber: context.invoiceNumber, status: nextStatus }
	});

	queueAdminOrderNotice_("Order request received", context);
  }
}

function queueAdminOrderNotice_(label, context) {
  if (!APP_CONFIG.adminNotificationEmail || APP_CONFIG.adminNotificationEmail.indexOf("replace-with-") === 0) {
	return;
  }

  queueEmail_({
	category: "order-admin-notice",
	to: APP_CONFIG.adminNotificationEmail,
	subject: `HootQuest ${label}`,
	htmlBody: [
	  `<h2>${escapeHtml_(label)}</h2>`,
	  `<p><strong>Customer Email:</strong> ${escapeHtml_(context.email || "")}</p>`,
	  `<p><strong>Invoice:</strong> ${escapeHtml_(context.invoiceNumber || "")}</p>`,
	  `<p><strong>Status:</strong> ${escapeHtml_(context.nextStatus || "")}</p>`,
	  `<p><strong>Payment Method:</strong> ${escapeHtml_(context.paymentMethod || "Not selected yet")}</p>`,
	  `<p><strong>Pretax Total:</strong> $${escapeHtml_(String(context.pretaxSales || "0.00"))}</p>`,
	  `<p><strong>Package Summary:</strong> ${escapeHtml_(context.packageSummary || "")}</p>`
	].join(""),
	meta: {
	  invoiceNumber: context.invoiceNumber || "",
	  customerEmail: context.email || ""
	}
  });
}

function processEmailQueue() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
	return;
  }

  try {
	const queueSheet = getOrCreateSheet_(APP_CONFIG.emailQueueSheetName, EMAIL_QUEUE_HEADERS);
	const dataRange = queueSheet.getDataRange();
	const values = dataRange.getValues();

	if (values.length <= 1) {
	  return;
	}

	const headers = getHeaderMap_(values[0]);
	const now = new Date();
	const dailyRemaining = Math.max(0, MailApp.getRemainingDailyQuota() - APP_CONFIG.dailyQuotaSafetyBuffer);
	const sentLastHour = getSentRecipientCountSince_(values, headers, new Date(now.getTime() - 60 * 60 * 1000));
	const hourlyRemaining = Math.max(0, APP_CONFIG.maxRecipientsPerHour - sentLastHour);
	let remainingBudget = Math.min(dailyRemaining, hourlyRemaining);

	if (remainingBudget <= 0) {
	  return;
	}

	const aliases = GmailApp.getAliases();

	for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
	  const row = values[rowIndex];
	  const status = String(row[headers["Status"]] || "").trim();
	  const sendAfter = row[headers["Send After"]] instanceof Date ? row[headers["Send After"]] : new Date(row[headers["Send After"]] || 0);
	  const recipientCount = Number(row[headers["Recipient Count"]] || 0) || 1;
	  const attempts = Number(row[headers["Attempts"]] || 0);

	  if (status !== "Pending" && status !== "Retry") {
		continue;
	  }

	  if (!(sendAfter instanceof Date) || isNaN(sendAfter.getTime()) || sendAfter.getTime() > now.getTime()) {
		continue;
	  }

	  if (attempts >= APP_CONFIG.maxSendAttempts) {
		queueSheet.getRange(rowIndex + 1, headers["Status"] + 1).setValue("Failed");
		continue;
	  }

	  if (recipientCount > remainingBudget) {
		continue;
	  }

	  const queueItem = {
		to: row[headers["To"]],
		cc: row[headers["Cc"]],
		bcc: row[headers["Bcc"]],
		subject: row[headers["Subject"]],
		htmlBody: row[headers["Html Body"]],
		fromAlias: row[headers["From Alias"]]
	  };

	  try {
		sendQueuedEmail_(queueItem, aliases);
		queueSheet.getRange(rowIndex + 1, headers["Status"] + 1, 1, 4).setValues([["Sent", attempts + 1, now, now]]);
		queueSheet.getRange(rowIndex + 1, headers["Error"] + 1).setValue("");
		remainingBudget -= recipientCount;

		if (remainingBudget <= 0) {
		  break;
		}
	  } catch (err) {
		const nextAttemptAt = new Date(now.getTime() + APP_CONFIG.queueIntervalMinutes * 60 * 1000);
		queueSheet.getRange(rowIndex + 1, headers["Send After"] + 1, 1, 5).setValues([[nextAttemptAt, "Retry", attempts + 1, now, ""]]);
		queueSheet.getRange(rowIndex + 1, headers["Error"] + 1).setValue(String(err && err.message ? err.message : err));
	  }
	}
  } finally {
	lock.releaseLock();
  }
}

function queueEmail_(message) {
  const queueSheet = getOrCreateSheet_(APP_CONFIG.emailQueueSheetName, EMAIL_QUEUE_HEADERS);
  const createdAt = new Date();
  const sendAfter = message.sendAfter ? new Date(message.sendAfter) : createdAt;
  const to = normalizeEmailList_(message.to || "");
  const cc = normalizeEmailList_(message.cc || "");
  const bcc = normalizeEmailList_(message.bcc || "");
  const recipientCount = countRecipients_(to, cc, bcc);

  queueSheet.appendRow([
	createdAt,
	sendAfter,
	"Pending",
	message.category || "general",
	to,
	cc,
	bcc,
	message.subject || "",
	message.htmlBody || "",
	message.fromAlias || APP_CONFIG.emailFromAlias,
	recipientCount,
	0,
	"",
	"",
	"",
	JSON.stringify(message.meta || {})
  ]);
}

function sendQueuedEmail_(queueItem, aliases) {
  const to = String(queueItem.to || "").trim();

  if (!to) {
	throw new Error("Queue item is missing a recipient.");
  }

  const htmlBody = String(queueItem.htmlBody || "");
  const plainBody = htmlToPlainText_(htmlBody);
  const options = {
	htmlBody: htmlBody,
	name: APP_CONFIG.senderName
  };

  if (queueItem.cc) {
	options.cc = String(queueItem.cc);
  }

  if (queueItem.bcc) {
	options.bcc = String(queueItem.bcc);
  }

  const fromAlias = String(queueItem.fromAlias || APP_CONFIG.emailFromAlias || "").trim();

  if (fromAlias) {
	const availableAliases = aliases || GmailApp.getAliases();

	if (availableAliases.indexOf(fromAlias) === -1) {
	  throw new Error(`Alias not configured in Gmail: ${fromAlias}`);
	}

	options.from = fromAlias;
	options.replyTo = fromAlias;
  }

  GmailApp.sendEmail(to, String(queueItem.subject || "HootQuest update"), plainBody || "HootQuest update", options);
}

function installEmailQueueTrigger() {
  deleteEmailQueueTriggers_();

  ScriptApp.newTrigger("processEmailQueue")
	.timeBased()
	.everyMinutes(APP_CONFIG.queueIntervalMinutes)
	.create();
}

function deleteEmailQueueTriggers_() {
  const triggers = ScriptApp.getProjectTriggers();

  for (let i = 0; i < triggers.length; i++) {
	if (triggers[i].getHandlerFunction() === "processEmailQueue") {
	  ScriptApp.deleteTrigger(triggers[i]);
	}
  }
}

function testQueueEmail() {
  queueEmail_({
	category: "test",
	to: APP_CONFIG.adminNotificationEmail,
	subject: "HootQuest queue test",
	htmlBody: "<p>If you received this, the queued email sender is working.</p>"
  });
}

function validateNewsletterBotGuard_(payload) {
  const honeypot = String(payload.company_name || "").trim();
  const loadedAt = Number(payload.form_loaded_at || 0);

  if (honeypot) {
	return { blocked: true, reason: "honeypot" };
  }

  if (!loadedAt || Date.now() - loadedAt < APP_CONFIG.newsletterMinimumDelayMs) {
	return { blocked: true, reason: "timing" };
  }

  return { blocked: false, reason: "ok" };
}

function isAuthorizedPaymentSync_(sharedSecret) {
  const expectedSecret = String(APP_CONFIG.paymentSyncSharedSecret || "").trim();
  const providedSecret = String(sharedSecret || "").trim();

  if (!expectedSecret || expectedSecret.indexOf("replace-with-") === 0) {
	return false;
  }

  return expectedSecret === providedSecret;
}

function findProductRequestRow_(sheet, invoiceNumber) {
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
	if (String(data[i][9]).trim() === invoiceNumber) {
	  return i + 1;
	}

function ensureSheetColumn_(sheet, existingCol, headerLabel) {
  if (existingCol) {
	return existingCol;
  }

  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol).setValue(headerLabel);
  return nextCol;
}

function formatStripeAmount_(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
	return "";
  }

  return (amount / 100).toFixed(2);
}
  }

  return 0;
}

function findOpenCartHoldByEmail_(sheet, email) {
  const data = sheet.getDataRange().getValues();
  const targetEmail = normalizeEmail_(email);

  for (let i = data.length - 1; i >= 1; i--) {
	const rowEmail = normalizeEmail_(data[i][0] || "");
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

function getProductRequestRowData_(sheet, rowNumber) {
  const row = sheet.getRange(rowNumber, 1, 1, 10).getValues()[0];

  return {
	email: row[0] || "",
	address: row[1] || "",
	contact: row[2] || "",
	package: row[3] || "",
	pretaxSales: row[4] || "",
	buildStatus: row[5] || "",
	shippingLabel: row[6] || "",
	paymentMethod: row[7] || "",
	paymentStatus: row[8] || "",
	invoiceNumber: row[9] || ""
  };
}

function isCartStatus_(status) {
  const value = String(status || "").trim();
  return value === "Cart Hold Request" || value === "Waiting Cart Submission";
}

function getProductRequestStatus_(payload, returnPayloadOnly) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP_CONFIG.productRequestSheetName);
  let result;

  if (!sheet) {
	result = { ok: false, message: `${APP_CONFIG.productRequestSheetName} sheet not found.` };
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

function markProductRequestChanged_(sheet, rowNumber) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let changedCol = headers.indexOf("Changed") + 1;
  let changedAtCol = headers.indexOf("Changed At") + 1;

  if (!changedCol) {
	changedCol = sheet.getLastColumn() + 1;
	sheet.getRange(1, changedCol).setValue("Changed");
  }

  if (!changedAtCol) {
	changedAtCol = sheet.getLastColumn() + 1;
	sheet.getRange(1, changedAtCol).setValue("Changed At");
  }

  sheet.getRange(rowNumber, changedCol).setValue("YES");
  sheet.getRange(rowNumber, changedAtCol).setValue(new Date());
}

function getOrCreateSheet_(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
	sheet = spreadsheet.insertSheet(sheetName);
  }

  if (headers && headers.length) {
	const currentHeaders = sheet.getLastRow() > 0
	  ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0]
	  : [];

	const needsHeaders = headers.some(function (header, index) {
	  return currentHeaders[index] !== header;
	});

	if (needsHeaders) {
	  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
	}
  }

  return sheet;
}

function getHeaderMap_(headerRow) {
  const map = {};

  for (let i = 0; i < headerRow.length; i++) {
	map[String(headerRow[i] || "").trim()] = i;
  }

  return map;
}

function getSentRecipientCountSince_(rows, headers, sinceDate) {
  let total = 0;
  const statusIndex = headers["Status"];
  const sentAtIndex = headers["Sent At"];
  const recipientCountIndex = headers["Recipient Count"];

  for (let i = 1; i < rows.length; i++) {
	const status = String(rows[i][statusIndex] || "").trim();
	const sentAt = rows[i][sentAtIndex] instanceof Date ? rows[i][sentAtIndex] : new Date(rows[i][sentAtIndex] || 0);

	if (status !== "Sent" || !(sentAt instanceof Date) || isNaN(sentAt.getTime()) || sentAt.getTime() < sinceDate.getTime()) {
	  continue;
	}

	total += Number(rows[i][recipientCountIndex] || 0) || 1;
  }

  return total;
}

function countRecipients_(to, cc, bcc) {
  return splitEmailList_(to).length + splitEmailList_(cc).length + splitEmailList_(bcc).length;
}

function normalizeEmailList_(value) {
  return splitEmailList_(value).join(",");
}

function splitEmailList_(value) {
  return String(value || "")
	.split(",")
	.map(function (part) {
	  return normalizeEmail_(part);
	})
	.filter(function (part) {
	  return !!part;
	});
}

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function htmlToPlainText_(html) {
  return String(html || "")
	.replace(/<br\s*\/?>/gi, "\n")
	.replace(/<\/p>/gi, "\n\n")
	.replace(/<[^>]+>/g, "")
	.replace(/&nbsp;/g, " ")
	.replace(/&amp;/g, "&")
	.replace(/&lt;/g, "<")
	.replace(/&gt;/g, ">")
	.trim();
}

function escapeHtml_(value) {
  return String(value || "")
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;")
	.replace(/'/g, "&#39;");
}

function parsePayload_(e) {
  const payload = {};

  if (e && e.parameter) {
	Object.keys(e.parameter).forEach(function (key) {
	  payload[key] = e.parameter[key];
	});
  }

  if (e && e.postData && e.postData.contents) {
	try {
	  const jsonPayload = JSON.parse(e.postData.contents);
	  Object.keys(jsonPayload).forEach(function (key) {
		payload[key] = jsonPayload[key];
	  });
	} catch (err) {}
  }

  return payload;
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
