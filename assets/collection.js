/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class CollectionProducts extends HTMLElement {
  constructor() {
    super();

    this.handleFilters();
    this.handleRemoveAllFilters();
    this.adjustFiltersDrawer();
    this.handleSortBy();
    this.handleColsSelectors();
    this.handleInfinitePagination();
  }

  handleFilters() {
    document.querySelectorAll(".collection-filters form").forEach((form) => {
      form.querySelectorAll("input").forEach((input) => {
        input.addEventListener("change", async () => {
          const params = new URLSearchParams(new FormData(form));
          const url = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", url);
          input.closest("dropdown-component")?.querySelector("button")?.focus();
          this.load();
        });
      });
    });
  }

  handleRemoveAllFilters() {
    this.querySelectorAll("[data-remove-all-filters]").forEach((btn) => {
      const params = new URLSearchParams(window.location.search);

      for (const key of params.keys()) {
        if (key.includes("filter.")) {
          btn.removeAttribute("hidden");
        }
      }

      btn.addEventListener("click", () => {
        for (const key of [...params.keys()]) {
          if (key.includes("filter.")) {
            params.delete(key);
          }
        }

        const url = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", url);
        this.load();
      });
    });
  }

  adjustFiltersDrawer() {
    window.addEventListener("dialog:open", (event) => {
      if (event.detail.dialog.id === "dialog-filters") {
        this.querySelectorAll("#dialog-filters details[open]").forEach((details) => {
          const content = details.querySelector(".collapse-content");
          content.style.height = content.scrollHeight + "px";
        });
      }
    });
  }

  handleSortBy() {
    this.querySelectorAll(".collection-sort-by").forEach((sortBy) => {
      sortBy.querySelectorAll("input").forEach((input) => {
        input.addEventListener("change", () => {
          const params = new URLSearchParams(window.location.search);
          params.set("sort_by", input.value);
          params.delete("page");
          const url = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", url);
          this.load();
        });
      });
    });
  }

  handleColsSelectors() {
    this.querySelectorAll(".collection-cols-selector").forEach((selector) => {
      const input = selector.querySelector("input");
      const text = selector.querySelector("p");

      input.addEventListener("input", () => {
        text.textContent = selector.dataset.text.replace("{{ count }}", input.value);
        if (selector.dataset.type === "mobile") {
          this.querySelector(".product-grid").style.setProperty("--mobile-cols", input.value);
          localStorage.setItem("collection-cols-mobile", input.value);
        } else {
          this.querySelector(".product-grid").style.setProperty("--desktop-cols", input.value);
          localStorage.setItem("collection-cols-desktop", input.value);
        }
      });

      if (selector.dataset.type === "mobile" && localStorage.getItem("collection-cols-mobile")) {
        input.value = localStorage.getItem("collection-cols-mobile");
        text.textContent = selector.dataset.text.replace("{{ count }}", localStorage.getItem("collection-cols-mobile"));
      } else if (selector.dataset.type === "desktop" && localStorage.getItem("collection-cols-desktop")) {
        input.value = localStorage.getItem("collection-cols-desktop");
        text.textContent = selector.dataset.text.replace("{{ count }}", localStorage.getItem("collection-cols-desktop"));
      }

      window.addEventListener("collection:loaded", () => {
        if (selector.dataset.type == "mobile" && localStorage.getItem("collection-cols-mobile")) {
          this.querySelector(".product-grid").style.setProperty("--desktop-cols", localStorage.getItem("collection-cols-mobile"));
          text.textContent = selector.dataset.text.replace("{{ count }}", localStorage.getItem("collection-cols-mobile"));
        }
        if (selector.dataset.type == "desktop" && localStorage.getItem("collection-cols-desktop")) {
          this.querySelector(".product-grid").style.setProperty("--desktop-cols", localStorage.getItem("collection-cols-desktop"));
          text.textContent = selector.dataset.text.replace("{{ count }}", localStorage.getItem("collection-cols-desktop"));
        }
      });
    });
  }

  handleInfinitePagination() {
    const button = this.querySelector(".infinite-pagination-btn");
    if (!button) return;

    const loadMore = async () => {
      button.classList.add("loading");
      button.disabled = true;

      window.history.replaceState({}, "", button.href);

      const response = await fetch(button.href);
      const data = await response.text();
      const parser = new DOMParser();
      const newDocument = parser.parseFromString(data, "text/html");

      this.querySelector(".product-grid").insertAdjacentHTML("beforeend", newDocument.querySelector(".product-grid").innerHTML);
      this.querySelector(".pagination-wrapper").replaceWith(newDocument.querySelector(".pagination-wrapper"));

      this.querySelector("#collection-products-status").textContent = button.dataset.textStatus;
      setTimeout(() => {
        this.querySelector("#collection-products-status").textContent = "";
      }, 4000);

      this.handleInfinitePagination();
    };

    button.addEventListener("click", async (e) => {
      e.preventDefault();
      loadMore();
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting) {
            await loadMore();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
      },
    );

    observer.observe(button);
  }

  async load() {
    if (this.querySelector(".product-grid")) {
      this.querySelector(".product-grid").style.opacity = 0.2;
    }

    const response = await fetch(window.location.href);
    const data = await response.text();
    const parser = new DOMParser();
    const newDocument = parser.parseFromString(data, "text/html");

    this.querySelector(".product-grid-wrapper").replaceWith(newDocument.querySelector(".product-grid-wrapper"));

    this.querySelectorAll(".collection-utilities-count").forEach((elem) => {
      elem.textContent = newDocument.querySelector(".collection-utilities-count").textContent;
    });

    this.querySelectorAll(".collection-filters-filter").forEach((elem) => {
      elem.replaceWith(newDocument.querySelector(`.collection-filters-filter[data-filter-label="${elem.dataset.filterLabel}"]`));
    });

    this.querySelectorAll("[data-collection-filter-label]").forEach((elem) => {
      elem.replaceWith(newDocument.querySelector(`[data-collection-filter-label][data-filter-label="${elem.dataset.filterLabel}"]`) || "");
    });

    this.querySelectorAll("[data-view-all-results-btn]").forEach((elem) => {
      elem.textContent = newDocument.querySelector("[data-view-all-results-btn]").textContent;
    });

    this.handleFilters();
    this.handleInfinitePagination();

    window.dispatchEvent(new CustomEvent("collection:loaded"));
  }
}
customElements.define("collection-products", CollectionProducts);

/*
  Collection circles - scroll to active item (mobile)
*/
setTimeout(() => {
  const list = document.querySelector(".collection-circles-list");
  if (!list) return;

  const left = list.querySelector("a.active")?.getBoundingClientRect().left || 0;
  list.scrollBy({ left, behavior: "smooth" });
}, 1000);
