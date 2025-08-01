/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class StickyATC extends HTMLElement {
  constructor() {
    super();

    let top = 200;
    const product = document.querySelector(".product");

    if (product) {
      const atcButton = product.querySelector('.product-block[data-type="buy_buttons"]');
      if (atcButton) {
        top = atcButton.getBoundingClientRect().bottom + window.scrollY;
      }
    }

    window.addEventListener("scroll", () => {
      this.classList.toggle("show", window.scrollY > top);
    });

    this.adjustBottomPadding();
    this.handleVariantChange();
  }

  async adjustBottomPadding() {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const footerGroup = document.querySelector("#footer-group");

    const func = () => {
      if (document.body.classList.contains("has-fixed-footer") && window.matchMedia("(min-width: 1200px)").matches) {
        footerGroup.style.bottom = this.clientHeight + "px";
        document.querySelector("#main").style.marginBottom = this.clientHeight + footerGroup.clientHeight + "px";
      } else {
        document.body.style.paddingBottom = this.clientHeight + "px";
      }
    };
    func();
    window.addEventListener("resize", func);
  }

  handleVariantChange() {
    window.addEventListener("variant:change", (event) => {
      const selectedVariant = event.detail;

      this.querySelector('select[name="id"]').value = selectedVariant.id;
      this.querySelector('select[name="id"]').dispatchEvent(new CustomEvent("change"));
    });
  }
}
customElements.define("sticky-atc", StickyATC);
