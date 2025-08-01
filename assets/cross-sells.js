/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class CrossSells extends HTMLElement {
  constructor() {
    super();

    this.atcButton = this.querySelector('button[name="cross-sells-atc"]');
    this.atcButton.addEventListener("click", this.addToCart.bind(this));

    this.querySelectorAll(".cross-sells-secondary-list input[type='checkbox']").forEach((checkbox, index) => {
      checkbox.addEventListener("change", () => {
        this.querySelector(`.cross-sells-list-images-item:nth-child(${index + 1}) .cross-sells-list-images-item-inner`).classList.toggle("active", checkbox.checked);
        
        this.handleLogic();
      });
    });

    this.querySelectorAll(".cross-sells-secondary-list select").forEach((select, index) => {
      select.addEventListener("change", () => {
        const selectedOption = select.options[select.selectedIndex];

        const variantImage = selectedOption.dataset.variantImage;
        if (variantImage.length) {
          const productImage = this.querySelector(`.cross-sells-list-images-item:nth-child(${index + 1}) img`);
          productImage.src = variantImage;
        }

        const variantComparePrice = selectedOption.dataset.variantComparePrice;
        const variantPrice = selectedOption.dataset.variantPrice;

        select.closest(".cross-sells-secondary-list-item").querySelector("input[type='checkbox']").value = selectedOption.value;
        select.closest(".cross-sells-secondary-list-item").querySelector("[data-price-compare").textContent = window.Shopify.formatMoney(variantComparePrice);
        select.closest(".cross-sells-secondary-list-item").querySelector("[data-price-sale").textContent = window.Shopify.formatMoney(variantPrice);
        select.closest(".cross-sells-secondary-list-item").querySelector("[data-price-regular").textContent = window.Shopify.formatMoney(variantPrice);

        this.handleLogic();
      });
    });

    this.adjustLayout();
  }

  handleLogic() {
    const checkedCheckboxes = this.getCheckedCheckboxes();

    let totalComparePrice = Array.from(checkedCheckboxes).reduce((sum, checkbox) => {
      return sum + Number(checkbox.dataset.comparePrice);
    }, 0);

    let totalPrice = Array.from(checkedCheckboxes).reduce((sum, checkbox) => {
      return sum + Number(checkbox.dataset.price);
    }, 0);

    const discount = Number(this.dataset.discount);
    const discountMinItems = Number(this.dataset.discountMinItems);

    if (discount > 0 && checkedCheckboxes.length >= discountMinItems) {
      totalPrice = ((100 - discount) / 100) * totalPrice;
    }

    this.querySelector("[data-total-compare-price]").textContent = window.Shopify.formatMoney(totalComparePrice);
    this.querySelector("[data-total-price]").textContent = window.Shopify.formatMoney(totalPrice);
    this.querySelector("[data-total-savings]").textContent = `${window.Shopify.formatMoney(totalComparePrice - totalPrice)} (${Math.round((1 - totalPrice / totalComparePrice) * 100 || 0)}%)`;

    const discountAlert = this.querySelector(".cross-sells-footer-discount");

    if (discountAlert) {
      if (checkedCheckboxes.length >= discountMinItems) {
        discountAlert.setAttribute("data-alert-type", "success");
      } else {
        discountAlert.setAttribute("data-alert-type", "warning");
      }
    }

    this.querySelector(".btn-atc").disabled = checkedCheckboxes.length === 0;
  }

  getCheckedCheckboxes() {
    return this.querySelectorAll(".cross-sells-secondary-list input[type='checkbox']:checked");
  }

  adjustLayout() {
    const task = () => {
      const footer = this.querySelector(".cross-sells-footer");
      if (window.matchMedia("(max-width: 1199px)").matches) {
        this.querySelector(".cross-sells-secondary-list").insertAdjacentElement("afterend", footer);
      } else {
        this.querySelector(".cross-sells-list-images").insertAdjacentElement("afterend", footer);
      }
    };
    task();
    window.addEventListener("resize", task);
    window.addEventListener("orientationchange", task);
  }

  async addToCart(event) {
    event.preventDefault();

    const checkedCheckboxes = this.getCheckedCheckboxes();
    const selectedVariants = Array.from(checkedCheckboxes).map((checkbox) => Number(checkbox.value));

    this.atcButton.classList.add("loading");
    this.atcButton.disabled = true;
    this.atcButton.setAttribute("aria-busy", "true");

    const items = selectedVariants.map((variantId) => ({
      id: variantId,
      quantity: 1,
    }));

    await document.querySelector("cart-component").add({ items });

    this.atcButton.classList.remove("loading");
    this.atcButton.disabled = false;
    this.atcButton.setAttribute("aria-busy", "false");
  }
}
customElements.define("cross-sells", CrossSells);
