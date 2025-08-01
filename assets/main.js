/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/
console.log("Falcon Pro - Premium Shopify Theme by KondaSoft.com | Learn more at https://www.kondasoft.com");

/*
  Load sections's styles/scripts on demand
*/
document.querySelectorAll("[data-section-css]").forEach((el) => {
  const hrefs = el.dataset.sectionCss.split(",");

  hrefs.forEach((href) => {
    if (document.querySelector(`link[href="${href.trim()}"]`)) return;
    const link = document.createElement("link");
    link.href = href;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  });
});

document.querySelectorAll("[data-section-js]").forEach((el) => {
  const srcs = el.dataset.sectionJs.split(",");

  srcs.forEach((src) => {
    if (document.querySelector(`script[src="${src.trim()}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  });
});

/*
  Shopify's errors messages
*/
document.querySelectorAll(".errors").forEach((element) => {
  element.classList.add("alert");
  element.setAttribute("data-alert-type", "error");
});

/*
  Shopify's challenge page
*/
document.querySelector(".btn.shopify-challenge__button")?.classList.add("btn-primary");

/*
  Viewport detection
*/
document.querySelectorAll("[data-viewport-entered]").forEach((el) => {
  let marginBottom = -100;

  if (el.offsetHeight < 100 || el.dataset.viewportSmall === "true") {
    marginBottom = -30;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.dataset.viewportEntered = "true";
          observer.unobserve(entry.target);

          if (entry.target.dataset.videoAutoplay === "true") {
            const video = entry.target.querySelector("video");
            if (video) {
              video.muted = true;
              video.play();
            }
          }
        }
      });
    },
    {
      rootMargin: `0px 0px ${marginBottom}px 0px`,
    },
  );

  observer.observe(el);
});

/*
  Shopify's money format
*/
window.Shopify.formatMoney = function (cents, format) {
  if (typeof cents === "string") {
    cents = cents.replace(".", "");
  }

  const defaultFormat = window.Shopify.money_format || "${{amount}}";
  const formatString = format || defaultFormat;

  const formatWithDelimiters = (number, precision = 2, thousands = ",", decimal = ".") => {
    if (isNaN(number) || number == null) return "0";

    number = (number / 100).toFixed(precision);
    const [integerPart, decimalPart] = number.split(".");
    const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);

    return decimalPart ? `${formattedInt}${decimal}${decimalPart}` : formattedInt;
  };

  const placeholderMatch = formatString.match(/{{\s*(\w+)\s*}}/);
  if (!placeholderMatch) return cents;

  const placeholder = placeholderMatch[1];
  let value;

  switch (placeholder) {
    case "amount":
      value = formatWithDelimiters(cents, 2);
      break;
    case "amount_no_decimals":
      value = formatWithDelimiters(cents, 0);
      break;
    case "amount_with_comma_separator":
      value = formatWithDelimiters(cents, 2, ".", ",");
      break;
    case "amount_no_decimals_with_comma_separator":
      value = formatWithDelimiters(cents, 0, ".", ",");
      break;
    default:
      value = formatWithDelimiters(cents, 2);
  }

  return formatString.replace(placeholderMatch[0], value);
};

// Resize images
window.Shopify.resizeImage = function (src, size, crop = "") {
  return src
    .replace(
      /_(pico|icon|thumb|small|compact|medium|large|grande|original|1024x1024|2048x2048|master)+\./g,
      "."
    )
    .replace(/\.jpg|\.png|\.gif|\.jpeg/g, (match) => {
      if (crop.length) {
        crop = `_crop_${crop}`;
      }
      return `_${size}${crop}${match}`;
    });
};

// /*
//   Detect (back/forward) navigation
// */
// (() => {
//   const navEntries = performance.getEntriesByType("navigation");
//   if (navEntries.length && navEntries[0].type === "back_forward") {
//     document.body.dataset.navigationType = "back_forward";
//   }
// })();

/*
  Header - sticky header
*/
(() => {
  const header = document.querySelector("#header");
  const headerGroup = document.querySelector("#header-group");

  switch (header.dataset.stickyHeader) {
    case "none":
      return;
    case "scroll-up": {
      headerGroup.classList.add("sticky");
      let lastScrollTop = 0;

      window.addEventListener("scroll", () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > lastScrollTop && currentScroll > headerGroup.clientHeight) {
          headerGroup.classList.add("hide");
        } else {
          headerGroup.classList.remove("hide");
        }
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
      });
      break;
    }
    case "always": {
      headerGroup.classList.add("sticky");
      break;
    }
    default:
      break;
  }
})();

/*
  Header - Mobile menu
*/
(() => {
  const toggler = document.querySelector('[aria-controls="header-mobile-menu"]');
  const menu = document.querySelector("#header-mobile-menu");
  const nav = document.querySelector("#header-mobile-nav");

  const openMenu = () => {
    toggler.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    menu.nextElementSibling.hidden = false;
    document.body.style.overflow = "hidden";

    const top = document.querySelector("#header-group.sticky")?.offsetHeight || 0;
    menu.style.setProperty("--top", `${top}px`);
    menu.nextElementSibling.style.setProperty("--top", `${top}px`);

    document.addEventListener("keydown", handleFocus);
    document.addEventListener("click", handleOutsideClick);
  };

  const closeMenu = () => {
    menu.classList.add("closing");
    menu.addEventListener(
      "animationend",
      () => {
        toggler.setAttribute("aria-expanded", "false");
        menu.classList.remove("closing");
        menu.hidden = true;
        menu.nextElementSibling.hidden = true;
        document.body.style.overflow = "";

        menu.style.removeProperty("--top");
        menu.nextElementSibling.style.removeProperty("--top");

        nav.querySelectorAll('[aria-expanded="true"]').forEach((link) => link.setAttribute("aria-expanded", "false"));
        document.removeEventListener("keydown", handleFocus);
        document.removeEventListener("click", handleOutsideClick);
      },
      { once: true },
    );
  };

  nav.querySelectorAll("a[aria-expanded]").forEach((link) => {
    const parentLink = link.closest(".mobile-nav-dropdown")?.previousElementSibling;

    link.addEventListener("click", async (event) => {
      event.preventDefault();
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (link.classList.contains("has-arrow-left")) {
        parentLink.setAttribute("aria-expanded", "false");
      } else {
        link.setAttribute("aria-expanded", "true");
      }
    });
  });

  const handleFocus = (event) => {
    if (event.key === "Tab") {
      if (document.activeElement.closest(".mobile-nav-dropdown")) {
        const dropdown = document.activeElement.closest(".mobile-nav-dropdown");
        const focusableElements = dropdown.querySelectorAll("a", "button");
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (document.activeElement === lastElement && !event.shiftKey) {
          event.preventDefault();
          firstElement.focus();
        } else if (document.activeElement === firstElement && event.shiftKey) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        const focusableElements = menu.querySelectorAll("a", "button");
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (document.activeElement === toggler) {
          if (event.shiftKey) {
            event.preventDefault();
            lastElement.focus();
          } else {
            event.preventDefault();
            firstElement.focus();
          }
        } else if (document.activeElement === lastElement && !event.shiftKey) {
          event.preventDefault();
          toggler.focus();
        } else if (document.activeElement === firstElement && event.shiftKey) {
          event.preventDefault();
          toggler.focus();
        }
      }
    }

    if (event.key === "Enter" || event.key === " ") {
      if (document.activeElement.classList.contains("has-arrow-left")) {
        const parentLink = document.activeElement.closest(".mobile-nav-dropdown").previousElementSibling;
        parentLink.setAttribute("aria-expanded", "false");
        parentLink.focus();
      } else if (document.activeElement.classList.contains("has-arrow-right")) {
        document.activeElement.setAttribute("aria-expanded", "true");
        const dropdown = document.activeElement.nextElementSibling;
        setTimeout(() => dropdown.querySelector("a").focus(), 200);
      }
    }

    if (event.key === "Escape") {
      if (document.activeElement.closest(".mobile-nav-dropdown")) {
        document.activeElement.closest(".mobile-nav-dropdown").previousElementSibling.setAttribute("aria-expanded", "false");
        document.activeElement.closest(".mobile-nav-dropdown").previousElementSibling.focus();
      } else {
        closeMenu();
        toggler.focus();
      }
    }
  };

  const handleOutsideClick = (event) => {
    if (document.querySelector("#header-mobile").contains(event.target) && !toggler.contains(event.target)) {
      closeMenu();
    }
  };

  toggler.addEventListener("click", (event) => {
    event.preventDefault();
    const isExpanded = toggler.getAttribute("aria-expanded") === "true";
    isExpanded ? closeMenu() : openMenu();
  });

  document.addEventListener("shopify:block:select", (event) => {
    if (event.target.querySelector("#header-mobile-menu")) {
      openMenu();
    }
  });
})();

/*
  Header - Desktop menu
*/
(() => {
  document.querySelectorAll("#header-desktop .dropdown-btn").forEach((link) => {
    link.addEventListener("dropdown:open", () => {
      document.body.setAttribute("data-header-dropdown-open", "");
    });
    link.addEventListener("dropdown:close", () => {
      setTimeout(() => {
        if (!document.querySelector('#header-desktop .dropdown-btn[aria-expanded="true"]')) {
          document.body.removeAttribute("data-header-dropdown-open");
        }
      }, 100);
    });
  });
})();

/*
  Footer - fixed footer
*/
(() => {
  const fixedFooter = document.querySelector('#footer[data-fixed-desktop="true"]');
  if (!fixedFooter) return;

  const setMargin = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const footerHeight = document.querySelector("#footer-group").offsetHeight;

    if (window.matchMedia("(min-width: 1200px)").matches && footerHeight < window.innerHeight) {
      document.body.classList.add("has-fixed-footer");
      document.querySelector("#main").style.marginBottom = `${footerHeight}px`;
    } else {
      document.body.classList.remove("has-fixed-footer");
      document.querySelector("#main").style.marginBottom = "0";
    }
  };
  setMargin();
  window.addEventListener("resize", setMargin);
  window.addEventListener("orientationchange", setMargin);
})();


/*
  JudgeMe app - Product reviews
*/
(() => {
  const wrapper = document.querySelector(".shopify-app-block[data-block-handle='review_widget']");
  if (!wrapper) return;

  wrapper.classList.add('container')
})();