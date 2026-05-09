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