/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class BundleBuilder extends HTMLElement {
  constructor() {
    super();

    this.bundleName = `ks-bundle-${this.dataset.bundleId}`;
    this.buildBundle();
    this.cardStickyPosition()
    this.stickyCardMobile();
    this.handleATC()
    this.handleCheckout()

    this.querySelectorAll('.product-card form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addToBundle(form);
      });
    });

  }

  getBundleContents() {
    return JSON.parse(localStorage.getItem(this.bundleName)) || [];
  }

  bundleQuantity() {
    return this.getBundleContents().reduce((sum, item) => sum + Number(item.quantity), 0);
  }

  bundleTotalPrice() {
    return this.getBundleContents().reduce((sum, item) => sum + (item.variant_price * item.quantity), 0);
  }

  addToBundle (form) {
    const btn = form.querySelector('.btn')
    const select = form.querySelector('select')
    const selectedOption = select.options[select.selectedIndex]
    const quantity = form.querySelector('input[name="quantity"]')?.value || 1;

    let bundleContents = this.getBundleContents();
    const existing = bundleContents.find(item => item.variant_id === Number(selectedOption.value));

    if (existing) {
      existing.quantity = Number(existing.quantity) + Number(quantity);
    } else {
      bundleContents.push({
        product_id: Number(form.dataset.productId),
        product_handle: form.dataset.productHandle,
        product_title: form.dataset.productTitle,
        product_url: form.dataset.productUrl,
        variant_id: Number(selectedOption.value),
        variant_image: selectedOption.dataset.variantImage,
        variant_price: Number(selectedOption.dataset.variantPrice),
        variant_title: selectedOption.dataset.variantTitle,
        quantity: quantity
      })
    }

    localStorage.setItem(this.bundleName, JSON.stringify(bundleContents));

    this.buildBundle()

    btn.textContent = this.dataset.textAddedToBundle

    setTimeout(() => {
      btn.textContent = this.dataset.textAddToBundle
    }, 2000)
  }


  buildBundle() {
    this.querySelectorAll('.bundle-builder-progress').forEach(progress => {
      const maxTierValue = Number(this.dataset.maxTierValue);
      
      if (this.dataset.bundleMode === 'amount') {
        const percent = Math.min(100, Math.round((this.bundleTotalPrice() / maxTierValue) * 100));
        progress.querySelector('.progress-bar').style.width = `${percent}%`;
      } else {
        const percent = Math.min(100, Math.round((this.bundleQuantity() / maxTierValue) * 100));
        progress.querySelector('.progress-bar').style.width = `${percent}%`;
      }

      progress.querySelectorAll('ul li').forEach((elem) => {
        const left = Number(elem.style.left.replace('%', ''));
        const width = Number(progress.querySelector('.progress-bar').style.width.replace('%', ''));
       
        if (left <= width) {
          elem.classList.add('active');
        } else {
          elem.classList.remove('active');
        }
      })
    });

    this.querySelectorAll('.bundle-builder-promo-text').forEach(elem => {
      const bundleMode = this.dataset.bundleMode;
      let text = '';

      if (bundleMode === 'amount') {
        if (this.getNextTier()) {
          text = this.dataset.textPromoAmountHtml
          const nextTierAmount = this.getNextTier().amount * 100;
          const discount = this.getNextTier().discount + '%';
          const amount = window.Shopify.formatMoney(nextTierAmount - this.bundleTotalPrice())
          text = text.replace('{{ amount }}', amount)
          text = text.replace('{{ discount }}', discount)
          elem.classList.remove('text-success');
        } else {
          text = this.dataset.textPromoFinalHtml
          elem.classList.add('text-success');
        }
      } else if (bundleMode === 'quantity') {
        if (this.getNextTier()) {
          text = this.dataset.textPromoQuantityHtml
          const nextTierQuantity = this.getNextTier().quantity;
          const discount = this.getNextTier().discount + '%';
          const count = nextTierQuantity - this.bundleQuantity();
          text = text.replace('{{ count }}', count)
          text = text.replace('{{ discount }}', discount)
          elem.classList.remove('text-success');
        } else {
          text = this.dataset.textPromoFinalHtml
          elem.classList.add('text-success');
        }
      }

      elem.innerHTML = text
    })

    this.querySelectorAll('[data-bundle-builder-subtotal]').forEach(elem => {
      const discount = this.getTierDiscount();
      const totalPrice = this.bundleTotalPrice();
      const discountedPrice = totalPrice - (totalPrice * (discount / 100));

      if (discount > 0) {
        elem.innerHTML = `
          <s>${window.Shopify.formatMoney(totalPrice)}</s>
          <span>${window.Shopify.formatMoney(discountedPrice)}</span>
        `;
      }
      else {
        elem.innerHTML = `<span>${window.Shopify.formatMoney(totalPrice)}</span>`;
      }
    });

    this.querySelectorAll('[data-bundle-builder-savings]').forEach(elem => {
      const discount = this.getTierDiscount();
      const totalPrice = this.bundleTotalPrice();
      const discountedPrice = totalPrice - (totalPrice * (discount / 100));
      const savings = totalPrice - discountedPrice;

      elem.innerHTML = `
        <span>${window.Shopify.formatMoney(savings)}</span>
        <span>(${discount}%)</span>
      `;
    });

    if (this.getBundleContents().length === 0) {
      this.querySelectorAll('[data-bundle-builder-btn-action]').forEach(btn => {
        btn.disabled = true;
      })
    } else {
      const bundleMin = Number(this.dataset.bundleMin);
      const bundleMax = Number(this.dataset.bundleMax);
  
      if (bundleMin > 0 && this.bundleQuantity() < bundleMin) {
        this.querySelectorAll('[data-bundle-builder-btn-action]').forEach(btn => {
          btn.disabled = true;
        })
      } else {
        this.querySelectorAll('[data-bundle-builder-btn-action').forEach(btn => {
          btn.disabled = false;
        })
      }
  
      if (bundleMax > 0 && this.bundleQuantity() >= bundleMax) {
        this.querySelectorAll('.bundle-product-form').forEach(form => {
          form.querySelector('select[name="id"]').disabled = true;
          form.querySelector('.btn').disabled = true;
        });
      } else {
        this.querySelectorAll('.bundle-product-form').forEach(form => {
          form.querySelector('select[name="id"]').disabled = false;
          form.querySelector('.btn').disabled = false;
        });
      }
    }

    this.querySelectorAll('[data-bundle-builder-item-count]').forEach(elem => {
      elem.textContent = this.bundleQuantity();
    });

    this.buildContentsModal();
  }

  buildContentsModal() {
    const modal = this.querySelector('.bundle-builder-contents-modal');
    const empty = modal.querySelector('.bundle-builder-contents-empty');
    const list = modal.querySelector('.bundle-builder-contents-list'); 

    if (this.getBundleContents().length === 0) {
      empty.hidden = false;
      list.hidden = true;
      list.innerHTML = '';
    }
    else {
      empty.hidden = true;
      list.hidden = false;
      
      let html = '';

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

      this.getBundleContents().reverse().forEach((item) => {
        html += `
          <li class="bundle-builder-contents-item">
            <div class="bundle-builder-contents-item-inner">
              <a href="${item.product_url}?variant=${item.variant_id}" tabindex="-1">
                <div class="img-wrapper">
                  <img 
                    src="${window.Shopify.resizeImage(item.variant_image,`${imgWidth}x${imgHeight}`, "center" )}"
                    alt="" 
                    class="img-fluid" 
                    width="480" 
                    height="480" 
                    loading="lazy">
                </div>
              </a>
              <div class="bundle-builder-contents-item-right">
                <div class="bundle-builder-contents-item-title-wrapper">
                  <h3 class="heading h6">
                    <a href="${item.product_url}?variant=${item.variant_id}">
                      ${item.product_title}
                    </a>
                  </h3>
                  <p class="bundle-builder-contents-item-subtitle fs-sm">
                    <span ${item.variant_title.includes('Default') ? 'hidden' : ''}>
                      ${item.variant_title} - 
                    </span>
                    <span>
                      ${window.Shopify.formatMoney(item.variant_price * item.quantity)}
                    </span>
                  </p>
                  <button
                    class="btn btn-icon btn-remove-from-bundle" 
                    type="button" 
                    data-variant-id="${item.variant_id}"
                    aria-label="Remove from bundle">
                    <div class="animated-bin-icon">
                      <span></span>
                      <span></span>
                    </div>
                  </button>
                </div>
                <div class="bundle-builder-contents-item-qty-switcher-wrapper">
                  <line-item-qty-switcher 
                    class="qty-switcher" 
                    role="group" 
                    aria-label="Quantity">
                    <button 
                      class="btn btn-outline" 
                      type="button" 
                      name="decrease" 
                      aria-label="Decrease quantity">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" class="svg-icon-minus " viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                    <input 
                      class="input"
                      type="number" 
                      value="${item.quantity}" 
                      min="0" 
                      aria-label="Quantity" 
                      data-variant-id="${item.variant_id}">
                    <button 
                      class="btn btn-outline" 
                      type="button" 
                      name="increase" 
                      aria-label="Increase quantity">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" class="svg-icon-plus " viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </line-item-qty-switcher>
                  
                </div>
              </div>
            </div>
          </li>
        `
      });

      list.innerHTML = html;

      list.querySelectorAll('.btn-remove-from-bundle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          
          const variantId = Number(btn.dataset.variantId);
          let bundleContents = this.getBundleContents();
          bundleContents = bundleContents.filter(item => item.variant_id !== variantId);
          localStorage.setItem(this.bundleName, JSON.stringify(bundleContents));

          this.buildBundle();
        });
      })

      list.querySelectorAll('.qty-switcher input').forEach(input => {
        input.addEventListener('change', () => {
          const variantId = Number(input.dataset.variantId);
          let bundleContents = this.getBundleContents();
          const item = bundleContents.find(item => item.variant_id === variantId);

          if (item) {
            const newQuantity = Number(input.value);
            if (newQuantity > 0) {
              item.quantity = newQuantity;
            } else {
              bundleContents = bundleContents.filter(item => item.variant_id !== variantId);
            }
            localStorage.setItem(this.bundleName, JSON.stringify(bundleContents));
            this.buildBundle();
          }
        });
      })

      const bundleMax = Number(this.dataset.bundleMax);

      if (bundleMax > 0 && this.bundleQuantity() >= bundleMax) {
        this.querySelectorAll('.bundle-builder-contents-modal .qty-switcher input').forEach(input => {
          input.disabled = true;
        });
        this.querySelectorAll('.bundle-builder-contents-modal .qty-switcher button[name="increase"]').forEach(btn => {
          btn.disabled = true;
        });
      } else {
        this.querySelectorAll('.bundle-builder-contents-modal .qty-switcher input').forEach(input => {
          input.disabled = false;
        });
        this.querySelectorAll('.bundle-builder-contents-modal .qty-switcher button[name="increase"]').forEach(btn => {
          btn.disabled = false;
        });
      }
    }
  }

  getTierDiscount() {
    let tiers = []
    let discount = 0;

    if (this.dataset.bundleMode === 'amount') {
      tiers = this.dataset.bundleAmountTiers.split(';').map(tier => {
        const [amount, discount] = tier.split(':');
        return { amount: Number(amount), discount: Number(discount) };
      });
      tiers.forEach(tier => {
        if (this.bundleTotalPrice() >= tier.amount * 100) {
          discount = tier.discount;
        }
      });
    }
    else if (this.dataset.bundleMode === 'quantity') {
      tiers = this.dataset.bundleQuantityTiers.split(';').map(tier => {
        const [quantity, discount] = tier.split(':');
        return { quantity: Number(quantity), discount: Number(discount) };
      });
      tiers.forEach(tier => {
        if (this.bundleQuantity() >= tier.quantity) {
          discount = tier.discount;
        }
      });
    }

    return discount;
  }

  getNextTier() {
    let nextTier = null;

    if (this.dataset.bundleMode === 'amount') {
      const tiers = this.dataset.bundleAmountTiers.split(';').map(tier => {
        const [amount, discount] = tier.split(':');
        return { amount: Number(amount), discount: Number(discount) };
      });
      nextTier = tiers.find(tier => this.bundleTotalPrice() < tier.amount * 100);
    } else if (this.dataset.bundleMode === 'quantity') {
      const tiers = this.dataset.bundleQuantityTiers.split(';').map(tier => {
        const [quantity, discount] = tier.split(':');
        return { quantity: Number(quantity), discount: Number(discount) };
      });
      nextTier = tiers.find(tier => this.bundleQuantity() < tier.quantity);
    } 
    return nextTier;
  }

  cardStickyPosition() {
    const card = this.querySelector('.bundle-builder-card');
    if (!card) return;

    if (window.matchMedia("(min-width: 1200px)").matches) {
      const headerGroup = document.querySelector("#header-group.sticky");

      let oldScroll = window.scrollY;

      window.addEventListener("scroll", () => {
        const newScroll = window.scrollY;
        if (newScroll > oldScroll) {
          if (newScroll > headerGroup.clientHeight) {
            card.style.top = "20px";
          }
        } else if (newScroll < oldScroll) {
          card.style.top = `${headerGroup.clientHeight + 20}px`;
        }

        oldScroll = Math.max(window.scrollY, 0);
      });
    }
  }

  stickyCardMobile() {
    const mainCard = this.querySelector('.bundle-builder-card');
    const stickyCard = this.querySelector('.bundle-builder-sticky-card-mobile');
    if (!stickyCard) return;

    const top = mainCard.getBoundingClientRect().bottom + window.scrollY;
    const bottom = this.getBoundingClientRect().bottom + window.scrollY;

    window.addEventListener("scroll", () => {
      stickyCard.classList.toggle(
        "show",
        window.scrollY > top && window.scrollY < bottom - window.innerHeight
      );
    });
  }

  handleATC () {
    this.querySelectorAll('[data-bundle-builder-btn-add-to-cart]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();

        btn.classList.add("loading");
        btn.disabled = true;
        btn.setAttribute("aria-busy", "true");
        
        const bundleContents = this.getBundleContents();
        if (bundleContents.length === 0) return;

        const items = bundleContents.map(item => ({
          id: item.variant_id,
          quantity: item.quantity
        }));

        
        await document.querySelector("cart-component").add({ items });

        btn.classList.remove("loading");
        btn.disabled = false;
        btn.setAttribute("aria-busy", "false");

        localStorage.removeItem(this.bundleName);
        this.buildBundle();
      });
    })
  }

  handleCheckout() {
    this.querySelectorAll('[data-bundle-builder-btn-checkout]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();

        btn.classList.add("loading");
        btn.disabled = true;
        btn.setAttribute("aria-busy", "true");

        const bundleContents = this.getBundleContents();
        if (bundleContents.length === 0) return;

        // Build checkout URL with line items in the correct format
        const items = bundleContents
          .map(item => `${item.variant_id}:${item.quantity}`)
          .join(',');
        const checkoutUrl = `${this.dataset.cartUrl}/${items}`;

        console.log("Redirecting to checkout:", checkoutUrl);

        window.location.href = checkoutUrl;

        btn.classList.remove("loading");
        btn.disabled = false;
        btn.setAttribute("aria-busy", "false");

        localStorage.removeItem(this.bundleName);
        this.buildBundle();
      });
    })
  }
}
customElements.define('bundle-builder', BundleBuilder);