/*
  © 2025 KondaSoft
  https://www.kondasoft.com
*/

class PredictiveSearch extends HTMLElement {
  constructor() {
    super();
    this.form = this.querySelector("form.search-form");
    this.input = this.form.querySelector("input[type='search']");
    this.resetButton = this.form.querySelector("button[type='reset']");
    this.submitButton = this.form.querySelector("button[type='submit']");
    this.loadingIndicator = this.form.querySelector(".loading-spinner-wrapper");
    this.resultsContainer = this.querySelector("#predictive-search-results");
    this.status = this.querySelector("#predictive-search-status");
    this.inputTimeout = null;

    this.input.addEventListener("input", this.debounce(this.handleInput.bind(this), 300));
    this.input.addEventListener("focus", this.onInputFocus.bind(this));
    this.input.addEventListener("blur", this.onInputBlur.bind(this));

    this.resetButton.addEventListener("click", this.handleReset.bind(this));
  }

  async onInputFocus() {
    let i = 0;
    this.input.placeholder = "";
    clearTimeout(this.inputTimeout);
    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });

    const type = () => {
      if (i < this.input.dataset.textFocus.length) {
        this.input.placeholder += this.input.dataset.textFocus.charAt(i);
        i++;
        this.inputTimeout = setTimeout(type, 30);
      }
    };
    type();
  }

  onInputBlur() {
    clearTimeout(this.inputTimeout);
    this.input.placeholder = this.input.dataset.textBlur;
  }

  handleInput(event) {
    const query = event.target.value;

    if (query.length) {
      this.resetButton.removeAttribute("hidden");
      this.fetchSuggestions(query);
    } else {
      this.resetButton.setAttribute("hidden", "hidden");
      this.clearSuggestions();
    }
  }

  handleReset() {
    this.input.focus();
    this.input.dispatchEvent(new Event("input"));
  }

  async fetchSuggestions(query) {
    try {
      this.setLoading(true);
      const response = await fetch(`${this.dataset.route}?q=${query}&resources[type]=${this.dataset.resourceTypes}&resources[limit]=${this.dataset.limit}&section_id=predictive-search`);
      if (response.ok) {
        const data = await response.text();
        this.renderSuggestions(data);
      } else {
        console.error("Error fetching suggestions:", response.statusText);
      }
    } catch (error) {
      console.error("Network error:", error);
    } finally {
      this.setLoading(false);
    }
  }

  renderSuggestions(data) {
    this.resultsContainer.innerHTML = new DOMParser().parseFromString(data, "text/html").querySelector("#shopify-section-predictive-search").innerHTML;
    this.resultsContainer.removeAttribute("hidden");
    this.input.setAttribute("aria-expanded", "true");
    this.status.textContent = this.resultsContainer.querySelector("[data-predictive-search-count").textContent;
    this.adjustMobileLayout();
    this.handleAccessibility();
  }

  clearSuggestions() {
    this.resultsContainer.innerHTML = "";
    this.resultsContainer.setAttribute("hidden", "hidden");
    this.input.setAttribute("aria-expanded", "false");
    this.input.removeAttribute("aria-activedescendant");
    this.status.textContent = "";
  }

  adjustMobileLayout() {
    if (!window.matchMedia("(max-width: 799px)").matches) return;

    const products = this.querySelector("#predictive-search-products");
    if (!products) return;

    const collections = this.querySelector("#predictive-search-collections");
    const articles = this.querySelector("#predictive-search-articles");
    const pages = this.querySelector("#predictive-search-pages");

    if (pages) products.insertAdjacentElement("afterend", pages);
    if (articles) products.insertAdjacentElement("afterend", articles);
    if (collections) products.insertAdjacentElement("afterend", collections);
  }

  setLoading(isLoading) {
    if (isLoading) {
      this.loadingIndicator.removeAttribute("hidden");
      this.submitButton.setAttribute("hidden", "hidden");
      this.resultsContainer.setAttribute("aria-busy", "true");
      this.status.textContent = this.dataset.textLoading;
    } else {
      this.loadingIndicator.setAttribute("hidden", "hidden");
      this.submitButton.removeAttribute("hidden");
      this.resultsContainer.removeAttribute("aria-busy");
    }
  }

  handleAccessibility() {
    const focusableElements = this.resultsContainer.querySelectorAll("a, button");
    let currentIndex = -1;

    const updateActive = () => {
      focusableElements.forEach((link, i) => {
        const isActive = i === currentIndex;
        const option = link.closest("[role='option']");
        option.setAttribute("aria-selected", isActive ? "true" : "false");
        link.tabIndex = isActive ? 0 : -1;
        if (isActive) {
          link.focus();
          this.input.setAttribute("aria-activedescendant", option.getAttribute("id"));
        }
      });
    };

    this.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        currentIndex = (currentIndex + 1) % focusableElements.length;
        updateActive();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        currentIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length;
        updateActive();
      }
    });

    this.resultsContainer.querySelector("#predictive-search-search-for-button").addEventListener("click", () => this.form.submit());
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}
customElements.define("predictive-search", PredictiveSearch);
