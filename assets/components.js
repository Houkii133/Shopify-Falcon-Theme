/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class ProductCardForm extends HTMLElement {
  constructor() {
    super();

    this.productCard = this.closest('.product-card');
    this.form = this.querySelector("form");
    this.button = this.form.querySelector('button[name="add"]');
    this.form.addEventListener("submit", this.onSubmit.bind(this));
    this.quickViewContent = this.closest(".quick-view-content");

    this.handleVariantSelector();
    this.handleOptionsSelector();
  }

  async onSubmit(event) {
    event.preventDefault();

    this.button.classList.add("loading");
    this.button.disabled = true;
    this.button.setAttribute("aria-busy", "true");

    const formData = new FormData(this.form);
    await document.querySelector("cart-component").add(formData);

    this.button.classList.remove("loading");
    this.button.disabled = false;
    this.button.setAttribute("aria-busy", "false");
  }

  handleVariantSelector() {
    const selector = this.querySelector("select[name='id']");
    if (!selector) return;
    
    selector.addEventListener("change", () => {
      const selectedOption = selector.options[selector.selectedIndex];
      const variantImage = selectedOption.dataset.variantImage;

      if (this.productCard) {
        if (variantImage.length) {
          this.productCard.querySelector('.img-wrapper img').src = variantImage;
        }

        this.productCard.querySelectorAll('input[name*="color-swatch"]').forEach((input) => {
          if (selectedOption.innerText.includes(input.value)) {
            input.checked = true;
          } else {
            input.checked = false;
          }
        });

        this.appendVariantIdToUrl(selector.value);
      }
    });
  }

  handleOptionsSelector() {
    const script = this.querySelector("[data-product-variants-json]");
    if (!script) return;

    const variantsData = JSON.parse(script.textContent);
    // console.log("Variants data:", variantsData);

    this.querySelectorAll('select[name*="option"]').forEach((select) => {
      select.addEventListener("change", () => {

        const selectedOptions = Array.from(this.querySelectorAll('select[name*="option"]'))
          .map((s) => s.value)

        console.log("Selected options:", selectedOptions);

        const selectedVariant = variantsData.find((variant) => JSON.stringify(variant.options) === JSON.stringify(selectedOptions));
        console.log("Selected variant", selectedVariant);

        const atcBtn = this.querySelector("button[name='add']");

        if (selectedVariant) {
          this.querySelector('[name="id"]').value = selectedVariant.id;

          atcBtn.textContent = selectedVariant.available ? atcBtn.dataset.textAdd : atcBtn.dataset.textSoldOut;
          atcBtn.disabled = !selectedVariant.available;
          
          let priceContainer

          if (this.productCard) {
            priceContainer = this.productCard.querySelector(".price");
          } else if (this.quickViewContent) {
            priceContainer = this.quickViewContent.querySelector(".price");
          }

          if (priceContainer) {
            priceContainer.setAttribute("data-has-price-compare", selectedVariant.compare_at_price > selectedVariant.price);
            priceContainer.setAttribute("data-price-varies", false);

            priceContainer.querySelectorAll("[data-compare-price]").forEach((elem) => {
              elem.textContent = window.Shopify.formatMoney(selectedVariant.compare_at_price);
            });

            priceContainer.querySelectorAll("[data-price]").forEach((elem) => {
              elem.textContent = window.Shopify.formatMoney(selectedVariant.price);
            });
          }
          
          const variantImage = selectedVariant.featured_image ? selectedVariant.featured_image.src : null;
          
          if (variantImage) {
            console.log("Variant image:", variantImage);
            if (this.productCard) {
              const productImage = this.productCard.querySelector(".img-wrapper img");
              productImage.src = window.Shopify.resizeImage(variantImage, `${this.getVariantImageSize().width}x${this.getVariantImageSize().height}`, "center");
            } else if (this.quickViewContent) {
              let index =  0

              if (selectedVariant.featured_image) {
                index = selectedVariant.featured_image.position - 1;
              }

              const slideshow = this.quickViewContent.querySelector("slideshow-component");

              if (slideshow) {
                slideshow.go(index);
              }
            }
          }

          this.querySelectorAll('input[name*="color-swatch"]').forEach((input) => {
            if (selectedOptions.includes(input.value)) {
              input.checked = true;
            } else {
              input.checked = false;
            }
          });
        } else {
          atcBtn.textContent = atcBtn.dataset.textUnavailable;
          atcBtn.disabled = true;
        }
      })
    })
  }

  getVariantImageSize() {
    let imgWidth, imgHeight;

    switch (this.dataset.imgRatio) {
      case "adapt":
        imgWidth = 480;
        imgHeight = '';
        break;
      case "square":
        imgWidth = 480;
        imgHeight = 480;
        break;
      case "portrait":
        imgWidth = 480
        imgHeight = Math.round(480 * 4 / 3);
        break;
    }
    
    return { width: imgWidth, height: imgHeight };
  }

  appendVariantIdToUrl(variantId) {
    const link = this.closest('.product-card').querySelector(".product-card-link");
    if (!link) return;

    const url = new URL(link.href);
    url.searchParams.set("variant", variantId);
    link.href = url.toString();
  }
}
customElements.define("product-card-form", ProductCardForm);

class ProductCardColorSwatches extends HTMLElement {
  constructor() {
    super();

    this.querySelectorAll('input[name*="color-swatch"]').forEach((input) => {
      input.addEventListener("change", () => {
        this.appendVariantIdToUrl(input.dataset.variantId);
  
        const productCard = this.closest('.product-card');

        if (productCard) {
          const variantImage = input.dataset.variantImage;
          if (variantImage.length) {
            const productImage = productCard.querySelector(".img-wrapper img");
            productImage.src = variantImage;
          }

          const variantInput = productCard.querySelector(".shopify-product-form [name='id']");
          if (variantInput) {
            variantInput.value = input.dataset.variantId;
          }
    
          const colorOption = productCard.querySelector(`.shopify-product-form select[data-option-name*="${input.dataset.optionName}"]`);

          if (colorOption) {
            colorOption.value = input.value;
          }
        }
      });
    });
  }

  appendVariantIdToUrl(variantId) {
    const link = this.closest('.product-card').querySelector(".product-card-link");
    if (!link) return;

    const url = new URL(link.href);
    url.searchParams.set("variant", variantId);
    link.href = url.toString();
  }
}
customElements.define("product-card-color-swatches", ProductCardColorSwatches);

class QuickViewModal extends HTMLElement {
  constructor() {
    super();

    this.dialog = this.closest("dialog");
    this.productData = null;

    document.addEventListener("click", async (event) => {
      const btn = event.target.closest("[name='quick-view']");

      if (btn) {
        event.preventDefault();
        btn.classList.add("loading");
        btn.disabled = true;
        btn.setAttribute("aria-busy", "true");
        
        await this.getProductData(btn.dataset.productUrl)
        
        btn.classList.remove("loading");
        btn.disabled = false;
        btn.setAttribute("aria-busy", "false");
      }
    });

    window.addEventListener("dialog:close", (event) => {
      if (event.detail.dialog.id === "quick-view-dialog") {
        this.clearQuickView();
      }
    });
  }

  async getProductData(url) {
    const response = await fetch(url + '.js')
    const data = await response.json();
    if (response.ok) {
      this.productData = data;
      console.log("Product data fetched:", this.productData);
      this.buildQuickView();
      this.dialog.showModal();
    } else {
      console.error("Failed to fetch product data:", response.statusText);
    }
  }

  buildQuickView() {
    const content = this.querySelector(".quick-view-content");
    
    const product = this.productData;
    let imgWidth, imgHeight;

    switch (this.dataset.imgRatio) {
      case "adapt":
        imgWidth = 480;
        imgHeight = '';
        break;
      case "square":
        imgWidth = 480;
        imgHeight = 480;
        break;
      case "portrait":
        imgWidth = 480
        imgHeight = Math.round(480 * 4 / 3);
        break;
    }

    function handleize(str) {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    const slideshowSlides = product.images.map((image, index) => {
      const imgSrc = window.Shopify.resizeImage(image, `${imgWidth}x${imgHeight}`, "center");

      return `
        <div 
          class="slideshow-slide" 
          role="tabpanel" 
          aria-roledescription="slide" 
          aria-label="Slide ${index + 1}">
          <img 
            src="${imgSrc}"
            class="img-fluid"
            alt="Image ${index + 1}"
            width="${imgWidth}"
            height="${imgHeight}"
            loading="eager"
          >
        </div>
      `;
    }).join("");

    const productOptions = product.options.map((option) => {
      const optionsValues = option.values.map((value) => {
        return `<option value="${value}">${value}</option>`;
      }).join("");
      
      return `
        <fieldset>
          <label class="form-label" for="option-${handleize(option.name)}-quick-view">
            ${option.name}
          </label>
          <div class="select-wrapper">
            <select
              id="option-${handleize(option.name)}-quick-view"
              name="option-${handleize(option.name)}-quick-view"
              class="select fs-sm"
              data-option-name="{{ option.name }}"
            >
              ${optionsValues}
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" class="svg-icon-chevron-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6"></path>
            </svg>
          </div>
        </fieldset>
      `;
    }).join("");

    content.innerHTML = `
      <div class="quick-view-content-left">
        <slideshow-component
          class="slideshow"
          style="--speed: 300ms;"
          role="region"
          aria-label="Slideshow of ${product.title}"
          aria-roledescription="slideshow">
          <button
            class="slideshow-control"
            name="previous"
            type="button"
            aria-label="Previous slide">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="svg-icon-chevron-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6"></path>
            </svg>
          </button>
          <div class="slideshow-track" aria-live="polite" aria-atomic="true">
            ${slideshowSlides}
          </div>
          <button
            class="slideshow-control"
            name="next"
            type="button"
            aria-label="Next slide">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="svg-icon-chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6"></path>
            </svg>
          </button>
          <div class="slideshow-pagination" data-pagination-type="fraction">
            <span>1 / ${product.images.length}</span>
          </div>
        </slideshow-component>
      </div>
      <div class="quick-view-content-right">
        <h2 class="heading h3">
          <a href="${product.url}">
            ${product.title}
          </a>
        </h2>
        <div 
          class="price fs-lg"
          data-has-price-compare="${product.compare_at_price > product.price ? 'true' : 'false'}"
          data-price-varies="${product.price_varies ? 'true' : 'false'}">
          <s class="price-compare">
            <span class="visually-hidden"> ${this.dataset.textRegularPrice} &nbsp; </span>
            <span data-compare-price>${window.Shopify.formatMoney(product.compare_at_price)}</span>
          </s>
          <span class="price-sale">
            <span class="visually-hidden"> ${this.dataset.textSalePrice} &nbsp; </span>
            <span class="price-from">
              ${this.dataset.textPriceFrom}
            </span>
            <span data-price>${window.Shopify.formatMoney(product.price)}</span>
          </span>
          <span class="price-regular">
            <span class="price-from">
              ${this.dataset.textPriceFrom}
            </span>
            <span data-price>${window.Shopify.formatMoney(product.price)}</span>
          </span>
        </div>
        <product-card-form class="product-card-form">
          <form method="post" action="/cart/add" accept-charset="UTF-8" class="shopify-product-form" enctype="multipart/form-data" data-productid="${product.id}">
            <input type="hidden" name="form_type" value="product">
            <input type="hidden" name="utf8" value="✓">
            <input type="hidden" name="id" value="${product.variants[0].id}">
            <div class="quick-view-content-product-options" ${product.options.length <= 1 ? 'hidden' : ''}>
              ${productOptions}
            </div>
            <button
              class="btn btn-primary btn-full"
              type="submit"
              name="add"
              data-text-add="${this.dataset.textAddToCart}"
              data-text-sold-out="${this.dataset.textSoldOut}"
              data-text-unavailable="${this.dataset.textUnavailable}"
              ${product.variants[0].available ? '' : 'disabled'}
            >
            ${product.variants[0].available ? this.dataset.textAddToCart : this.dataset.textSoldOut}
            </button>
            <script data-product-variants-json="" type="application/json">
              ${JSON.stringify(product.variants)}
            </script>
          </form>
        </product-card-form>
        <a href="${product.url}" class="btn btn-link btn-sm btn-full">
          ${this.dataset.textProductDetails}
        </a>
      </div>
    `;
  }

  clearQuickView() {
    this.productData = null;
    const content = this.querySelector(".quick-view-content");
    content.innerHTML = "";
  }
}
customElements.define("quick-view-modal", QuickViewModal);

class SlideshowComponent extends HTMLElement {
  constructor() {
    super();

    this.slides = this.querySelectorAll(".slideshow-slide");
    this.currentIndex = 0;
    this.interval = null;

    this.handleControls();
    this.handleAutoplay();
    this.handleTouch();
    this.handleKeyboard();
    this.handleSlidesAccessibility();
    this.animateOnScroll();
    this.handleEditor();
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
    this.querySelector(".slideshow-track").style.transform = `translateX(${offset}%)`;

    this.slides.forEach((slide, index) => {
      slide.classList.toggle("active", index === this.currentIndex);
    });

    this.querySelectorAll(".slideshow-pagination[data-pagination-type='dots'] button").forEach((btn, i) => {
      btn.classList.toggle("active", i === this.currentIndex);
    });

    this.querySelectorAll(".slideshow-pagination[data-pagination-type='fraction'] span").forEach((elem) => {
      elem.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
    });

    this.handleSlidesAccessibility();
  }

  handleControls() {
    this.querySelectorAll(".slideshow-control").forEach((btn) => {
      if (this.slides.length <= 1) {
        btn.disabled = true;
      }

      btn.addEventListener("click", () => {
        if (btn.name === "previous") {
          this.prev();
        } else if (btn.name === "next") {
          this.next();
        }
      });
    });

    this.querySelectorAll(".slideshow-pagination button").forEach((btn, index) => {
      btn.addEventListener("click", () => {
        this.go(index);
      });
    });
  }

  handleAutoplay() {
    if (!this.dataset.autoplay || this.dataset.autoplay === "0") return;
    let interval = null;

    const start = () => {
      clearInterval(interval);
      interval = setInterval(() => this.next(), Number(this.dataset.autoplay) * 1000);
      this.dataset.autoplayStopped = "false";
      this.querySelector(".slideshow-track").setAttribute("aria-live", "off");
    };

    const stop = () => {
      clearInterval(interval);
      this.dataset.autoplayStopped = "true";
      this.querySelector(".slideshow-track").setAttribute("aria-live", "polite");
    };

    start();

    this.addEventListener("focusin", () => stop());
    this.addEventListener("focusout", () => start());
    this.addEventListener("mouseenter", () => stop());
    this.addEventListener("mouseleave", () => start());
    this.addEventListener("touchstart", () => stop());
    this.addEventListener("touchend", () => start());

    this.addEventListener("shopify:block:select", (e) => {
      if (e.target.closest(`[data-section-id="${this.dataset.sectionId}"]`)) stop();
    });
  }

  handleKeyboard() {
    this.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") this.prev();
      else if (event.key === "ArrowRight") this.next();
    });
  }

  handleTouch() {
    let startX = 0;
    let endX = 0;

    this.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
    });

    this.addEventListener("touchmove", (e) => {
      endX = e.touches[0].clientX;
    });

    this.addEventListener("touchend", () => {
      if (!startX || !endX) return;
      const swipeDistance = startX - endX;

      if (swipeDistance > 10) {
        this.next();
      } else if (swipeDistance < -10) {
        this.prev();
      }
    });
  }

  handleSlidesAccessibility() {
    this.slides.forEach((slide, i) => {
      if (i === this.currentIndex) {
        slide.removeAttribute("aria-hidden");
        slide.removeAttribute("tabindex");
        slide.querySelectorAll("a, button").forEach((el) => {
          el.removeAttribute("tabindex");
        });
      } else {
        slide.setAttribute("aria-hidden", "true");
        slide.setAttribute("tabindex", "-1");
        slide.querySelectorAll("a, button").forEach((el) => {
          el.setAttribute("tabindex", "-1");
        });
      }
    });
  }

  animateOnScroll() {
    const slides = this.querySelectorAll(".slideshow-slide");
    if (!slides.length || slides[0].dataset.overlayOpacity === undefined) return;
  
    let ticking = false;
  
    const updateOverlay = () => {
      const top = Math.round(this.getBoundingClientRect().top);
      const bottom = Math.round(this.getBoundingClientRect().bottom);
      const visibilityTop = Math.round(((window.innerHeight - top) / this.clientHeight) * 100);
      const visibilityBottom = Math.round((bottom / this.clientHeight) * 100);
  
      if ((visibilityTop > 0 && visibilityTop < 100) || (visibilityBottom > 0 && visibilityBottom < 100)) {
        slides.forEach((elem) => {
          const overlayOpacity = Number(elem.dataset.overlayOpacity);
          const visibility = visibilityTop > 0 && visibilityTop < 100 ? visibilityTop : visibilityBottom;
          const final = Math.round((100 - overlayOpacity) * (1 - visibility / 100) + overlayOpacity);
          elem.style.setProperty("--overlay-opacity", final + "%");
        });
      }
  
      ticking = false;
    };
  
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(updateOverlay);
        ticking = true;
      }
    });
  }

  handleEditor() {
    document.addEventListener("shopify:block:select", (event) => {
      if (event.target.closest(`[data-section-id="${this.dataset.sectionId}"]`)) {
        this.go(Number(event.target.dataset.index));
      }
    });
  }
}
customElements.define("slideshow-component", SlideshowComponent);

class CarouselComponent extends HTMLElement {
  constructor() {
    super();

    this.track = this.querySelector(".carousel-track");
    this.handleControls();
    this.handleControlsPosition();
    this.handlePagination();
  }

  handleControls() {
    this.querySelectorAll(".carousel-control").forEach((btn) => {
      btn.disabled = this.track.querySelectorAll(".carousel-slide").length <= 1;

      btn.addEventListener("click", () => {
        const firstSlideOffset = this.querySelector(".carousel-slide:nth-child(1)")?.getBoundingClientRect().left;
        const secondSlideOffset = this.querySelector(".carousel-slide:nth-child(2)")?.getBoundingClientRect().left;
        const slideWidth = secondSlideOffset - firstSlideOffset;

        if (btn.name === "previous") {
          if (this.track.scrollLeft <= 16) {
            this.track.scrollTo({ left: this.track.scrollWidth, behavior: "smooth" });
          } else {
            this.track.scrollBy({ left: -slideWidth, behavior: "smooth" });
          }
        } else {
          if (this.track.scrollLeft + this.track.clientWidth >= this.track.scrollWidth - 16) {
            this.track.scrollTo({ left: 0, behavior: "smooth" });
          } else {
            this.track.scrollBy({ left: slideWidth, behavior: "smooth" });
          }
        }
      });
    });
  }

  async handleControlsPosition() {
    if (this.dataset.controlsAdaptToImage !== "true") return;

    await new Promise((resolve) => setTimeout(resolve, 400));
    
    const update = () => {
      const image = this.querySelector(".carousel-slide img") || this.querySelector(".carousel-slide .placeholder-svg");
      if (!image) return;
      const offset = image.clientHeight / 2;
      this.querySelectorAll(".carousel-control").forEach((btn) => {
        btn.style.top = `${offset}px`;
      });
    };
    update();

    window.addEventListener("resize", this.throttle(update, 150));
  }

  handlePagination() {
    const pagination = this.querySelector(".carousel-pagination");
    if (!pagination) return;

    const totalSlides = this.querySelectorAll(".carousel-slide").length;

    const update = () => {
      if (!this.querySelector(".carousel-slide")) return

      const visibleSlides = Math.floor(this.track.clientWidth / this.querySelector(".carousel-slide").clientWidth);
      const firstVisibleSlide = Math.round(this.track.scrollLeft / this.querySelector(".carousel-slide").clientWidth) + visibleSlides;

      pagination.querySelector("span").innerHTML = `${firstVisibleSlide}/${totalSlides}`;
    };
    update();

    this.track.addEventListener("scroll", () => {
      this.throttle(update(), 150);
      this.debounce(update(), 50);
    });

    window.addEventListener("resize", this.throttle(update, 150));

    window.addEventListener("dialog:open", () => {
      update();
    });
  }

  throttle(func, limit) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        func.apply(this, args);
      }
    };
  }

  debounce(func, delay) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }
}
customElements.define("carousel-component", CarouselComponent);

class DialogComponent extends HTMLElement {
  constructor() {
    super();

    this.dialog = this.closest("dialog");
    this.triggerElement = null;

    this.handleOpen();
    this.handleClose();
    this.handleObserver();
  }

  handleOpen() {
    document.body.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-dialog]");
      if (!button) return;

      event.preventDefault();
      const dialogId = button.dataset.openDialog;

      if (dialogId == this.dialog.id) {
        this.triggerElement = button;
        this.dialog.showModal();
      }
    });
  }

  handleClose() {
    const close = () => {
      this.dialog.classList.add("closing");
      this.dialog.addEventListener(
        "transitionend",
        () => {
          this.dialog.classList.remove("closing");
          this.dialog.close();
        },
        { once: true },
      );
    };

    document.body.addEventListener("click", (event) => {
      const button = event.target.closest("[data-dialog-close]");
      if (button && this.contains(button)) {
        close();
      }
    });

    this.dialog.addEventListener("click", (event) => {
      const path = event.composedPath();
      const inner = this.dialog.querySelector(".dialog-inner");

      if (!path.includes(inner)) {
        close();
      }
    });
  }

  handleObserver() {
    const observer = new MutationObserver(() => {
      if (this.dialog.open) {
        document.body.style.overflow = "hidden";
        window.dispatchEvent(
          new CustomEvent("dialog:open", {
            detail: {
              dialog: this.dialog,
              triggerElement: this.triggerElement,
            },
          }),
        );
      } else {
        document.body.style.overflow = "";
        window.dispatchEvent(
          new CustomEvent("dialog:close", {
            detail: {
              dialog: this.dialog,
            },
          }),
        );
      }
    });

    observer.observe(this.dialog, {
      attributes: true,
      attributeFilter: ["open"],
    });
  }
}
customElements.define("dialog-component", DialogComponent);

class DropdownComponent extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector(".dropdown-btn");
    this.content = this.querySelector(".dropdown-content");

    this.button.addEventListener("click", (event) => {
      event.preventDefault();
      this.toggle();
    });
    this.handleAccessibility();
  }

  open() {
    this.button.setAttribute("aria-expanded", true);
    this.button.dispatchEvent(new CustomEvent("dropdown:open", { bubbles: true }));
    this.content.hidden = false;
  }

  close() {
    this.button.setAttribute("aria-expanded", false);
    this.button.dispatchEvent(new CustomEvent("dropdown:close", { bubbles: true }));
    this.content.hidden = true;
  }

  toggle() {
    const isExpanded = this.button.getAttribute("aria-expanded") === "true";
    isExpanded ? this.close() : this.open();
  }

  handleAccessibility() {
    this.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.close();
        this.button.focus();
      }
    });

    this.addEventListener("focusout", (event) => {
      if (event.relatedTarget && !this.contains(event.relatedTarget) && !event.relatedTarget.closest("dialog")) {
        this.close();
      }
    });

    document.addEventListener("click", (event) => {
      if (!this.contains(event.target) && !event.target.closest("dialog")) {
        this.close();
      }
    });
  }
}
customElements.define("dropdown-component", DropdownComponent);

class CollapseComponent extends HTMLElement {
  constructor() {
    super();
    this.details = this.querySelector("details");
    this.summary = this.querySelector("summary");
    this.content = this.querySelector(".collapse-content");
    this.summary.addEventListener("click", this.toggle.bind(this));
    window.addEventListener("resize", this.fixHeight.bind(this));
    this.fixHeight();

    const observer = new MutationObserver(() => {
      this.fixHeight();
    });

    observer.observe(this.content, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    window.addEventListener("dialog:open", () => {
      if (this.closest(".dialog") && this.details.hasAttribute("open")) {
        this.content.style.height = this.content.scrollHeight + "px";
      }
    });
  }

  open() {
    this.details.open = true;
    this.content.style.height = this.content.scrollHeight + "px";
  }

  close() {
    this.content.style.height = "0px";

    this.content.addEventListener(
      "transitionend",
      () => {
        this.content.style.height = "";
        this.details.removeAttribute("open");
      },
      { once: true },
    );
  }

  toggle(event) {
    event.preventDefault();
    const isOpen = this.details.hasAttribute("open");
    isOpen ? this.close() : this.open();
  }

  fixHeight() {
    if (this.details.hasAttribute("open")) {
      this.content.style.height = "auto";
      setTimeout(() => {
        if (this.content.scrollHeight > 0) {
          this.content.style.height = this.content.scrollHeight + "px";
        }
      }, 100);
    }
  }
}
customElements.define("collapse-component", CollapseComponent);

class CountdownComponent extends HTMLElement {
  constructor() {
    super();

    const countdown = Number(this.dataset.countdown);

    if (isNaN(countdown)) {
      return;
    }

    this.myInterval = setInterval(() => {
      const now = new Date().getTime();
      const diff = countdown - now;
      this.update(diff);
    }, 1000);
  }

  update(diff) {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const daysElem = this.querySelector("[data-countdown-days]");
    const hoursElem = this.querySelector("[data-countdown-hours]");
    const minutesElem = this.querySelector("[data-countdown-minutes]");
    const secondsElem = this.querySelector("[data-countdown-seconds]");

    if (days > 0) {
      daysElem.textContent = days;
    } else {
      daysElem?.parentElement.remove();
    }

    if (hours > 0) {
      hoursElem.textContent = hours;
    } else {
      hoursElem?.parentElement.remove();
    }

    minutesElem.textContent = minutes;
    secondsElem.textContent = seconds;

    if (diff < 0) {
      clearInterval(this.myInterval);
      this.remove();
    }
  }
}
customElements.define("countdown-component", CountdownComponent);

class ShareComponent extends HTMLElement {
  constructor() {
    super();

    this.shareButton = this.querySelector(".btn-share");
    this.dropdownComponent = this.querySelector("dropdown-component");

    if (navigator.share) {
      this.shareButton.addEventListener("click", () => {
        navigator.share({
          title: this.shareButton.dataset.title,
          url: window.location.href,
        });
      });
    } else {
      setTimeout(() => {
        this.shareButton.remove();
        this.dropdownComponent.hidden = false;

        const innerButton = this.dropdownComponent.querySelector(".dropdown-content .button");
        innerButton.addEventListener("click", () => {
          navigator.clipboard.writeText(window.location.href);
          innerButton.textContent = innerButton.dataset.textCopied;
        });
      }, 500);
    }
  }
}
customElements.define("share-component", ShareComponent);
