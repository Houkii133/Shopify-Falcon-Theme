/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class MarqueeComponent extends HTMLElement {
  constructor() {
    super();

    this.init();

    document.addEventListener("shopify:section:load", (event) => {
      if (event.detail.sectionId === this.dataset.sectionId) {
        this.init();
      }
    });
  }

  init() {
    const list = this.querySelector(".marquee-list");
    list.querySelectorAll('.marquee-item[aria-hidden="true"]').forEach((elem) => elem.remove());

    const marqueeWidth = list.scrollWidth;
    const marqueeLength = list.querySelectorAll("li").length;

    list.insertAdjacentHTML("beforeEnd", list.innerHTML);
    list.insertAdjacentHTML("beforeEnd", list.innerHTML);

    list.querySelectorAll(".marquee-item").forEach((item, index) => {
      if (index >= marqueeLength) {
        item.setAttribute("aria-hidden", "true");
      }
    });

    let style = `
      <style>
        #marquee-${this.dataset.marqueeId} .marquee-list {
          animation-name: marquee_animation_${this.dataset.marqueeId};
          animation-duration: ${this.dataset.marqueeDuration}s;
        }
        @keyframes marquee_animation_${this.dataset.marqueeId} {
          to { transform: translateX(-${marqueeWidth}px); }
        }
      </style>
    `;
    if (this.dataset.marqueeDirection === "right") {
      style += `
        <style>
          @keyframes marquee_animation_${this.dataset.marqueeId} {
            from { transform: translateX(-${marqueeWidth}px); }    
            to { transform: 0); }    
          }
        </style>
      `;
    }

    this.insertAdjacentHTML("beforeBegin", style);
  }
}
customElements.define("marquee-component", MarqueeComponent);
