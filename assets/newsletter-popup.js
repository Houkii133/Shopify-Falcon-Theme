/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class NewsletterPopup extends HTMLElement {
  constructor() {
    super();

    this.dialog = this.closest("dialog");

    if (window.Shopify.designMode) {
      const show = (event) => {
        if (event.target.querySelector("#newsletter-popup")) {
          this.dialog.showModal();
        }
      };
      document.addEventListener("shopify:section:load", show);
      document.addEventListener("shopify:section:select", show);
    } else if (window.location.href.includes(this.dataset.configPath)) {
      setTimeout(() => {
        this.dialog.showModal();
      }, 500);
    } else {
      if (document.cookie.indexOf("ks-newsletter-popup") === -1) {
        (async () => {
          await new Promise((resolve) => setTimeout(resolve, Number(this.dataset.configDelay) * 1000));
          this.createCookie("ks-newsletter-popup", true, Number(this.dataset.configDaysToWait));
          this.dialog.showModal();
        })();
      }
    }
  }

  createCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }
}
customElements.define("newsletter-popup", NewsletterPopup);
