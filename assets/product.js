/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class ProductForm extends HTMLElement {
  constructor() {
    super();

    this.form = this.querySelector("form");
    this.button = this.form.querySelector('button[name="add"]');
    this.formData = new FormData(this.form);
    this.form.addEventListener("submit", this.onSubmit.bind(this));
  }

  async onSubmit(event) {
    event.preventDefault();

    this.addQtyBreaks();
    this.addUpsells();

    this.button.classList.add("loading");
    this.button.disabled = true;
    this.button.setAttribute("aria-busy", "true");

    await document.querySelector("cart-component").add(this.formData);

    this.button.classList.remove("loading");
    this.button.disabled = false;
    this.button.setAttribute("aria-busy", "false");
  }

  addQtyBreaks() {
    let variantIds = this.querySelector('input[name*="qty-breaks"]:checked')?.value;
    if (!variantIds) return;

    this.formData.delete("id");
    this.formData.delete("quantity");

    variantIds = variantIds.split(",");

    variantIds.forEach((variant, index) => {
      this.formData.append(`items[qty-breaks-${index}][id]`, variant);
      this.formData.append(`items[qty-breaks-${index}][quantity]`, 1);
    });
  }

  addUpsells() {
    const upsells = Array.from(this.form.querySelectorAll('[name*="upsell"]')).reduce((acc, input) => {
      if (input.checked) {
        acc.push({
          id: Number(input.value),
          quantity: Number(input.dataset.quantity || 1),
        });
      }
      return acc;
    }, []);

    upsells.forEach((item, index) => {
      this.formData.append(`items[upsells-${index}][id]`, item.id);
      this.formData.append(`items[upsells-${index}][quantity]`, item.quantity);
    });
  }
}
customElements.define("product-form", ProductForm);

class ProductOptions extends HTMLElement {
  constructor() {
    super();

    this.form = this.closest("form");
    this.variantsData = this.getVariantsData();
    this.productOptions = this.querySelectorAll('[name*="option"]');

    this.productOptions.forEach((option) => option.addEventListener("change", this.onChange.bind(this)));

    this.handleOptionsAvailability();
  }

  getVariantsData() {
    const script = this.querySelector("[data-product-variants-json]");
    if (!script) return null;
    return JSON.parse(script.textContent);
  }

  async onChange() {
    const selectedOptions = Array.from(this.productOptions)
      .filter((elem) => (elem.type === "radio" && elem.checked) || elem.type === "select-one")
      .map((elem) => elem.value);

    const selectedVariant = this.variantsData.find((variant) => JSON.stringify(variant.options) === JSON.stringify(selectedOptions));
    console.log("selectedVariant", selectedVariant);

    this.adjustButtons(selectedVariant);

    if (selectedVariant) {
      this.form.querySelector('[name="id"]').value = selectedVariant.id;

      if (this.closest('body[data-page-type="product"]')) {
        const url = new URL(window.location);
        url.searchParams.set("variant", selectedVariant.id);
        window.history.replaceState({}, "", url);
      }

      this.handleOptionsAvailability();
      this.adjustPricing(selectedVariant);

      window.dispatchEvent(
        new CustomEvent("variant:change", {
          detail: selectedVariant,
        }),
      );

      const respoonse = await fetch(`${this.form.dataset.productUrl}?variant=${selectedVariant.id}`);
      const text = await respoonse.text();
      const newDoc = new DOMParser().parseFromString(text, "text/html");

      window.dispatchEvent(
        new CustomEvent("variant:newDoc", {
          detail: newDoc,
        }),
      );
    }
  }

  adjustPricing(selectedVariant) {
    if (!selectedVariant) return;

    const priceContainer = this.form.querySelector(".price");
    if (!priceContainer) return;

    priceContainer.setAttribute("data-has-price-compare", selectedVariant.compare_at_price > selectedVariant.price);
    priceContainer.setAttribute("data-sold-out", !selectedVariant.available);

    priceContainer.querySelectorAll("[data-compare-price]").forEach((elem) => {
      elem.textContent = window.Shopify.formatMoney(selectedVariant.compare_at_price);
    });

    priceContainer.querySelectorAll("[data-price]").forEach((elem) => {
      elem.textContent = window.Shopify.formatMoney(selectedVariant.price);
    });

    priceContainer.querySelectorAll(".badge-sale").forEach((elem) => {
      const text = elem.dataset.text;
      const discountType = elem.dataset.discountType;
      let savings = "";
      if (discountType === "percentage") {
        savings = 100 - Math.round((selectedVariant.price / selectedVariant.compare_at_price) * 100) + "%";
      } else {
        savings = window.Shopify.formatMoney(selectedVariant.compare_at_price - selectedVariant.price);
      }
      elem.textContent = text.replace("{{ value }}", savings);
    });
  }

  adjustButtons(selectedVariant) {
    const atcBtn = this.form.querySelector('button[name="add"]');
    const buyBtn = this.form.querySelector('button[name="buy"]');

    if (selectedVariant) {
      if (atcBtn) {
        atcBtn.textContent = selectedVariant.available ? atcBtn.dataset.textAdd : atcBtn.dataset.textSoldOut;
        atcBtn.disabled = !selectedVariant.available;
      }
      if (buyBtn) {
        buyBtn.disabled = !selectedVariant.available;
      }
    } else {
      if (atcBtn) {
        atcBtn.textContent = atcBtn.dataset.textUnavailable;
      }
    }
  }

  handleOptionsAvailability() {
    const selectedOption1 = this.form.querySelector('input[data-option-position="1"]:checked')?.value;
    const selectedOption2 = this.form.querySelector('input[data-option-position="2"]:checked')?.value;
    const selectedOption3 = this.form.querySelector('input[data-option-position="3"]:checked')?.value;

    this.form.querySelectorAll('input[data-option-position="1"]').forEach((input) => {
      const correspondingVariant = this.variantsData.find((variant) => {
        if (selectedOption3) {
          if (variant.option1 === input.value && variant.option2 === selectedOption2 && variant.option3 === selectedOption3) return variant;
        } else if (selectedOption2) {
          if (variant.option1 === input.value && variant.option2 === selectedOption2) return variant;
        } else {
          if (variant.option1 === input.value) return variant;
        }
        return null;
      });

      if (correspondingVariant?.available) {
        input.classList.remove("disabled");
        input.removeAttribute("aria-disabled");
      } else {
        input.classList.add("disabled");
        input.setAttribute("aria-disabled", "true");
      }
    });

    this.form.querySelectorAll('input[data-option-position="2"]').forEach((input) => {
      const correspondingVariant = this.variantsData.find((variant) => {
        if (selectedOption3) {
          if (variant.option2 === input.value && variant.option1 === selectedOption1 && variant.option3 === selectedOption3) return variant;
        } else {
          if (variant.option2 === input.value && variant.option1 === selectedOption1) return variant;
        }
        return null;
      });

      if (correspondingVariant?.available) {
        input.classList.remove("disabled");
        input.removeAttribute("aria-disabled");
      } else {
        input.classList.add("disabled");
        input.setAttribute("aria-disabled", "true");
      }
    });

    this.form.querySelectorAll('input[data-option-position="3"]').forEach((input) => {
      const correspondingVariant = this.variantsData.find((variant) => {
        if (variant.option3 === input.value && variant.option1 === selectedOption1 && variant.option2 === selectedOption2) return variant;
        return null;
      });

      if (correspondingVariant?.available) {
        input.classList.remove("disabled");
        input.removeAttribute("aria-disabled");
      } else {
        input.classList.add("disabled");
        input.setAttribute("aria-disabled", "true");
      }
    });
  }
}
customElements.define("product-options", ProductOptions);

class ProductBuyButton extends HTMLElement {
  constructor() {
    super();

    this.btn = this.querySelector('button[name="buy"]');
    this.form = this.closest("form");

    this.btn.addEventListener("click", this.onClick.bind(this));
  }

  onClick(event) {
    event.preventDefault();

    this.btn.classList.add("loading");
    const variantId = this.form.querySelector('[name="id"]').value;
    const qty = Number(this.form.querySelector('input[name="quantity"]')?.value || 1);
    window.location.href = `${this.dataset.cartUrl}/${variantId}:${qty}`;

    setTimeout(() => {
      this.btn.classList.remove("loading");
    }, 3000);
  }
}
customElements.define("product-buy-button", ProductBuyButton);

class ProductMediaGallery extends HTMLElement {
  constructor() {
    super();

    this.currentIndex = Number(this.dataset.initialIndex);

    this.track = this.querySelector(".product-media-gallery-track");
    this.slides = this.querySelectorAll(".product-media-gallery-slide");
    this.controls = this.querySelectorAll(".product-media-gallery-control");
    this.pagination = this.querySelector(".product-media-gallery-pagination");
    this.thumbs = this.querySelectorAll(".product-media-gallery-thumbs button");

    this.handleControls();
    this.updatePagination();
    this.handleThumbs();
    this.handleTouch();
    this.handleKeyboard();
    this.handleSticky();
    this.handleFullScreenGallery();
    this.handleVariantChange();

    this.go(this.currentIndex);
    this.setAttribute("data-init", "");
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.update();
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
    this.update();
  }

  go(index) {
    this.currentIndex = index;
    this.update();
  }

  update() {
    const offset = -this.currentIndex * 100;
    this.track.style.transform = `translateX(${offset}%)`;

    this.slides.forEach((slide, index) => {
      slide.classList.toggle("active", index === this.currentIndex);
      slide.setAttribute("aria-hidden", index !== this.currentIndex);
      slide.querySelector("a")?.setAttribute("tabindex", index === this.currentIndex ? "0" : "-1");
    });

    this.updatePagination();
    this.updateThumbs();
    this.updateThumbsScroll();
  }

  handleControls() {
    this.controls.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.name === "previous") {
          this.prev();
        } else {
          this.next();
        }
      });
    });
  }

  updatePagination() {
    if (!this.pagination) return;
    this.pagination.textContent = `${this.currentIndex + 1}/${this.slides.length}`;
  }

  handleThumbs() {
    this.thumbs.forEach((thumb, index) => {
      thumb.addEventListener("click", () => {
        this.go(index);
      });
    });
  }

  updateThumbs() {
    this.thumbs.forEach((thumb, index) => {
      thumb.classList.toggle("active", index === this.currentIndex);
      thumb.setAttribute("aria-selected", index === this.currentIndex);
    });
  }

  updateThumbsScroll() {
    const track = this.querySelector(".product-media-gallery-thumbs");
    const activeThumb = this.querySelector(".product-media-gallery-thumbs button.active");
    const left = activeThumb.offsetLeft - activeThumb.clientWidth * 2;
    track.scrollTo({ left: left, behavior: "smooth" });
  }

  handleTouch() {
    let startX = 0;
    let endX = 0;

    this.track.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
    });

    this.track.addEventListener("touchmove", (e) => {
      endX = e.touches[0].clientX;
    });

    this.track.addEventListener("touchend", () => {
      if (!startX || !endX) return;
      const swipeDistance = startX - endX;

      if (swipeDistance > 10) {
        this.next();
      } else if (swipeDistance < -10) {
        this.prev();
      }
    });
  }

  handleKeyboard() {
    this.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") this.prev();
      else if (event.key === "ArrowRight") this.next();
    });
  }

  handleSticky() {
    if (window.matchMedia("(min-width: 1200px)").matches) {
      const headerGroup = document.querySelector("#header-group.sticky");

      let oldScroll = window.scrollY;

      window.addEventListener("scroll", () => {
        const newScroll = window.scrollY;
        if (newScroll > oldScroll) {
          if (newScroll > headerGroup.clientHeight) {
            this.style.top = "20px";
          }
        } else if (newScroll < oldScroll) {
          this.style.top = `${headerGroup.clientHeight + 20}px`;
        }

        oldScroll = Math.max(window.scrollY, 0);
      });
    }
  }

  handleFullScreenGallery() {
    const dialog = this.closest(".product-media-gallery-wrapper").querySelector("dialog");
    if (!dialog) return;

    window.addEventListener("dialog:open", (event) => {
      if (event.detail.dialog.id !== dialog.id) return;

      const index = Number(event.detail.triggerElement.dataset.index || 0);
      const item = dialog.querySelectorAll(".product-media-gallery-modal-item")[index];
      const dialogHeight = dialog.clientHeight;
      const top = item.offsetTop + (item.clientHeight - dialogHeight) / 2;
      dialog.scrollTo({ top: top, behavior: "smooth" });
    });
  }

  handleVariantChange() {
    window.addEventListener(
      "variant:change",
      (event) => {
        const selectedVariant = event.detail;
        if (selectedVariant.featured_media) {
          this.go(selectedVariant.featured_media.position - 1);
        }
      },
      false,
    );
  }
}
customElements.define("product-media-gallery", ProductMediaGallery);

class ProductQtySwitcher extends HTMLElement {
  constructor() {
    super();

    this.qtyInput = this.querySelector("input");
    this.minusBtn = this.querySelector("[name='decrease']");
    this.plusBtn = this.querySelector("[name='increase']");

    this.qtyInput.addEventListener("change", () => this.onQtyInputChange());
    this.minusBtn.addEventListener("click", () => this.onMinusBtnClick());
    this.plusBtn.addEventListener("click", () => this.onPlusBtnClick());

    this.handleVariantChange();
  }

  onQtyInputChange() {
    this.validateButtons();
  }

  onMinusBtnClick() {
    this.qtyInput.value = Number(this.qtyInput.value) - 1;
    this.validateButtons();
    this.qtyInput.dispatchEvent(new CustomEvent("change"));
  }

  onPlusBtnClick() {
    this.qtyInput.value = Number(this.qtyInput.value) + 1;
    this.validateButtons();
    this.qtyInput.dispatchEvent(new CustomEvent("change"));
  }

  validateButtons() {
    if (this.qtyInput.getAttribute("min") && Number(this.qtyInput.value) <= Number(this.qtyInput.getAttribute("min"))) {
      this.minusBtn.disabled = true;
      this.qtyInput.value = this.qtyInput.getAttribute("min");
    } else {
      this.minusBtn.disabled = false;
    }
    if (this.qtyInput.getAttribute("max") && Number(this.qtyInput.value) >= Number(this.qtyInput.getAttribute("max"))) {
      this.plusBtn.disabled = true;
      this.qtyInput.value = this.qtyInput.getAttribute("max");
    } else {
      this.plusBtn.disabled = false;
    }
  }

  handleVariantChange() {
    window.addEventListener("variant:newDoc", async (event) => {
      const newDoc = event.detail;
      if (!newDoc) return;

      this.replaceWith(newDoc.querySelector(`[id*="product-qty-switcher-${this.dataset.id}"]`));
    });
  }

  onVariantChange(event) {
    if (!this.closest(".product-block-atc")) return;

    const newDoc = event.detail;
    const newQtyInput = newDoc.querySelector(".product-block-atc .qty-switcher input");

    this.qtyInput.setAttribute("max", newQtyInput.getAttribute("max"));
    this.validateButtons();
  }
}
customElements.define("product-qty-switcher", ProductQtySwitcher);

class InventoryBar extends HTMLElement {
  constructor() {
    super();

    this.progressBar = this.querySelector(".progress-bar");
    this.animate();

    window.addEventListener("variant:change", async () => {
      this.style.opacity = ".25";
    });

    window.addEventListener("variant:newDoc", async (event) => {
      const newDoc = event.detail;
      if (!newDoc) return;

      this.replaceWith(newDoc.querySelector(`[id*="inventory-bar-${this.dataset.blockId}"]`));
      this.animate();
    });
  }

  animate() {
    setTimeout(() => {
      this.progressBar.style.width = this.progressBar.dataset.width;
    }, 250);
  }

  handleVariantChange() {}
}
customElements.define("inventory-bar", InventoryBar);

class ProductQtyBreaks extends HTMLElement {
  constructor() {
    super();

    this.animateAtcButton();
    this.handleOptionChange();
    this.updateOnVariantChange();
  }

  animateAtcButton() {
    this.querySelectorAll("input[type='radio']").forEach((input) => {
      input.addEventListener("change", () => {
        const atcBtn = this.closest("form").querySelector('button[name="add"]');
        if (!atcBtn) return;

        setTimeout(() => {
          atcBtn.classList.add("animate");
        }, 250);

        setTimeout(() => {
          atcBtn.classList.remove("animate");
        }, 1500);
      });
    });
  }

  handleOptionChange() {
    this.querySelectorAll(".product-qty-break-variants select").forEach((select) => {
      select.addEventListener("change", () => {
        const group = select.closest(".product-qty-break");
        const discount = Number(group.dataset.discount);

        let totalPrice = 0;
        let selectedVariants = "";

        group.querySelectorAll(".product-qty-break-variant").forEach((elem) => {
          const selectedOptions = Array.from(elem.querySelectorAll("select")).reduce((options, select) => [...options, select.value], []);
          console.log("selectedOptions", selectedOptions);

          const variantData = this.closest("product-form").querySelector("product-options").variantsData;
          const selectedVariant = variantData.find((variant) => JSON.stringify(variant.options) === JSON.stringify(selectedOptions));

          if (selectedVariant) {
            totalPrice += selectedVariant.price;
            selectedVariants += `${selectedVariant.id},`;
          }
        });

        group.querySelector("[data-total").textContent = window.Shopify.formatMoney((totalPrice * (100 - discount)) / 100);

        if (discount > 0) {
          group.querySelector("[data-compare-total").textContent = window.Shopify.formatMoney(totalPrice);
        }

        group.querySelector("input[type='radio']").value = selectedVariants.slice(0, -1);
      });
    });
  }

  updateOnVariantChange() {
    window.addEventListener("variant:change", async () => {
      this.style.opacity = ".25";
    });

    window.addEventListener("variant:newDoc", async (event) => {
      const newDoc = event.detail;
      if (!newDoc) return;

      this.replaceWith(newDoc.querySelector(`[id*="product-qty-breaks-${this.dataset.blockId}"]`));
    });
  }
}
customElements.define("product-qty-breaks", ProductQtyBreaks);
