/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class StickyMedia extends HTMLElement {
  constructor() {
    super();
    
    this.cycleMedia();
    this.animateOnScroll();
  }

  cycleMedia() {
    this.querySelectorAll(".sticky-media-content-inner").forEach((elem, index) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.querySelectorAll(".media-wrapper").forEach((wrapper, i) => {
                if (i === index) {
                  wrapper.style.setProperty("--opacity", "1");
                } else {
                  wrapper.style.setProperty("--opacity", "0");
                }
              });
            }
          });
        },
        {
          root: null,
          threshold: 0.4
        }
      );
    
      observer.observe(elem);
    });
  }

  animateOnScroll() {
    this.querySelectorAll(".media-wrapper").forEach(mediaWrapper => {
      if (mediaWrapper.dataset.overlayOpacity === '0') return;

      let ticking = false;

      const updateOverlay = () => {
        const top = Math.round(this.getBoundingClientRect().top);
        const bottom = Math.round(this.getBoundingClientRect().bottom);
        const visibilityTop = Math.round(top / window.innerHeight * 100)
        const visibilityBottom = Math.round(bottom / window.innerHeight * 100)

        const baseOpacity = Number(mediaWrapper.dataset.overlayOpacity);

        if (visibilityTop > 0 && visibilityTop < 100) {
          const final = Math.round((100 - baseOpacity) * visibilityTop / 100 + baseOpacity)
          mediaWrapper.style.setProperty("--overlay-opacity", final + "%");
        } else if (visibilityBottom > 0 && visibilityBottom < 100) {
          const final = Math.round((100 - baseOpacity) * (1 - visibilityBottom / 100) + baseOpacity)
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
    });
  }
}
customElements.define('sticky-media', StickyMedia);
