/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class CartComponent extends HTMLElement {
  constructor() {
    super();

    this.sectionsUrl = window.location.pathname;
    this.sectionsToRender = ["cart-badge", "cart-drawer"];

    this.querySelectorAll('[name="updates[]"]').forEach((input) => {
      input.addEventListener("change", () => {
        this.change(input.dataset.lineItemKey, Number(input.value), input.dataset.focusElementId);
      });
    });

    this.querySelectorAll(".cart-item-remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.change(btn.dataset.lineItemKey, 0);
      });
    });

    this.querySelectorAll(".cart-item-upgrade-to-sub select").forEach((select) =>
      select.addEventListener("change", () => {
        const lineItemKey = select.dataset.lineItemKey;
        const variantId = Number(select.dataset.variantId);
        const quantity = Number(select.dataset.quantity);
        const sellingPlanId = Number(select.value);
        this.upgradeToSubscription(lineItemKey, variantId, quantity, sellingPlanId);
      }),
    );

    document.querySelectorAll('button[name="checkout"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.classList.add("loading");
        setTimeout(() => {
          btn.classList.remove("loading");
        }, 3000);
      });
    });

    this.adjustEmptyContainer();
    this.adjustCollapses();
    this.handleAlert();

    if (window.location.href.includes("?cart")) {
      this.closest('#cart-drawer')?.showModal();
    }
  }

  adjustEmptyContainer() {
    const cartEmpty = this.querySelector(".cart-empty");
    if (!cartEmpty) return;

    const icon = cartEmpty.querySelector(".svg-wrapper svg");
    if (!icon) return;

    const sourceIcon = document.querySelector("#header-desktop-icons svg.svg-icon-cart");
    if (!sourceIcon) return;

    icon.replaceWith(sourceIcon.cloneNode(true));
  }

  async add(formData) {
    this.classList.add("loading");

    let response;

    if (formData instanceof FormData) {
      formData.append("sections_url", this.sectionsUrl);
      formData.append("sections", this.sectionsToRender);

      response = await fetch(`${this.dataset.routeAdd}.js`, {
        method: "POST",
        body: formData,
      });
    } else {
      formData.sections_url = this.sectionsUrl;
      formData.sections = this.sectionsToRender;

      response = await fetch(`${this.dataset.routeAdd}.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
    }

    console.log(response);
    const data = await response.json();
    console.log(data);

    this.classList.remove("loading");

    if (response.ok) {
      window.dispatchEvent(new CustomEvent("cart:added", { detail: data }));
      this.renderCart(data.sections);
    } else {
      window.dispatchEvent(new CustomEvent("cart:error", { detail: data }));
    }

    document.querySelector("#cart-drawer")?.showModal();
  }

  async change(id, quantity, focusElementId) {
    this.classList.add("loading");

    const response = await fetch(`${this.dataset.routeChange}.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        quantity,
        sections: this.sectionsToRender,
        sections_url: this.sectionsUrl,
      }),
    });
    console.log(response);
    const data = await response.json();
    console.log(data);

    this.classList.remove("loading");

    if (response.ok) {
      window.dispatchEvent(new CustomEvent("cart:changed", { detail: data }));
      this.renderCart(data.sections);

      if (focusElementId) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const focusElement = document.querySelector(`#cart-component [data-focus-element-id="${focusElementId}"]`);
        if (focusElement) {
          focusElement.focus();
        }
      }
    } else {
      window.dispatchEvent(new CustomEvent("cart:error", { detail: data }));
    }
  }

  renderCart(sections) {
    for (const [key, value] of Object.entries(sections)) {
      switch (key) {
        case "cart-badge":
          document.querySelectorAll("[data-badge='cart']").forEach((elem) => {
            const newDoc = new DOMParser().parseFromString(value, "text/html");
            elem.replaceWith(newDoc.querySelector("[data-badge='cart']"));
          });

          break;
        case "cart-drawer":
          {
            const newDoc = new DOMParser().parseFromString(value, "text/html");

            document.querySelector("cart-component").replaceWith(newDoc.querySelector("cart-component"));
            document.querySelector("#cart-items-variant-switcher-modals").replaceWith(newDoc.querySelector("#cart-items-variant-switcher-modals"));
            document.querySelector("#cart-drawer-title").textContent = newDoc.querySelector("#cart-drawer-title").textContent;
            document.querySelector("#cart-drawer .dialog-footer").replaceWith(newDoc.querySelector("#cart-drawer .dialog-footer"));
            document.querySelector("#cart-status").textContent = newDoc.querySelector("#cart-status").textContent;
          }
          break;
      }
    }

    window.dispatchEvent(new CustomEvent("cart:rendered"));
  }

  async upgradeToSubscription(lineItemKey, variantId, quantity, sellingPlanId) {
    await this.change(lineItemKey, 0);
    await this.add({
      items: [
        {
          id: variantId,
          quantity: quantity,
          selling_plan: sellingPlanId,
        },
      ],
    });
  }

  handleAlert() {
    const alert = document.querySelector("#cart-alert");
    const text = alert.querySelector("[data-text]");

    window.addEventListener("cart:error", (event) => {
      const error = event.detail;
      if (error.message === error.description) {
        text.innerHTML = `${error.description}`;
      } else {
        text.innerHTML = `<b>${error.message}</b> - ${error.description}`;
      }
      alert.setAttribute("data-alert-type", "error");
      alert.classList.remove("visually-hidden");
    });

    const clearAlert = () => {
      text.innerHTML = "";
      alert.removeAttribute("data-alert-type");
      alert.classList.add("visually-hidden");
    };

    window.addEventListener("cart:added", clearAlert);
    window.addEventListener("cart:changed", clearAlert);
  }

  adjustCollapses() {
    const dialogBody = this.closest(".dialog-body");
    if (!dialogBody) return;

    document.addEventListener("click", (event) => {
      if (this.contains(event.target) && event.target.closest("summary")) {
        setTimeout(() => {
          dialogBody.scroll({ top: dialogBody.scrollHeight, behavior: "smooth" });
        }, 250);
      }
    });
  }
}
customElements.define("cart-component", CartComponent);

class LineItemQtySwitcher extends HTMLElement {
  constructor() {
    super();

    this.qtyInput = this.querySelector("input");
    this.minusBtn = this.querySelector("button[name='decrease']");
    this.plusBtn = this.querySelector("button[name='increase']");

    this.minusBtn.addEventListener("click", () => this.onMinusBtnClick());
    this.plusBtn.addEventListener("click", () => this.onPlusBtnClick());
  }

  onMinusBtnClick() {
    this.qtyInput.value = Number(this.qtyInput.value) - 1;
    this.qtyInput.dispatchEvent(new CustomEvent("change"));
  }

  onPlusBtnClick() {
    this.qtyInput.value = Number(this.qtyInput.value) + 1;
    this.qtyInput.dispatchEvent(new CustomEvent("change"));
  }
}
customElements.define("line-item-qty-switcher", LineItemQtySwitcher);

class CartItemVariantSwitcher extends HTMLElement {
  constructor() {
    super();

    this.variantSelect = this.querySelector("select");
    this.button = this.querySelector("button");
    this.variantSelect.addEventListener("change", () => this.onVariantSelectChange());
    this.button.addEventListener("click", this.onSubmit.bind(this));
  }

  onVariantSelectChange() {
    const selectedOption = this.variantSelect.options[this.variantSelect.selectedIndex];

    const variantImage = selectedOption.dataset.variantImage;
    if (variantImage.length) {
      const productImage = this.querySelector(".img-wrapper img");
      productImage.src = variantImage;
    }
  }

  async onSubmit(event) {
    event.preventDefault();

    this.button.classList.add("loading");
    this.button.disabled = true;
    this.button.setAttribute("aria-busy", "true");

    await document.querySelector("cart-component").change(this.dataset.lineItemKey, 0);

    const formData = new FormData();
    formData.append("id", this.variantSelect.value);
    formData.append("quantity", this.dataset.quantity);
    await document.querySelector("cart-component").add(formData);

    this.button.classList.remove("loading");
    this.button.disabled = false;
    this.button.setAttribute("aria-busy", "false");
  }
}
customElements.define("cart-item-variant-switcher", CartItemVariantSwitcher);

class CartGoal extends HTMLElement {
  constructor() {
    super();

    this.progressBar = this.querySelector(".progress-bar");
    this.animate();
  }

  animate() {
    setTimeout(() => {
      this.progressBar.style.width = this.progressBar.dataset.width;
    }, 250);
  }
}
customElements.define("cart-goal", CartGoal);

class CartUpsells extends HTMLElement {
  constructor() {
    super();

    this.querySelectorAll("select[name='id']").forEach((select) => {
      select.addEventListener("change", () => {
        const selectedOption = select.options[select.selectedIndex];

        const variantImage = selectedOption.dataset.variantImage;
        if (variantImage.length) {
          const productImage = select.closest(".cart-upsells-item").querySelector(".img-wrapper img");
          productImage.src = variantImage;
        }
      });
    });
  }
}
customElements.define("cart-upsells", CartUpsells);

class CartNote extends HTMLElement {
  constructor() {
    super();

    this.form = this.querySelector("form");
    this.input = this.querySelector("textarea");
    this.btn = this.querySelector("button");
    this.form.addEventListener("submit", this.onSubmit.bind(this));
  }

  async onSubmit(event) {
    event.preventDefault();

    this.btn.classList.add("loading");
    this.btn.disabled = true;
    this.btn.setAttribute("aria-busy", "true");

    await fetch(`${this.form.action}.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: this.input.value }),
    });

    this.btn.innerHTML = `✓ <span class="visually-hidden">${this.btn.dataset.textNoteSaved}</span>`;

    setTimeout(() => {
      this.btn.innerHTML = this.btn.dataset.textBtnSave;
    }, 3000);

    this.btn.classList.remove("loading");
    this.btn.disabled = false;
    this.btn.removeAttribute("aria-busy");
  }
}
customElements.define("cart-note", CartNote);

class CartDiscount extends HTMLElement {
  constructor() {
    super();

    this.sectionsUrl = window.location.pathname;
    this.sectionsToRender = ["cart-drawer"];

    this.form = this.querySelector("form");
    this.input = this.querySelector("input");
    this.btn = this.querySelector("button");
    this.form.addEventListener("submit", this.onSubmit.bind(this));

    this.querySelectorAll('.cart-discount-list button').forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        this.removeDiscount();
      });
    });
  }

  async onSubmit(event) {
    event.preventDefault();

    if (!this.input.value.length) return;

    this.btn.classList.add("loading");
    this.btn.disabled = true;
    this.btn.setAttribute("aria-busy", "true");

    const response = await fetch(`${this.form.action}.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [this.input.name]: this.input.value,
        sections: this.sectionsToRender,
        sections_url: this.sectionsUrl,
      }),
    });

    console.log(response);
    const data = await response.json();
    console.log(data);

    const isApplicable = data.discount_codes[0]?.applicable;

    if (isApplicable) {
      this.btn.innerHTML = `✓ <span class="visually-hidden">${this.btn.dataset.textApplied}</span>`;
      setTimeout(() => {
        document.querySelector("cart-component").renderCart(data.sections);
      }, 1000);
      this.input.value = "";

      setTimeout(() => {
        this.btn.innerHTML = this.btn.dataset.textApply;
      }, 3000);
    } else {
      const alert = this.querySelector(".alert");
      alert.setAttribute("data-alert-type", "error");
      alert.hidden = false;

      setTimeout(() => {
        alert.hidden = true;
        alert.removeAttribute("data-alert-type");
      }, 5000);
      this.btn.innerHTML = this.btn.dataset.textApply;
    }

    this.btn.classList.remove("loading");
    this.btn.disabled = false;
    this.btn.removeAttribute("aria-busy");
  }

  async removeDiscount() {
    this.btn.classList.add("loading");
    this.btn.disabled = true;
    this.btn.setAttribute("aria-busy", "true");

    const response = await fetch(`${this.form.action}.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [this.input.name]: '',
        sections: this.sectionsToRender,
        sections_url: this.sectionsUrl,
      }),
    });

    console.log(response);
    const data = await response.json();
    console.log(data);

    document.querySelector("cart-component").renderCart(data.sections);

    this.btn.classList.remove("loading");
    this.btn.disabled = false;
    this.btn.removeAttribute("aria-busy");
  }
}
customElements.define("cart-discount", CartDiscount);

class CartShippingCalculator extends HTMLElement {
  constructor() {
    super();

    this.country = this.querySelector("#shipping-calculator-country");
    this.province = this.querySelector("#shipping-calculator-province");
    this.zip = this.querySelector("#shipping-calculator-zip");
    this.alert = this.querySelector("#shipping-calculator-alert");

    this.form = this.querySelector("form");
    this.btn = this.form.querySelector("button");
    this.form.addEventListener("submit", this.onSubmit.bind(this));

    this.init();
    this.handleAllowedCountries();
  }

  async init() {
    const script = document.createElement("script");
    script.src = this.dataset.shopifyCommonJs;
    document.head.appendChild(script);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    new window.Shopify.CountryProvinceSelector("shipping-calculator-country", "shipping-calculator-province", {
      hideElement: "shipping-calculator-province-wrapper",
    });
  }

  async onSubmit(event) {
    event.preventDefault();

    this.btn.classList.add("loading");
    this.btn.disabled = true;
    this.btn.setAttribute("aria-busy", "true");

    const firstRes = await fetch(`/cart/prepare_shipping_rates.json?shipping_address[zip]=${this.zip.value}&shipping_address[country]=${this.country.value}&shipping_address[province]=${this.province.value}`, {
      method: "POST",
    });
    console.log(firstRes);

    if (firstRes.ok) {
      const secondRes = await fetch(`/cart/async_shipping_rates.json?shipping_address[zip]=${this.zip.value}&shipping_address[country]=${this.country.value}&shipping_address[province]=${this.province.value}`);
      console.log(secondRes);

      const data = await secondRes.json();
      console.log(data);

      let list = "";

      if (data.shipping_rates && data.shipping_rates.length) {
        data.shipping_rates.forEach((elem) => {
          list += `
            <li>
              <strong>${elem.presentment_name}</strong>: ${elem.price} ${elem.currency}
            </li>
          `;
        });

        this.alert.innerHTML = `
          <ul>
            ${list}
          </ul>
        `;
        this.alert.setAttribute("data-alert-type", "success");
        this.alert.removeAttribute("hidden");
      } else {
        this.alert.innerHTML = `
          <p>
            ${this.alert.dataset.textNoResults}
          </p>
        `;
        this.alert.setAttribute("data-alert-type", "warning");
        this.alert.removeAttribute("hidden");
      }
    } else {
      const data = await firstRes.json();
      console.log(data);

      let list = "";

      for (const [key, value] of Object.entries(data)) {
        list += `
          <li>
            <b>${key}</b>: ${value.toString()}
          </li>
        `;
      }

      this.alert.innerHTML = `
        <ul>
          ${list}
        </ul>
      `;
      this.alert.setAttribute("data-alert-type", "error");
      this.alert.removeAttribute("hidden");
    }

    this.btn.classList.remove("loading");
    this.btn.disabled = false;
    this.btn.removeAttribute("aria-busy");
  }

  handleAllowedCountries() {
    const allowedCountries = this.dataset.allowedCountries ? this.dataset.allowedCountries.split(",").map((country) => country.trim()) : [];
    
    if (allowedCountries.length) {
      const options = Array.from(this.country.options);
      options.forEach((option) => {
        if (!allowedCountries.includes(option.value)) {
          option.remove();
        }
      });
    }
  }
}
customElements.define("cart-shipping-calculator", CartShippingCalculator);

class CartDeliveryDate extends HTMLElement {
  constructor() {
    super();

    this.input = this.querySelector("input");
    this.alert = this.querySelector(".alert");

    this.input.addEventListener("change", this.onChange.bind(this));
  }

  async onChange() {
    if (this.input.value.length) {
      const value = this.input.value;
      this.alert.innerHTML = `<p>${this.alert.dataset.text}: <strong>${value}</strong></p>`;
      this.alert.hidden = false;
    } else {
      this.alert.hidden = true;
      this.alert.innerHTML = "";
    }

    const attributeName = this.input.name.split("cart[")[1].split("]")[0];

    const response = await fetch(`${this.dataset.routeUpdate}.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attributes: {
          [attributeName]: this.input.value,
        },
      }),
    });

    console.log(response);
    const data = await response.json();
    console.log(data);
  }
}
customElements.define("cart-delivery-date", CartDeliveryDate);
