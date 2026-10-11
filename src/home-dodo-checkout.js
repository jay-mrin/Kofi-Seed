(() => {
  const form = document.querySelector("#dodoCheckoutForm");
  if (!form) return;

  const countOutput = document.querySelector("#dodoSeedCount");
  const totalOutput = document.querySelector("#dodoTotalAmount");
  const totalSeedsOutput = document.querySelector("#dodoTotalSeeds");
  const status = document.querySelector("#dodoCheckoutStatus");
  let seedCount = 1;

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
    const name = document.querySelector("#dodoCustomerName");
    const email = document.querySelector("#dodoCustomerEmail");
    if (!name.reportValidity() || !email.reportValidity()) return;
    status.textContent = "DodoPayments checkout will be available soon.";
    status.hidden = false;
  });

  new MutationObserver(updateTotal).observe(totalOutput, { attributes: true, attributeFilter: ["data-unit-price"] });
  updateTotal();
})();
