/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class WishlistComponent extends HTMLElement {
  constructor() {
    super();

    this.setCountBadges();
    this.setContent();
    this.adjustButtons();
    this.handleButtons();
    this.adjustEmptyContainer()
    this.handleRemoveAll();
  }

  get wishlist() {
    return JSON.parse(localStorage.getItem("ks-wishlist")) || [];
  }

  set wishlist(array) {
    localStorage.setItem("ks-wishlist", JSON.stringify(array));
  }

  async setProduct(handle) {
    let wishlist = this.wishlist;
    const isWishlisted = this.wishlist.some((elem) => elem.handle === handle);

    if (isWishlisted) {
      wishlist = this.wishlist.filter((elem) => elem.handle !== handle);
    } else {
      const response = await fetch(`/products/${handle}.js`);
      const product = await response.json();
      console.log(product)

      wishlist.push({
        url: product.url,
        id: product.id,
        handle: product.handle,
        title: product.title,
        img_src: product.featured_image,
        img_2_src: product.images[1] || product.featured_image,
        img_alt: product.featured_image.alt,
        compare_at_price: product.compare_at_price,
        price: product.price,
        price_varies: product.price_varies,
        added_at: Date.now(),
      });
    }

    this.wishlist = wishlist;
    this.setCountBadges();
    this.setContent();
    this.adjustButtons();
  }

  setCountBadges() {
    document.querySelectorAll("[data-badge='wishlist']").forEach((elem) => {
      elem.textContent = this.wishlist.length;
      elem.setAttribute('data-count', this.wishlist.length);
    });
    this.closest('dialog')?.setAttribute('data-wishlist-count', this.wishlist.length);
  }

  setContent() {
    const emptyContainer = this.querySelector(".wishlist-empty");
    const productList = this.querySelector(".product-list");
    
    if (this.wishlist.length) {
      let html = "";
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

      this.wishlist.reverse().forEach((product) => {
        html += `
          <li>
            <div class="product-card product-card-horizontal">
              <div class="img-wrapper">
                <img 
                  src="${window.Shopify.resizeImage(product.img_src,`${imgWidth}x${imgHeight}`, "center" )}"
                  class="img-fluid" 
                  alt="${product.img_alt}" 
                  width="${imgWidth}" 
                  height="${imgHeight}" 
                  loading="lazy">
                <img 
                  src="${window.Shopify.resizeImage(product.img_2_src,`${imgWidth}x${imgHeight}`, "center" )}"
                  class="img-fluid" 
                  alt="${product.img_alt}" 
                  width="${imgWidth}" 
                  height="${imgHeight}" 
                  loading="lazy">
              </div>
              <div class="product-card-inner">
                <h3 class="heading h6">
                  <a href="${product.url}">
                    <span>
                      ${product.title}
                    </span>
                  </a>
                </h4>
                <p
                  class="product-card-price price"
                  data-has-price-compare="${product.compare_at_price > product.price ? 'true' : 'false'}"
                  data-price-varies="${product.price_varies}"
                >
                  <s class="price-compare">
                    <span class="visually-hidden"> ${this.dataset.textPriceRegular} &nbsp; </span>
                    ${window.Shopify.formatMoney(product.compare_at_price)}
                  </s>
                  <span class="price-sale">
                    <span class="visually-hidden"> ${this.dataset.textPriceSale} &nbsp; </span>
                    <span class="price-from">
                      ${this.dataset.textPriceFrom}
                    </span>
                    ${window.Shopify.formatMoney(product.price)}
                  </span>
                  <span class="price-regular">
                    <span class="price-from">
                      ${this.dataset.textPriceFrom}
                    </span>
                    ${window.Shopify.formatMoney(product.price)}
                  </span>
                </p>
                <div class="product-card-added-at fs-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" class="me-2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  ${this.calcTimeAgo(product.added_at)}
                </div>
              </div>
              <button 
                class="btn btn-icon wishlist-remove-btn" 
                type="button" 
                data-product-handle="${product.handle}" 
                aria-label="${this.dataset.textRemove}">
                <div class="animated-bin-icon">
                  <span></span>
                  <span></span>
                </div>
              </button>
            </div>
          </li>
        `;
      });

      emptyContainer.hidden = true;
      productList.innerHTML = html;
      productList.hidden = false;

      this.querySelectorAll(".wishlist-remove-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          btn.closest(".product-card").style.opacity = "0.2";
          btn.closest(".product-card").style.pointerEvents = "none";
          await new Promise((resolve) => setTimeout(resolve, 300));
          this.setProduct(btn.dataset.productHandle);
          this.focus();
        });
      });

    } else {
      emptyContainer.hidden = false;
      productList.innerHTML = '';
      productList.hidden = true;
    }
  }

  adjustButtons() {
    document.querySelectorAll(".wishlist-btn").forEach((btn) => {
      const isWishlisted = this.wishlist.some((elem) => elem.handle === btn.dataset.productHandle);
  
      if (isWishlisted) {
        btn.classList.add("active");
        btn.setAttribute("aria-label", this.dataset.textRemove);
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("active");
        btn.setAttribute("aria-label", this.dataset.textAdd);
        btn.setAttribute("aria-pressed", "false");
      }
    });
  }

  handleButtons() {
    document.addEventListener("click", (event) => {
      const btn = event.target.closest(".wishlist-btn");
      if (btn) {
        this.setProduct(btn.dataset.productHandle);
      }
    });
  }

  adjustEmptyContainer() {
    const container = this.querySelector(".wishlist-empty");
    if (!container) return;

    const icon = container.querySelector(".svg-wrapper svg");
    if (!icon) return;

    const sourceIcon = document.querySelector("#header-desktop-icons svg.svg-icon-heart");
    if (!sourceIcon) return;

    icon.replaceWith(sourceIcon.cloneNode(true))  
  }

  handleRemoveAll() {
    document.querySelectorAll("button[name='wishlist-remove-all']").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        this.wishlist = [];
        this.setCountBadges();
        this.setContent();
        this.adjustButtons();
        this.focus();
      });
    })
  }

  calcTimeAgo (timestamp) {
    const now = new Date().getTime();
    const diff = now - timestamp;

    let text;

    if (diff < 60000) {
      text = this.dataset.textMoments;
    } else if (diff < 3.6e6) {
      const min = Math.round(diff / 60000);
      text =
        min === 1
          ? `${min} ${this.dataset.textMinute}`
          : `${min} ${this.dataset.textMinutes}`;
    } else if (diff < 8.64e7) {
      const hours = Math.round(diff / 3.6e6);
      text =
        hours === 1
          ? `${hours} ${this.dataset.textHour}`
          : `${hours} ${this.dataset.textHours}`;
    } else {
      const days = Math.round(diff / 8.64e7);
      text =
        days === 1
          ? `${days} ${this.dataset.textDay}`
          : `${days} ${this.dataset.textDays}`;
    }

    return `${text} ${this.dataset.textAgo}`;
  };
}
customElements.define('wishlist-component', WishlistComponent);
