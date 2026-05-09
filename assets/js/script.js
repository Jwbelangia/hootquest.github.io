'use strict';



const navbar = document.querySelector("[data-navbar]");
const navbarLinks = document.querySelectorAll("[data-nav-link]");
const navbarToggler = document.querySelector("[data-nav-toggler]");

navbarToggler.addEventListener("click", function () {
  navbar.classList.toggle("active");
  this.classList.toggle("active");
});

for (let i = 0; i < navbarLinks.length; i++) {
  navbarLinks[i].addEventListener("click", function () {
    navbar.classList.remove("active");
    navbarToggler.classList.remove("active");
  });
}



/**
 * search toggle
 */

const searchTogglers = document.querySelectorAll("[data-search-toggler]");
const searchBox = document.querySelector("[data-search-box]");

for (let i = 0; i < searchTogglers.length; i++) {
  searchTogglers[i].addEventListener("click", function () {
    searchBox.classList.toggle("active");
  });
}



/**
 * header
 */

const header = document.querySelector("[data-header]");
const backTopBtn = document.querySelector("[data-back-top-btn]");

window.addEventListener("scroll", function () {
  if (window.scrollY >= 200) {
    header.classList.add("active");
    backTopBtn.classList.add("active");
  } else {
    header.classList.remove("active");
    backTopBtn.classList.remove("active");
  }
});



const newsletterForms = document.querySelectorAll("[data-newsletter-form]");
const newsletterFrame = document.querySelector('iframe[name="newsletter-submit-frame"]');
let activeNewsletterForm = null;

for (let i = 0; i < newsletterForms.length; i++) {
  newsletterForms[i].addEventListener("submit", function () {
    const status = this.nextElementSibling;
    const button = this.querySelector('button[type="submit"]');

    activeNewsletterForm = this;

    if (status?.hasAttribute("data-newsletter-status")) {
      status.textContent = "Submitting...";
    }

    if (button) {
      button.disabled = true;
    }
  });
}

if (newsletterFrame) {
  newsletterFrame.addEventListener("load", function () {
    if (!activeNewsletterForm) {
      return;
    }

    const status = activeNewsletterForm.nextElementSibling;
    const button = activeNewsletterForm.querySelector('button[type="submit"]');

    if (status?.hasAttribute("data-newsletter-status")) {
      status.textContent = "Thanks for subscribing!";
    }

    activeNewsletterForm.reset();

    if (button) {
      button.disabled = false;
    }

    activeNewsletterForm = null;
  });
}



const orderHub = document.querySelector("[data-order-hub]");
const orderForm = document.querySelector("[data-order-form]");
const orderStatusForm = document.querySelector("[data-order-status-form]");
const cartBadge = document.querySelector("[data-cart-badge]");
const orderEndpoint = orderHub?.dataset.orderEndpoint || "";
const orderDraftKey = "hootquest-order-draft";
const abandonedCartDelayMs = 5 * 60 * 1000;
let abandonedCartTimerId = null;
let draftHoldSent = false;
let lastDraftHash = "";

const packageCatalog = [
  {
    id: "core-game",
    name: "Core Game Module",
    price: 89.99,
    description: "Base HootQuest box with core encounter content. Includes Swarm of the Rat King expansion."
  },
  {
    id: "rat-king-expansion",
    name: "Swarm of the Rat King Expansion",
    price: 39.99,
    description: "Expansion content pack with Rat figurings, Campaign booklet, Campaign Pattern."
  },
  {
    id: "owlcrest-collectible",
    name: "Owlcrest Medium Figurine",
    price: 14.99,
    description: "Collectible figuring. Larger than play pieces. A staff member will email you the selection we have for print."
  }
  // Example item format for future uploads:
  // {
  //   id: "item-slug",
  //   name: "Item Name",
  //   price: 19.99,
  //   description: "Short item description."
  // }
];

if (orderHub && orderForm) {
  const packageList = orderForm.querySelector("[data-package-list]");
  const packageField = orderForm.querySelector("[data-package-field]");
  const pretaxField = orderForm.querySelector("[data-pretax-field]");
  const pretaxDisplay = orderForm.querySelector("[data-pretax-display]");
  const packageSummary = orderForm.querySelector("[data-package-summary]");
  const orderStatus = orderForm.querySelector("[data-order-form-status]");
  const invoiceCard = orderForm.querySelector("[data-order-invoice-card]");
  const invoiceValue = orderForm.querySelector("[data-order-invoice-value]");
  const invoiceField = orderForm.querySelector("[data-invoice-field]");
  const emailField = orderForm.querySelector('input[name="email"]');

  renderPackageCatalog(packageList, packageCatalog);
  restoreOrderDraft();
  syncOrderSummary();
  refreshCartState();

  packageList?.addEventListener("input", function (event) {
    if (event.target.matches("[data-package-quantity]")) {
      syncOrderSummary();
      persistOrderDraft();
      refreshCartState();
    }
  });

  orderForm.addEventListener("input", function () {
    persistOrderDraft();
    refreshCartState();
  });

  orderForm.addEventListener("change", function () {
    persistOrderDraft();
    refreshCartState();
  });

  orderForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!orderEndpoint) {
      orderStatus.textContent = "Order endpoint is not configured yet.";
      return;
    }

    const submitButton = orderForm.querySelector('button[type="submit"]');
    const formData = new FormData(orderForm);
    const payload = Object.fromEntries(formData.entries());

    if (!payload.package) {
      orderStatus.textContent = "Please add at least one package item before submitting.";
      return;
    }

    orderStatus.textContent = "Submitting your request...";
    invoiceCard.hidden = true;

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const result = await postOrderPayload(payload);

      if (!result.ok) {
        throw new Error(result.message || "Unable to submit order request.");
      }

      if (result.invoiceNumber) {
        invoiceField.value = result.invoiceNumber;
        invoiceValue.textContent = result.invoiceNumber;
      }

      orderStatus.textContent = "Request received. Save your invoice number below.";
      invoiceCard.hidden = false;
      persistOrderDraft();
      clearOrderDraft();
      orderForm.reset();
      invoiceField.value = "";
      syncOrderSummary();
      refreshCartState();
    } catch (error) {
      orderStatus.textContent = error.message || "Unable to submit order request.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });

  window.addEventListener("beforeunload", function (event) {
    if (!hasDraftCart()) {
      return;
    }

    persistOrderDraft();
    sendAbandonedCartHold(true);
    event.preventDefault();
    event.returnValue = "Your cart hold will be saved for 72 hours if you leave now.";
  });

  function syncOrderSummary() {
    const selectedItems = [];
    let pretaxTotal = 0;
    let itemCount = 0;
    const quantityFields = orderForm.querySelectorAll("[data-package-quantity]");

    for (let i = 0; i < quantityFields.length; i++) {
      const field = quantityFields[i];
      const quantity = Number(field.value || 0);
      const product = packageCatalog.find(function (item) {
        return item.id === field.dataset.packageId;
      });

      if (!product || quantity <= 0) {
        continue;
      }

      const lineTotal = product.price * quantity;
      pretaxTotal += lineTotal;
      itemCount += quantity;
      selectedItems.push(`${product.name} x${quantity} ($${lineTotal.toFixed(2)})`);
    }

    packageField.value = selectedItems.join(" | ");
    pretaxField.value = pretaxTotal.toFixed(2);
    pretaxDisplay.value = `$${pretaxTotal.toFixed(2)}`;
    packageSummary.textContent = selectedItems.length ? selectedItems.join(", ") : "No items selected yet.";

    if (cartBadge) {
      cartBadge.textContent = String(itemCount);
    }
  }

  function refreshCartState() {
    syncOrderSummary();
    scheduleAbandonedCartHold();
  }

  function collectOrderDraft() {
    const quantityFields = orderForm.querySelectorAll("[data-package-quantity]");
    const quantities = {};

    for (let i = 0; i < quantityFields.length; i++) {
      const field = quantityFields[i];
      quantities[field.dataset.packageId] = String(field.value || "0");
    }

    return {
      invoiceNumber: invoiceField.value || "",
      email: orderForm.querySelector('input[name="email"]')?.value?.trim() || "",
      address: orderForm.querySelector('textarea[name="address"]')?.value || "",
      contact: orderForm.querySelector('input[name="contact"]')?.value || "",
      paymentMethod: orderForm.querySelector('select[name="paymentMethod"]')?.value || "",
      package: packageField.value,
      pretaxSales: pretaxField.value,
      quantities: quantities
    };
  }

  function persistOrderDraft() {
    const draft = collectOrderDraft();
    localStorage.setItem(orderDraftKey, JSON.stringify(draft));
  }

  function restoreOrderDraft() {
    const rawDraft = localStorage.getItem(orderDraftKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft);

      if (draft.invoiceNumber) {
        invoiceField.value = draft.invoiceNumber;
      }

      if (draft.email) {
        orderForm.querySelector('input[name="email"]').value = draft.email;
      }

      if (draft.address) {
        orderForm.querySelector('textarea[name="address"]').value = draft.address;
      }

      if (draft.contact) {
        orderForm.querySelector('input[name="contact"]').value = draft.contact;
      }

      if (draft.paymentMethod) {
        orderForm.querySelector('select[name="paymentMethod"]').value = draft.paymentMethod;
      }

      const quantityFields = orderForm.querySelectorAll("[data-package-quantity]");
      for (let i = 0; i < quantityFields.length; i++) {
        const field = quantityFields[i];
        if (draft.quantities && Object.prototype.hasOwnProperty.call(draft.quantities, field.dataset.packageId)) {
          field.value = draft.quantities[field.dataset.packageId];
        }
      }
    } catch (error) {
      localStorage.removeItem(orderDraftKey);
    }
  }

  function clearOrderDraft() {
    localStorage.removeItem(orderDraftKey);
    draftHoldSent = false;
    lastDraftHash = "";
    clearTimeout(abandonedCartTimerId);
  }

  function hasDraftCart() {
    return isValidEmail(emailField?.value || "") && getCartQuantity() > 0;
  }

  function getCartQuantity() {
    const quantityFields = orderForm.querySelectorAll("[data-package-quantity]");
    let total = 0;

    for (let i = 0; i < quantityFields.length; i++) {
      total += Number(quantityFields[i].value || 0);
    }

    return total;
  }

  function scheduleAbandonedCartHold() {
    clearTimeout(abandonedCartTimerId);

    if (!hasDraftCart()) {
      draftHoldSent = false;
      lastDraftHash = "";
      return;
    }

    abandonedCartTimerId = window.setTimeout(function () {
      sendAbandonedCartHold(false);
    }, abandonedCartDelayMs);
  }

  function sendAbandonedCartHold(useBeacon) {
    if (!hasDraftCart() || !orderEndpoint) {
      return;
    }

    const payload = buildAbandonedCartPayload();
    const payloadHash = JSON.stringify(payload);

    if (draftHoldSent && payloadHash === lastDraftHash) {
      return;
    }

    draftHoldSent = true;
    lastDraftHash = payloadHash;

    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "text/plain;charset=utf-8" });
      navigator.sendBeacon(orderEndpoint, blob);
      return;
    }

    fetch(orderEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {
      draftHoldSent = false;
    });
  }

  function buildAbandonedCartPayload() {
    return {
      action: "createOrder",
      invoiceNumber: invoiceField.value || "",
      email: orderForm.querySelector('input[name="email"]')?.value?.trim() || "",
      address: orderForm.querySelector('textarea[name="address"]')?.value || "",
      contact: orderForm.querySelector('input[name="contact"]')?.value || "",
      package: packageField.value,
      pretaxSales: pretaxField.value,
      buildStatus: "Cart Hold Request",
      shippingLabel: "",
      paymentMethod: orderForm.querySelector('select[name="paymentMethod"]')?.value || "",
      paymentStatus: "",
      holdOnly: true
    };
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  }
}

if (orderHub && orderStatusForm) {
  const statusMessage = orderHub.querySelector("[data-order-status-message]");
  const statusCard = orderHub.querySelector("[data-order-status-result]");
  const invoiceField = orderHub.querySelector("[data-status-invoice]");
  const buildField = orderHub.querySelector("[data-status-build]");
  const shippingRow = orderHub.querySelector("[data-status-shipping-row]");
  const shippingField = orderHub.querySelector("[data-status-shipping]");
  const paymentField = orderHub.querySelector("[data-status-payment]");

  orderStatusForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!orderEndpoint) {
      statusMessage.textContent = "Order endpoint is not configured yet.";
      return;
    }

    const submitButton = orderStatusForm.querySelector('button[type="submit"]');
    const formData = new FormData(orderStatusForm);
    const invoiceNumber = formData.get("invoiceNumber");

    statusMessage.textContent = "Checking your order status...";
    statusCard.hidden = true;

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const result = await postOrderPayload({
        action: "getOrderStatus",
        invoiceNumber: invoiceNumber
      });

      if (!result.ok) {
        throw new Error(result.message || "Order not found.");
      }

      invoiceField.textContent = result.invoiceNumber;
      buildField.textContent = result.buildStatus || "Build Prep Request";

      if (result.shippingLabel) {
        shippingField.textContent = "Product in shipping";
        shippingRow.hidden = false;
      } else {
        shippingRow.hidden = true;
      }

      if (!result.paymentStatus || String(result.paymentStatus).trim() === "") {
        paymentField.textContent = "Pending payment";
        paymentField.className = "status-pending";
      } else if (String(result.paymentStatus).toLowerCase() === "paid") {
        paymentField.textContent = "✔ Paid";
        paymentField.className = "status-paid";
      } else {
        paymentField.textContent = result.paymentStatus;
        paymentField.className = "";
      }

      statusMessage.textContent = "Please allow 72 hours for us to start the process. Reach out if you need help.";
      statusCard.hidden = false;
    } catch (error) {
      statusMessage.textContent = error.message || "Unable to retrieve order status.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

async function postOrderPayload(payload) {
  const response = await fetch(orderEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}

function renderPackageCatalog(container, items) {
  if (!container) {
    return;
  }

  container.innerHTML = items.map(function (item) {
    return `
      <div class="package-item">
        <div>
          <p class="order-label">${item.name}</p>
          <p class="package-item-copy">${item.description}</p>
        </div>

        <div class="package-item-meta">
          <span class="package-price">$${item.price.toFixed(2)}</span>
          <label class="order-field package-quantity">
            <span class="sr-only">${item.name} quantity</span>
            <input type="number" min="0" value="0" data-package-quantity data-package-id="${item.id}">
          </label>
        </div>
      </div>
    `;
  }).join("");
}