/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class ParallaxMedia extends HTMLElement {
  constructor() {
    super();
    
    this.initParallax();
    this.animateOnScroll();
  }

  initParallax() {
    const mediaInner = this.querySelector(".media-inner");

    const maxScroll = (window.innerHeight - this.clientHeight) / 2;
    let lastScrollY = window.scrollY;
    let x = 0;
    let ticking = false;

    const updateParallax = () => {
      const currentScrollY = window.scrollY;
      const top = Math.round(this.getBoundingClientRect().top);
      const bottom = Math.round(this.getBoundingClientRect().bottom);
      const visibilityTop = Math.round(((window.innerHeight - top) / this.clientHeight) * 100);
      const visibilityBottom = Math.round((bottom / this.clientHeight) * 100);

      if (visibilityTop > 0 && visibilityBottom > 0) {
        if (currentScrollY > lastScrollY) {
          x = Math.min(maxScroll, x + 1);
        } else if (currentScrollY < lastScrollY) {
          x = Math.max(0, x - 1);
        }
        mediaInner.style.transform = `translateY(${x}px)`;
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    });
  }

  animateOnScroll() {
    const mediaWrapper = this.querySelector(".media-wrapper");
    if (mediaWrapper.dataset.overlayOpacity === '0') return;

    let ticking = false;

    const updateOverlay = () => {
      const top = Math.round(this.getBoundingClientRect().top);
      const bottom = Math.round(this.getBoundingClientRect().bottom);
      const visibilityTop = Math.round(((window.innerHeight - top) / this.clientHeight) * 100);
      const visibilityBottom = Math.round((bottom / this.clientHeight) * 100);

      const baseOpacity = Number(mediaWrapper.dataset.overlayOpacity);

      if (visibilityTop > 0 && visibilityTop < 100) {
        const final = Math.round((100 - baseOpacity) * (1 - visibilityTop / 100) + baseOpacity);
        mediaWrapper.style.setProperty("--overlay-opacity", final + "%");
      } else if (visibilityBottom > 0 && visibilityBottom < 100) {
        const final = Math.round((100 - baseOpacity) * (1 - visibilityBottom / 100) + baseOpacity);
        mediaWrapper.style.setProperty("--overlay-opacity", final + "%");
      }

      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(updateOverlay);
        ticking = true;
      }
    });
  }
}
customElements.define('parallax-media', ParallaxMedia);
