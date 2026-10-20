(() => {
  const form = document.querySelector("#dodoCheckoutForm");
  if (!form) return;

  const countOutput = document.querySelector("#dodoSeedCount");
  const totalOutput = document.querySelector("#dodoTotalAmount");
  const totalSeedsOutput = document.querySelector("#dodoTotalSeeds");
  const checkoutButton = document.querySelector("#dodoCheckoutButton");
  const dodoPayButton = document.querySelector("#dodoPayButton");
  const paymentPanel = document.querySelector("#dodoPaymentPanel");
  const checkoutLoader = document.querySelector("#dodoCheckoutLoader");
  const loaderText = document.querySelector("#dodoCheckoutLoaderText");
  const paymentStatus = document.querySelector("#dodoPaymentStatus");
  const emailInput = document.querySelector("#dodoCustomerEmail");
  const nameInput = document.querySelector("#dodoCustomerName");
  const messageInput = document.querySelector("#dodoCustomerMessage");
  let seedCount = 1;
  let submitting = false;
  const donorTokenKey = "sow-your-seed-dodo-donor-token";

  const getUnitPrice = () => Number(totalOutput.dataset.unitPrice) || 7;
  const updateTotal = () => {
    countOutput.value = String(seedCount);
    const formattedTotal = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(getUnitPrice() * seedCount);
    totalOutput.textContent = formattedTotal;
    totalSeedsOutput.textContent = `(${seedCount} ${seedCount === 1 ? "Seed" : "Seeds"})`;
    if (!paymentPanel || paymentPanel.hidden) {
      checkoutButton.textContent = "Sow Your Spiritual Seed Now";
      checkoutButton.setAttribute("aria-label", `Sow Your Spiritual Seed Now ${formattedTotal}`);
    }
  };

  const setStatus = (message, isError = false) => {
    paymentStatus.textContent = message;
    paymentStatus.classList.toggle("is-error", isError);
    paymentStatus.hidden = !message;
  };

  const setLoading = (isLoading, message = "Opening Secure Payment for Your Seed.....") => {
    submitting = isLoading;
    checkoutButton.disabled = isLoading;
    dodoPayButton.disabled = isLoading;
    if (isLoading) paymentPanel.hidden = false;
    paymentPanel.classList.toggle("is-loading", isLoading);
    checkoutLoader.hidden = !isLoading;
    loaderText.textContent = message;
    const isPanelOpen = !paymentPanel.hidden;
    checkoutButton.classList.toggle("is-checkout-open", isPanelOpen);
    checkoutButton.setAttribute("aria-expanded", String(isPanelOpen));
  };

  const returnToDodoFormWithFailure = () => {
    setLoading(false);
    paymentPanel.hidden = true;
    checkoutButton.classList.remove("is-checkout-open");
    checkoutButton.setAttribute("aria-expanded", "false");
    setStatus("");
    window.SowYourSeedCheckout?.openPaymentFailure?.("dodo");
  };

  const cleanDodoReturnParameters = () => {
    const url = new URL(window.location.href);
    for (const key of ["dodo_return", "dodo_cancelled", "payment_id", "status", "email", "license_key"]) {
      url.searchParams.delete(key);
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const confirmReturnedPayment = async (paymentId) => {
    const checkout = window.SowYourSeedCheckout;
    if (!checkout?.callEdge) throw new Error("The payment service is still loading. Please refresh this page.");

    let lastError;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await checkout.callEdge("confirm-dodo-payment", {
          body: {
            paymentId,
            donorAccessToken: window.sessionStorage.getItem(donorTokenKey) || "",
          },
        });
      } catch (error) {
        lastError = error;
        if (error?.status !== 422 || attempt === 4) throw error;
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
    }
    throw lastError;
  };

  const handleDodoReturn = async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dodo_cancelled") === "1") {
      window.sessionStorage.removeItem(donorTokenKey);
      cleanDodoReturnParameters();
      returnToDodoFormWithFailure();
      return;
    }

    if (params.get("dodo_return") !== "1") return;
    const paymentId = String(params.get("payment_id") || "").trim();
    if (!paymentId) {
      cleanDodoReturnParameters();
      returnToDodoFormWithFailure();
      return;
    }

    setStatus("");
    setLoading(true, "Confirming your Dodo payment and creating your order…");
    try {
      const payload = await confirmReturnedPayment(paymentId);
      await window.SowYourSeedCheckout.finishDodoPayment(payload);
      window.sessionStorage.removeItem(donorTokenKey);
      form.reset();
      seedCount = 1;
      updateTotal();
      paymentPanel.hidden = true;
      checkoutButton.classList.remove("is-checkout-open");
      checkoutButton.setAttribute("aria-expanded", "false");
    } catch (error) {
      console.warn("Dodo payment confirmation failed.", error);
      returnToDodoFormWithFailure();
    } finally {
      setLoading(false);
      cleanDodoReturnParameters();
    }
  };

  document.querySelector("#dodoDecreaseSeeds").addEventListener("click", () => {
    if (submitting) return;
    seedCount = Math.max(1, seedCount - 1);
    updateTotal();
  });
  document.querySelector("#dodoIncreaseSeeds").addEventListener("click", () => {
    if (submitting) return;
    seedCount = Math.min(999, seedCount + 1);
    updateTotal();
  });

  const startDodoCheckout = async () => {
    if (submitting || !emailInput.reportValidity()) return;

    setStatus("");
    setLoading(true);
    try {
      const checkout = window.SowYourSeedCheckout;
      if (!checkout?.callEdge) throw new Error("Dodo checkout is still loading. Please try again.");
      const donorAccessToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      window.sessionStorage.setItem(donorTokenKey, donorAccessToken);
      const payload = await checkout.callEdge("create-dodo-checkout", {
        body: {
          seedCount,
          email: emailInput.value.trim(),
          name: nameInput.value.trim(),
          message: messageInput.value.trim(),
          donorAccessToken,
        },
      });
      if (!payload.checkoutUrl) throw new Error("Dodo did not return a secure checkout link.");
      window.location.assign(payload.checkoutUrl);
    } catch (error) {
      window.sessionStorage.removeItem(donorTokenKey);
      console.warn("Dodo checkout could not start.", error);
      returnToDodoFormWithFailure();
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting || !emailInput.reportValidity()) return;

    if (document.querySelector("#dodoCardButton")?.hidden) {
      void startDodoCheckout();
      return;
    }

    setStatus("");
    paymentPanel.hidden = false;
    checkoutButton.classList.add("is-checkout-open");
    checkoutButton.setAttribute("aria-expanded", "true");
    dodoPayButton.focus();
  });

  dodoPayButton.addEventListener("click", () => void startDodoCheckout());

  new MutationObserver(updateTotal).observe(totalOutput, {
    attributes: true,
    attributeFilter: ["data-unit-price"],
  });
  updateTotal();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void handleDodoReturn(), { once: true });
  } else {
    void handleDodoReturn();
  }
})();
