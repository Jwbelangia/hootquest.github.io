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
const cartScrollButton = document.querySelector("[data-cart-scroll]");
const contactScrollLink = document.querySelector("[data-contact-scroll]");
const contactEmailField = document.querySelector("[data-contact-email]");
const heroTriggers = document.querySelectorAll("[data-hero-trigger]");
const deckTabs = document.querySelectorAll("[data-deck-tab]");
const cardShowcase = document.querySelector("[data-card-showcase]");
const heroModal = document.querySelector("[data-hero-modal]");
const heroModalTitle = document.querySelector("[data-hero-modal-title]");
const heroModalViewer = document.querySelector("[data-hero-model-viewer]");
const heroModalFallback = document.querySelector("[data-hero-model-fallback]");
const heroFormatNote = document.querySelector("[data-hero-format-note]");
const heroAddToCartButton = document.querySelector("[data-hero-add-to-cart]");
const heroModalCloseButtons = document.querySelectorAll("[data-hero-modal-close]");
const heroModalDialog = heroModal?.querySelector(".hero-modal-dialog");
const heroModalMedia = heroModal?.querySelector(".hero-modal-media");
const campaignStoryModal = document.querySelector("[data-campaign-story-modal]");
const campaignStoryOpenButtons = document.querySelectorAll("[data-campaign-story-open]");
const campaignStoryCloseButtons = document.querySelectorAll("[data-campaign-story-close]");
const paymentModal = document.querySelector("[data-payment-modal]");
const paymentModalTitle = document.querySelector("[data-payment-modal-title]");
const paymentModalText = document.querySelector("[data-payment-modal-text]");
const paymentModalCloseButtons = document.querySelectorAll("[data-payment-modal-close]");
const figurineModal = document.querySelector("[data-figurine-modal]");
const figurineModalCloseButtons = document.querySelectorAll("[data-figurine-modal-close]");
const figurineOptionInputs = document.querySelectorAll("[data-figurine-option]");
const figurineAdjustButtons = document.querySelectorAll("[data-figurine-adjust]");
const figurineQuantityDisplays = document.querySelectorAll("[data-figurine-quantity]");
const figurineSubmitButton = document.querySelector("[data-figurine-submit]");
const orderEndpoint = orderHub?.dataset.orderEndpoint || "";
const orderDraftKey = "hootquest-order-draft";
const orderDraftIdKey = "hootquest-order-draft-id";
const orderInvoiceCookieKey = "hootquest-last-invoice";
const abandonedCartDelayMs = 5 * 60 * 1000;
let abandonedCartTimerId = null;
let draftHoldSent = false;
let lastDraftHash = "";
let activeHeroProductId = "";
let activeHeroTransition = null;
let activeHeroRevealToken = 0;
const heroCartSelections = {};
const figurineCartSelections = {};

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
    description: "Pick which medium figurines you want and add them into your cart.",
    pickerOnly: true
  },
  {
    id: "figurine-rogue",
    name: "Rogue Medium Figurine",
    price: 14.99,
    description: "Made-to-order rogue medium figurine.",
    figurineName: "Rogue",
    hiddenFromForm: true
  },
  {
    id: "figurine-mage",
    name: "Mage Medium Figurine",
    price: 14.99,
    description: "Made-to-order mage medium figurine.",
    figurineName: "Mage",
    hiddenFromForm: true
  },
  {
    id: "figurine-healer",
    name: "Healer Medium Figurine",
    price: 14.99,
    description: "Made-to-order healer medium figurine.",
    figurineName: "Healer",
    hiddenFromForm: true
  },
  {
    id: "figurine-tank",
    name: "Tank Medium Figurine",
    price: 14.99,
    description: "Made-to-order tank medium figurine.",
    figurineName: "Tank",
    hiddenFromForm: true
  },
  {
    id: "figurine-archer",
    name: "Archer Medium Figurine",
    price: 14.99,
    description: "Made-to-order archer medium figurine.",
    figurineName: "Archer",
    hiddenFromForm: true
  },
  {
    id: "hero-rogue",
    name: "Rogue Figurine",
    price: 14.99,
    description: "Made-to-order rogue figurine for OwlCrest supporters.",
    heroName: "Rogue",
    fallbackImage: "./assets/images/RogueV3.png",
    modelSrc: "./assets/models/Rogue.glb",
    hiddenFromForm: true
  },
  {
    id: "hero-mage",
    name: "Mage Figurine",
    price: 14.99,
    description: "Made-to-order mage figurine for OwlCrest supporters.",
    heroName: "Mage",
    fallbackImage: "./assets/images/MageV3.png",
    modelSrc: "./assets/models/Mage.glb",
    hiddenFromForm: true
  },
  {
    id: "hero-healer",
    name: "Healer Figurine",
    price: 14.99,
    description: "Made-to-order healer figurine for OwlCrest supporters.",
    heroName: "Healer",
    fallbackImage: "./assets/images/HealerV3.png",
    modelSrc: "./assets/models/Healer.glb",
    hiddenFromForm: true
  },
  {
    id: "hero-tank",
    name: "Tank Figurine",
    price: 14.99,
    description: "Made-to-order tank figurine for OwlCrest supporters.",
    heroName: "Tank",
    fallbackImage: "./assets/images/TankV3.png",
    modelSrc: "./assets/models/Tank.glb",
    hiddenFromForm: true
  },
  {
    id: "hero-archer",
    name: "Archer Figurine",
    price: 14.99,
    description: "Made-to-order archer figurine for OwlCrest supporters.",
    heroName: "Archer",
    fallbackImage: "./assets/images/ArcherV3.png",
    modelSrc: "./assets/models/Archer.glb",
    hiddenFromForm: true
  }

if (deckTabs.length && cardShowcase) {
  for (let i = 0; i < deckTabs.length; i++) {
    deckTabs[i].addEventListener("click", function () {
      setActiveDeck(this.dataset.deckTab || "owls");
    });
  }
}
  // Example item format for future uploads:
  // {
  //   id: "item-slug",
  //   name: "Item Name",
  //   price: 19.99,
  //   description: "Short item description.",
  //   heroName: "Hero Name",
  //   fallbackImage: "./assets/images/HeroImage.png",
  //   modelSrc: "./assets/models/hero-name.glb"
  // }
];

if (cartScrollButton) {
  cartScrollButton.addEventListener("click", function () {
    scrollToElement(document.querySelector("#order-request-center"));
  });
}

function setActiveDeck(deckName) {
  if (!cardShowcase) {
    return;
  }

  const normalizedDeck = deckName === "rats" ? "rats" : "owls";
  cardShowcase.dataset.activeDeck = normalizedDeck;

  for (let i = 0; i < deckTabs.length; i++) {
    const isActive = deckTabs[i].dataset.deckTab === normalizedDeck;
    deckTabs[i].classList.toggle("is-active", isActive);
    deckTabs[i].setAttribute("aria-selected", String(isActive));
    deckTabs[i].setAttribute("tabindex", isActive ? "0" : "-1");
  }
}

if (contactScrollLink && contactEmailField) {
  contactScrollLink.addEventListener("click", function (event) {
    event.preventDefault();
    scrollToElement(document.querySelector("#contact-signup"), function () {
      contactEmailField.focus();
    });
  });
}

if (heroTriggers.length && heroModal && heroAddToCartButton) {
  for (let i = 0; i < heroTriggers.length; i++) {
    heroTriggers[i].addEventListener("click", function (event) {
      event.preventDefault();
      const card = this.closest(".latest-game-card");
      const cardImage = card?.querySelector("img");
      const heroName = card?.querySelector("img")?.getAttribute("alt")?.trim() || "Hero";
      const image = card?.querySelector("img")?.getAttribute("src") || "";
      const product = findHeroProduct(heroName);

      openHeroModal(product, heroName, image, cardImage);
    });
  }

  for (let i = 0; i < heroModalCloseButtons.length; i++) {
    heroModalCloseButtons[i].addEventListener("click", closeHeroModal);
  }

  heroAddToCartButton.addEventListener("click", function () {
    if (!orderForm || !activeHeroProductId) {
      return;
    }

    heroCartSelections[activeHeroProductId] = Number(heroCartSelections[activeHeroProductId] || 0) + 1;
    orderForm.dispatchEvent(new Event("input", { bubbles: true }));
    scrollToElement(document.querySelector("#order-request-center"));
    closeHeroModal();
  });
}

if (paymentModal) {
  for (let i = 0; i < paymentModalCloseButtons.length; i++) {
    paymentModalCloseButtons[i].addEventListener("click", closePaymentModal);
  }
}

if (campaignStoryModal) {
  for (let i = 0; i < campaignStoryOpenButtons.length; i++) {
    campaignStoryOpenButtons[i].addEventListener("click", function () {
      openCampaignStoryModal();
    });
  }

  for (let i = 0; i < campaignStoryCloseButtons.length; i++) {
    campaignStoryCloseButtons[i].addEventListener("click", closeCampaignStoryModal);
  }
}

if (figurineModal) {
  for (let i = 0; i < figurineModalCloseButtons.length; i++) {
    figurineModalCloseButtons[i].addEventListener("click", closeFigurineModal);
  }

  for (let i = 0; i < figurineAdjustButtons.length; i++) {
    figurineAdjustButtons[i].addEventListener("click", function () {
      const figurineName = this.dataset.figurineOption;
      const delta = Number(this.dataset.figurineAdjust || 0);
      updateFigurinePickerQuantity(figurineName, delta);
    });
  }

  figurineSubmitButton?.addEventListener("click", function () {
    let hasSelection = false;

    for (let i = 0; i < figurineOptionInputs.length; i++) {
      const option = figurineOptionInputs[i];
      const figurineName = option.dataset.figurineOption;
      const quantity = getFigurinePickerQuantity(figurineName);
      const product = findFigurineProduct(figurineName);

      if (!product || quantity <= 0) {
        continue;
      }

      figurineCartSelections[product.id] = Number(figurineCartSelections[product.id] || 0) + quantity;
      setFigurinePickerQuantity(figurineName, 0);
      hasSelection = true;
    }

    if (hasSelection && orderForm) {
      orderForm.dispatchEvent(new Event("input", { bubbles: true }));
      scrollToElement(document.querySelector("#order-request-center"));
    }

    closeFigurineModal();
  });
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    if (heroModal && !heroModal.hidden) {
      closeHeroModal();
    }

    if (campaignStoryModal && !campaignStoryModal.hidden) {
      closeCampaignStoryModal();
    }

    if (paymentModal && !paymentModal.hidden) {
      closePaymentModal();
    }

    if (figurineModal && !figurineModal.hidden) {
      closeFigurineModal();
    }
  }
});

if (orderHub && orderForm) {
  const packageList = orderForm.querySelector("[data-package-list]");
  const packageField = orderForm.querySelector("[data-package-field]");
  const pretaxField = orderForm.querySelector("[data-pretax-field]");
  const pretaxDisplay = orderForm.querySelector("[data-pretax-display]");
  const packageSummary = orderForm.querySelector("[data-package-summary]");
  const heroCartSummary = orderForm.querySelector("[data-hero-cart-summary]");
  const heroCartList = orderForm.querySelector("[data-hero-cart-list]");
  const orderStatus = orderForm.querySelector("[data-order-form-status]");
  const invoiceCard = orderForm.querySelector("[data-order-invoice-card]");
  const invoiceValue = orderForm.querySelector("[data-order-invoice-value]");
  const invoiceField = orderForm.querySelector("[data-invoice-field]");
  const emailField = orderForm.querySelector('input[name="email"]');
  const paymentMethodField = orderForm.querySelector('select[name="paymentMethod"]');
  const orderStatusInvoiceInput = document.querySelector('[data-order-status-form] input[name="invoiceNumber"]');

  renderPackageCatalog(packageList, packageCatalog);
  bindPackageActions(packageList);
  restoreOrderDraft();
  prefillStoredInvoice();
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

  heroCartList?.addEventListener("click", function (event) {
    const removeButton = event.target.closest("[data-cart-remove]");

    if (!removeButton) {
      return;
    }

    const productId = removeButton.dataset.cartRemove;
    const source = removeButton.dataset.cartSource;

    if (source === "figurine") {
      delete figurineCartSelections[productId];
    } else if (source === "hero") {
      delete heroCartSelections[productId];
    }

    orderForm.dispatchEvent(new Event("input", { bubbles: true }));
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
    payload.invoiceNumber = ensureDraftInvoiceNumber();

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
      await submitOrderPayload(payload);

      invoiceField.value = payload.invoiceNumber;
      invoiceValue.textContent = payload.invoiceNumber;
      setCookie(orderInvoiceCookieKey, payload.invoiceNumber, 30);

      if (orderStatusInvoiceInput) {
        orderStatusInvoiceInput.value = payload.invoiceNumber;
      }

      orderStatus.textContent = "Request received. Save your invoice number below.";
      invoiceCard.hidden = false;
      handlePaymentWorkflow(payload.paymentMethod, {
        invoiceNumber: payload.invoiceNumber,
        packageSummary: packageField.value,
        pretaxSales: pretaxField.value,
        email: emailField.value.trim()
      });
      orderForm.reset();
      clearOrderDraft();
      invoiceField.value = "";
      packageField.value = "";
      pretaxField.value = "0.00";
      pretaxDisplay.value = "$0.00";
      packageSummary.textContent = "No items selected yet.";
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
    const heroItems = [];
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
      selectedItems.push(`${getCartProductName(product)} x${quantity} ($${lineTotal.toFixed(2)})`);
    }

    const figurineSelectionIds = Object.keys(figurineCartSelections);

    for (let i = 0; i < figurineSelectionIds.length; i++) {
      const figurineProductId = figurineSelectionIds[i];
      const quantity = Number(figurineCartSelections[figurineProductId] || 0);
      const product = packageCatalog.find(function (item) {
        return item.id === figurineProductId;
      });

      if (!product || quantity <= 0) {
        continue;
      }

      const lineTotal = product.price * quantity;
      pretaxTotal += lineTotal;
      itemCount += quantity;
      selectedItems.push(`${getCartProductName(product)} x${quantity} ($${lineTotal.toFixed(2)})`);
      heroItems.push({
        id: product.id,
        source: "figurine",
        name: getCartProductName(product),
        quantity: quantity,
        total: lineTotal
      });
    }

    const heroSelectionIds = Object.keys(heroCartSelections);

    for (let i = 0; i < heroSelectionIds.length; i++) {
      const heroProductId = heroSelectionIds[i];
      const quantity = Number(heroCartSelections[heroProductId] || 0);
      const product = packageCatalog.find(function (item) {
        return item.id === heroProductId;
      });

      if (!product || quantity <= 0) {
        continue;
      }

      const lineTotal = product.price * quantity;
      pretaxTotal += lineTotal;
      itemCount += quantity;
      selectedItems.push(`${getCartProductName(product)} x${quantity} ($${lineTotal.toFixed(2)})`);
      heroItems.push({
        id: product.id,
        source: "hero",
        name: getCartProductName(product),
        quantity: quantity,
        total: lineTotal
      });
    }

    packageField.value = selectedItems.join(" | ");
    pretaxField.value = pretaxTotal.toFixed(2);
    pretaxDisplay.value = `$${pretaxTotal.toFixed(2)}`;
    packageSummary.textContent = selectedItems.length ? selectedItems.join(", ") : "No items selected yet.";

    if (heroCartSummary && heroCartList) {
      if (heroItems.length) {
        heroCartList.innerHTML = heroItems.map(function (item) {
          return `<li><span>${item.name} x${item.quantity}</span><span>$${item.total.toFixed(2)}</span><button type="button" class="hero-cart-remove" data-cart-remove="${item.id}" data-cart-source="${item.source}" aria-label="Remove ${item.name} from cart">×</button></li>`;
        }).join("");
        heroCartSummary.hidden = false;
      } else {
        heroCartList.innerHTML = "";
        heroCartSummary.hidden = true;
      }
    }

    if (cartBadge) {
      cartBadge.textContent = String(itemCount);
    }
  }

  function refreshCartState() {
    syncOrderSummary();

    if (hasDraftCart()) {
      ensureDraftInvoiceNumber();
    }

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
      invoiceNumber: invoiceField.value || localStorage.getItem(orderDraftIdKey) || "",
      email: orderForm.querySelector('input[name="email"]')?.value?.trim() || "",
      address: orderForm.querySelector('textarea[name="address"]')?.value || "",
      contact: orderForm.querySelector('input[name="contact"]')?.value || "",
      paymentMethod: orderForm.querySelector('select[name="paymentMethod"]')?.value || "",
      package: packageField.value,
      pretaxSales: pretaxField.value,
      heroSelections: heroCartSelections,
      figurineSelections: figurineCartSelections,
      quantities: quantities
    };
  }

  function persistOrderDraft() {
    if (hasDraftCart()) {
      ensureDraftInvoiceNumber();
    }

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
        localStorage.setItem(orderDraftIdKey, draft.invoiceNumber);
      } else {
        const storedInvoiceNumber = localStorage.getItem(orderDraftIdKey);

        if (storedInvoiceNumber) {
          invoiceField.value = storedInvoiceNumber;
        }
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
        paymentMethodField.value = draft.paymentMethod;
      }

      const quantityFields = orderForm.querySelectorAll("[data-package-quantity]");
      for (let i = 0; i < quantityFields.length; i++) {
        const field = quantityFields[i];
        if (draft.quantities && Object.prototype.hasOwnProperty.call(draft.quantities, field.dataset.packageId)) {
          field.value = draft.quantities[field.dataset.packageId];
        }
      }

      clearHeroSelections();
      clearFigurineSelections();

      if (draft.heroSelections) {
        const heroSelectionIds = Object.keys(draft.heroSelections);

        for (let i = 0; i < heroSelectionIds.length; i++) {
          heroCartSelections[heroSelectionIds[i]] = Number(draft.heroSelections[heroSelectionIds[i]] || 0);
        }
      }

      if (draft.figurineSelections) {
        const figurineSelectionIds = Object.keys(draft.figurineSelections);

        for (let i = 0; i < figurineSelectionIds.length; i++) {
          figurineCartSelections[figurineSelectionIds[i]] = Number(draft.figurineSelections[figurineSelectionIds[i]] || 0);
        }
      }
    } catch (error) {
      localStorage.removeItem(orderDraftKey);
    }
  }

  function clearOrderDraft() {
    localStorage.removeItem(orderDraftKey);
    localStorage.removeItem(orderDraftIdKey);
    draftHoldSent = false;
    lastDraftHash = "";
    clearTimeout(abandonedCartTimerId);
    clearHeroSelections();
    clearFigurineSelections();
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

    const heroSelectionIds = Object.keys(heroCartSelections);

    for (let i = 0; i < heroSelectionIds.length; i++) {
      total += Number(heroCartSelections[heroSelectionIds[i]] || 0);
    }

    const figurineSelectionIds = Object.keys(figurineCartSelections);

    for (let i = 0; i < figurineSelectionIds.length; i++) {
      total += Number(figurineCartSelections[figurineSelectionIds[i]] || 0);
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

    ensureDraftInvoiceNumber();

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
      invoiceNumber: ensureDraftInvoiceNumber(),
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

  function ensureDraftInvoiceNumber() {
    let invoiceNumber = invoiceField.value || localStorage.getItem(orderDraftIdKey) || "";

    if (!invoiceNumber) {
      invoiceNumber = generateDraftInvoiceNumber();
    }

    invoiceField.value = invoiceNumber;
    localStorage.setItem(orderDraftIdKey, invoiceNumber);

    return invoiceNumber;
  }

  function generateDraftInvoiceNumber() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID().replace(/-/g, "").toUpperCase();
    }

    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`.toUpperCase();
  }

  function prefillStoredInvoice() {
    const storedInvoice = getCookie(orderInvoiceCookieKey);

    if (storedInvoice && orderStatusInvoiceInput) {
      orderStatusInvoiceInput.value = storedInvoice;
    }
  }

  function clearHeroSelections() {
    const heroSelectionIds = Object.keys(heroCartSelections);

    for (let i = 0; i < heroSelectionIds.length; i++) {
      delete heroCartSelections[heroSelectionIds[i]];
    }
  }

  function clearFigurineSelections() {
    const figurineSelectionIds = Object.keys(figurineCartSelections);

    for (let i = 0; i < figurineSelectionIds.length; i++) {
      delete figurineCartSelections[figurineSelectionIds[i]];
    }

    resetFigurinePickerQuantities();
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
      const result = await getOrderStatusPayload(invoiceNumber);

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

function getCartProductName(product) {
  if (!product) {
    return "Figurine";
  }

  if (product.heroName) {
    return `${product.heroName} Figurine`;
  }

  if (product.figurineName) {
    return `${product.figurineName} Figurine`;
  }

  return product.name;
}

function getFigurinePickerDisplay(figurineName) {
  return document.querySelector(`[data-figurine-quantity="${figurineName}"]`);
}

function getFigurinePickerQuantity(figurineName) {
  const display = getFigurinePickerDisplay(figurineName);
  return Number(display?.textContent || 0);
}

function setFigurinePickerQuantity(figurineName, quantity) {
  const display = getFigurinePickerDisplay(figurineName);

  if (display) {
    display.textContent = String(Math.max(0, quantity));
  }
}

function updateFigurinePickerQuantity(figurineName, delta) {
  const nextQuantity = getFigurinePickerQuantity(figurineName) + Number(delta || 0);
  setFigurinePickerQuantity(figurineName, nextQuantity);
}

function resetFigurinePickerQuantities() {
  for (let i = 0; i < figurineQuantityDisplays.length; i++) {
    figurineQuantityDisplays[i].textContent = "0";
  }
}

async function submitOrderPayload(payload) {
  await fetch(orderEndpoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });
}

function getOrderStatusPayload(invoiceNumber) {
  return new Promise(function (resolve, reject) {
    const callbackName = `hootquestStatus_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const url = new URL(orderEndpoint);

    url.searchParams.set("action", "getOrderStatus");
    url.searchParams.set("invoiceNumber", invoiceNumber);
    url.searchParams.set("callback", callbackName);

    let settled = false;

    window[callbackName] = function (payload) {
      settled = true;
      cleanup();
      resolve(payload);
    };

    script.onerror = function () {
      cleanup();
      reject(new Error("Unable to retrieve order status."));
    };

    script.src = url.toString();
    document.body.appendChild(script);

    window.setTimeout(function () {
      if (settled) {
        return;
      }

      cleanup();
      reject(new Error("Order status request timed out."));
    }, 10000);

    function cleanup() {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      delete window[callbackName];
    }
  });
}

function renderPackageCatalog(container, items) {
  if (!container) {
    return;
  }

  container.innerHTML = items.filter(function (item) {
    return !item.hiddenFromForm;
  }).map(function (item) {
    const metaControl = item.pickerOnly
      ? `<button type="button" class="package-item-action" data-package-picker="${item.id}">Pick Figurines</button>`
      : `<label class="order-field package-quantity">
            <span class="sr-only">${item.name} quantity</span>
            <input type="number" min="0" value="0" data-package-quantity data-package-id="${item.id}">
          </label>`;

    return `
      <div class="package-item">
        <div>
          <p class="order-label">${item.name}</p>
          <p class="package-item-copy">${item.description}</p>
        </div>

        <div class="package-item-meta">
          <span class="package-price">$${item.price.toFixed(2)}</span>
          ${metaControl}
        </div>
      </div>
    `;
  }).join("");
}

function bindPackageActions(container) {
  if (!container) {
    return;
  }

  const pickerButtons = container.querySelectorAll("[data-package-picker]");

  for (let i = 0; i < pickerButtons.length; i++) {
    pickerButtons[i].addEventListener("click", function () {
      openFigurineModal();
    });
  }
}

function scrollToElement(element, callback) {
  if (!element) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "start" });

  if (typeof callback === "function") {
    window.setTimeout(callback, 500);
  }
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const cookieName = `${name}=`;
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();

    if (cookie.startsWith(cookieName)) {
      return decodeURIComponent(cookie.substring(cookieName.length));
    }
  }

  return "";
}

function findHeroProduct(heroName) {
  const normalizedHeroName = String(heroName || "").trim().toLowerCase();

  return packageCatalog.find(function (item) {
    return item.heroName && item.heroName.toLowerCase() === normalizedHeroName;
  });
}

function findFigurineProduct(figurineName) {
  const normalizedFigurineName = String(figurineName || "").trim().toLowerCase();

  return packageCatalog.find(function (item) {
    return item.figurineName && item.figurineName.toLowerCase() === normalizedFigurineName;
  });
}

function openHeroModal(product, title, image, sourceImage) {
  if (!heroModal || !product) {
    return;
  }

  cleanupHeroTransition();
  activeHeroRevealToken += 1;
  const revealToken = activeHeroRevealToken;

  activeHeroProductId = product.id;
  heroModal.hidden = false;
  lockBodyScroll();
  heroModalTitle.textContent = title;
  heroModal.classList.add("is-entering");

  if (heroModalViewer) {
    if (product.modelSrc) {
      heroModalViewer.hidden = true;
      heroModalViewer.removeAttribute("src");
      heroModalViewer.src = product.modelSrc;
      heroModalViewer.poster = image || product.fallbackImage || "";
      heroModalViewer.removeAttribute("camera-controls");
      heroFormatNote.hidden = true;

      const handleModelLoad = function () {
        heroModalViewer.removeEventListener("load", handleModelLoad);

        if (revealToken !== activeHeroRevealToken) {
          return;
        }

        heroModalViewer.hidden = false;
        markHeroModelReady(revealToken);
      };

      heroModalViewer.addEventListener("load", handleModelLoad, { once: true });
    } else {
      heroModalViewer.removeAttribute("src");
      heroModalViewer.hidden = true;
      heroFormatNote.hidden = false;
      markHeroModelReady(revealToken);
    }
  } else {
    markHeroModelReady(revealToken);
  }

  if (heroModalFallback) {
    heroModalFallback.src = product.fallbackImage || image || "";
    heroModalFallback.alt = title;
    heroModalFallback.hidden = false;
  }

  if (sourceImage && heroModalMedia) {
    animateHeroCardToModal(sourceImage, revealToken);
  } else {
    waitForHeroModalReveal(revealToken);
  }
}

function closeHeroModal() {
  if (!heroModal) {
    return;
  }

  cleanupHeroTransition();
  heroModal.hidden = true;
  heroModal.classList.remove("is-entering");
  unlockBodyScroll();
  activeHeroProductId = "";
  activeHeroRevealToken += 1;
}

function openCampaignStoryModal() {
  if (!campaignStoryModal) {
    return;
  }

  campaignStoryModal.hidden = false;
  lockBodyScroll();

  requestAnimationFrame(function () {
    campaignStoryModal.classList.add("is-open");
  });
}

function closeCampaignStoryModal() {
  if (!campaignStoryModal) {
    return;
  }

  campaignStoryModal.classList.remove("is-open");

  window.setTimeout(function () {
    if (!campaignStoryModal.classList.contains("is-open")) {
      campaignStoryModal.hidden = true;
      unlockBodyScroll();
    }
  }, 380);
}

function animateHeroCardToModal(sourceImage, revealToken) {
  if (!heroModalMedia || !heroModalDialog) {
    waitForHeroModalReveal(revealToken);
    return;
  }

  const sourceRect = sourceImage.getBoundingClientRect();
  const targetRect = heroModalMedia.getBoundingClientRect();

  if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) {
    revealHeroModalContent();
    return;
  }

  const targetCardRect = getHeroTransitionTargetRect(sourceRect, targetRect);

  const floatingCard = document.createElement("div");
  const floatingImage = document.createElement("img");
  floatingCard.className = "hero-modal-floating-card";
  floatingImage.src = sourceImage.currentSrc || sourceImage.src;
  floatingImage.alt = sourceImage.alt || "Hero";
  floatingCard.appendChild(floatingImage);
  document.body.appendChild(floatingCard);

  floatingCard.style.left = `${sourceRect.left}px`;
  floatingCard.style.top = `${sourceRect.top}px`;
  floatingCard.style.width = `${sourceRect.width}px`;
  floatingCard.style.height = `${sourceRect.height}px`;

  activeHeroTransition = floatingCard;

  requestAnimationFrame(function () {
    const scaleX = targetCardRect.width / sourceRect.width;
    const scaleY = targetCardRect.height / sourceRect.height;
    const translateX = targetCardRect.left - sourceRect.left;
    const translateY = targetCardRect.top - sourceRect.top;

    floatingCard.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
  });

  window.setTimeout(function () {
    if (floatingCard !== activeHeroTransition) {
      return;
    }

    waitForHeroModalReveal(revealToken, function () {
      if (floatingCard !== activeHeroTransition) {
        return;
      }

      floatingCard.style.opacity = "0";

      window.setTimeout(function () {
        revealHeroModalContent();
      }, 220);

      window.setTimeout(function () {
        if (floatingCard.parentNode) {
          floatingCard.parentNode.removeChild(floatingCard);
        }

        if (activeHeroTransition === floatingCard) {
          activeHeroTransition = null;
        }
      }, 620);
    });
  }, 420);
}

function getHeroTransitionTargetRect(sourceRect, targetRect) {
  const sourceAspectRatio = sourceRect.width / sourceRect.height;
  const maxWidth = targetRect.width * 0.82;
  const maxHeight = targetRect.height * 0.92;
  let width = Math.min(maxWidth, maxHeight * sourceAspectRatio);
  let height = width / sourceAspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * sourceAspectRatio;
  }

  return {
    left: targetRect.left + (targetRect.width - width) / 2,
    top: targetRect.top + (targetRect.height - height) / 2,
    width: width,
    height: height
  };
}

function waitForHeroModalReveal(revealToken, callback) {
  if (revealToken !== activeHeroRevealToken) {
    return;
  }

  if (heroModal?.dataset.modelReady === String(revealToken)) {
    if (typeof callback === "function") {
      callback();
    }

    return;
  }

  window.setTimeout(function () {
    waitForHeroModalReveal(revealToken, callback);
  }, 40);
}

function markHeroModelReady(revealToken) {
  if (!heroModal || revealToken !== activeHeroRevealToken) {
    return;
  }

  heroModal.dataset.modelReady = String(revealToken);
}

function revealHeroModalContent() {
  if (!heroModal) {
    return;
  }

  heroModal.classList.remove("is-entering");
}

function cleanupHeroTransition() {
  if (heroModal) {
    delete heroModal.dataset.modelReady;
  }

  if (!activeHeroTransition) {
    return;
  }

  if (activeHeroTransition.parentNode) {
    activeHeroTransition.parentNode.removeChild(activeHeroTransition);
  }

  activeHeroTransition = null;
}

function lockBodyScroll() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = "hidden";
  document.body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : "";
}

function unlockBodyScroll() {
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
}

function openPaymentModal(title, message) {
  if (!paymentModal) {
    return;
  }

  paymentModalTitle.textContent = title;
  paymentModalText.textContent = message;
  paymentModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closePaymentModal() {
  if (!paymentModal) {
    return;
  }

  paymentModal.hidden = true;
  document.body.style.overflow = "";
}

function openFigurineModal() {
  if (!figurineModal) {
    return;
  }

  figurineModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeFigurineModal() {
  if (!figurineModal) {
    return;
  }

  figurineModal.hidden = true;
  document.body.style.overflow = "";
}

function handlePaymentWorkflow(method, details) {
  const normalizedMethod = String(method || "").toLowerCase();

  if (normalizedMethod === "facebook") {
    const message = encodeURIComponent([
      "Hello Playforge Entertainment!",
      `I would like to complete a Facebook payment request for invoice ${details.invoiceNumber || "pending-invoice"}.`,
      `Package: ${details.packageSummary || "No package summary provided"}`,
      `Pretax Total: $${details.pretaxSales || "0.00"}`,
      `Email: ${details.email || "No email provided"}`
    ].join("\n"));

    window.open(`https://www.facebook.com/PlayforgeEntertainment/?sk=messages&app=fbl${message ? `&ref=${message}` : ""}`, "_blank", "noopener");
    return;
  }

  if (normalizedMethod === "venmo") {
    openPaymentModal("Venmo", "Venmo payment flow is coming soon. For now, please save your invoice number and we will keep your request ready while we finish this checkout path.");
    return;
  }

  if (normalizedMethod === "paypal") {
    openPaymentModal("PayPal", "PayPal payment flow is coming soon. For now, please save your invoice number and we will keep your request ready while we finish this checkout path.");
  }
}