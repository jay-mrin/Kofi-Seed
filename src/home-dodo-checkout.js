(() => {
  const form = document.querySelector("#dodoCheckoutForm");
  if (!form) return;

  const countOutput = document.querySelector("#dodoSeedCount");
  const totalOutput = document.querySelector("#dodoTotalAmount");
  const totalSeedsOutput = document.querySelector("#dodoTotalSeeds");
  const checkoutButton = document.querySelector("#dodoCheckoutButton");
  const paymentPanel = document.querySelector("#dodoPaymentPanel");
  const checkoutLoader = document.querySelector("#dodoCheckoutLoader");
  const comingSoon = document.querySelector("#dodoPaymentComingSoon");
  let seedCount = 1;
  let revealTimer;

  const getUnitPrice = () => Number(totalOutput.dataset.unitPrice) || 7;
  const updateTotal = () => {
    countOutput.value = String(seedCount);
    totalOutput.textContent = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(getUnitPrice() * seedCount);
    totalSeedsOutput.textContent = `(${seedCount} ${seedCount === 1 ? "Seed" : "Seeds"})`;
  };

  document.querySelector("#dodoDecreaseSeeds").addEventListener("click", () => {
    seedCount = Math.max(1, seedCount - 1);
    updateTotal();
  });
  document.querySelector("#dodoIncreaseSeeds").addEventListener("click", () => {
    seedCount += 1;
    updateTotal();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.querySelector("#dodoCustomerEmail");
    if (!email.reportValidity()) return;

    window.clearTimeout(revealTimer);
    paymentPanel.hidden = false;
    paymentPanel.classList.add("is-loading");
    checkoutLoader.hidden = false;
    comingSoon.hidden = true;
    checkoutButton.classList.add("is-checkout-open");
    checkoutButton.setAttribute("aria-expanded", "true");

    revealTimer = window.setTimeout(() => {
      checkoutLoader.hidden = true;
      paymentPanel.classList.remove("is-loading");
      comingSoon.hidden = false;
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1100);
  });

  new MutationObserver(updateTotal).observe(totalOutput, { attributes: true, attributeFilter: ["data-unit-price"] });
  updateTotal();
})();
