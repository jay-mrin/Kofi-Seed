(() => {
  const form = document.querySelector("#dodoCheckoutForm");
  if (!form) return;

  const countOutput = document.querySelector("#dodoSeedCount");
  const totalOutput = document.querySelector("#dodoTotalAmount");
  const amountInput = document.querySelector("#dodoAmountInput");
  const totalSeedsOutput = document.querySelector("#dodoTotalSeeds");
  const checkoutButton = document.querySelector("#dodoCheckoutButton");
  const dodoPayButton = document.querySelector("#dodoPayButton");
  const directButton = document.querySelector("#dodoDirectButton");
  const paymentDialog = document.querySelector("#dodoPaymentDialog");
  const closePaymentDialogButton = document.querySelector("#closeDodoPaymentDialog");
  const paymentPanel = document.querySelector("#dodoPaymentPanel");
  const checkoutLoader = document.querySelector("#dodoCheckoutLoader");
  const loaderText = document.querySelector("#dodoCheckoutLoaderText");
  const paymentStatus = document.querySelector("#dodoPaymentStatus");
  const emailInput = document.querySelector("#dodoCustomerEmail");
  const nameInput = document.querySelector("#dodoCustomerName");
  const messageInput = document.querySelector("#dodoCustomerMessage");
  const quickSeedButtons = [...form.querySelectorAll(".seed-quick-pick")];
  let seedCount = 1;
  let customAmount = null;
  let submitting = false;
  const donorTokenKey = "sow-your-seed-dodo-donor-token";
  const pendingProductKey = "sow-your-seed-dodo-product";

  const getUnitPrice = () => Math.max(Number(totalOutput.dataset.unitPrice) || 11, 11);
  const getTotalAmount = () => customAmount ?? getUnitPrice() * seedCount;
  const updateTotal = (preserveInput = false) => {
    if (customAmount !== null) seedCount = Math.max(1, Math.round(customAmount / getUnitPrice()));
    countOutput.value = String(seedCount);
    amountInput.min = String(getUnitPrice());
    amountInput.max = String(getUnitPrice() * 999);
    const formattedTotal = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(getTotalAmount());
    if (preserveInput !== true) amountInput.value = getTotalAmount().toFixed(2);
    totalSeedsOutput.textContent = `(${seedCount} ${seedCount === 1 ? "Seed" : "Seeds"})`;
    quickSeedButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.seedCount) === seedCount));
    });
    checkoutButton.textContent = "Sow Your Spiritual Seed Now";
    checkoutButton.setAttribute("aria-label", `Sow Your Spiritual Seed Now ${formattedTotal}`);
  };

  const setStatus = (message, isError = false) => {
    paymentStatus.textContent = message;
    paymentStatus.classList.toggle("is-error", isError);
    paymentStatus.hidden = !message;
  };

  const setLoading = (isLoading, message = "Processing Your Seed.....") => {
    submitting = isLoading;
    amountInput.disabled = isLoading;
    checkoutButton.disabled = isLoading;
    dodoPayButton.disabled = isLoading;
    directButton.disabled = isLoading;
    closePaymentDialogButton.disabled = isLoading;
    quickSeedButtons.forEach((button) => { button.disabled = isLoading; });
    paymentPanel.classList.toggle("is-loading", isLoading);
    checkoutLoader.hidden = !isLoading;
    loaderText.textContent = message;
  };

  const closePaymentDialog = () => {
    if (paymentDialog.open && typeof paymentDialog.close === "function") {
      paymentDialog.close();
    } else {
      paymentDialog.removeAttribute("open");
    }
    checkoutButton.setAttribute("aria-expanded", "false");
    paymentPanel.hidden = true;
    directButton.hidden = false;
    directButton.setAttribute("aria-expanded", "false");
  };

  const returnToDodoFormWithFailure = () => {
    setLoading(false);
    closePaymentDialog();
    setStatus("");
    if (window.sessionStorage.getItem(pendingProductKey) === "ritual") {
      window.sessionStorage.removeItem(pendingProductKey);
      window.SowYourSeedCheckout?.openRitualPaymentFailure?.();
      return;
    }
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
      window.sessionStorage.removeItem(pendingProductKey);
      form.reset();
      seedCount = 1;
      customAmount = null;
      updateTotal();
      closePaymentDialog();
    } catch (error) {
      console.warn("Dodo payment confirmation failed.", error);
      returnToDodoFormWithFailure();
    } finally {
      setLoading(false);
      cleanDodoReturnParameters();
    }
  };

  amountInput.addEventListener("input", () => {
    customAmount = Number(amountInput.value) || 0;
    updateTotal(true);
  });
  amountInput.addEventListener("blur", () => {
    if (amountInput.checkValidity()) amountInput.value = getTotalAmount().toFixed(2);
  });

  document.querySelector("#dodoDecreaseSeeds").addEventListener("click", () => {
    if (submitting) return;
    customAmount = null;
    seedCount = Math.max(1, seedCount - 1);
    updateTotal();
  });
  document.querySelector("#dodoIncreaseSeeds").addEventListener("click", () => {
    if (submitting) return;
    customAmount = null;
    seedCount = Math.min(999, seedCount + 1);
    updateTotal();
  });
  quickSeedButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (submitting) return;
      customAmount = null;
      seedCount = Number(button.dataset.seedCount);
      updateTotal();
    });
  });

  const startDodoCheckout = async () => {
    nameInput.value = nameInput.value.trim();
    if (submitting || !amountInput.reportValidity() || !nameInput.reportValidity() || !emailInput.reportValidity()) return;

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
          amount: getTotalAmount(),
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
    if (submitting || paymentDialog.open) return;
    nameInput.value = nameInput.value.trim();
    if (!amountInput.reportValidity() || !nameInput.reportValidity()) return;

    setStatus("");
    if (typeof paymentDialog.showModal === "function") {
      paymentDialog.showModal();
    } else {
      paymentDialog.setAttribute("open", "");
    }
    checkoutButton.setAttribute("aria-expanded", "true");
    emailInput.focus();
  });

  dodoPayButton.addEventListener("click", () => void startDodoCheckout());
  directButton.addEventListener("click", () => {
    if (submitting || !emailInput.reportValidity()) return;
    if (document.querySelector("#dodoCardButton").hidden) {
      void startDodoCheckout();
      return;
    }
    directButton.hidden = true;
    directButton.setAttribute("aria-expanded", "true");
    paymentPanel.hidden = false;
    document.querySelector("#dodoAlternateCardCheckoutLink").focus();
  });
  closePaymentDialogButton.addEventListener("click", closePaymentDialog);
  paymentDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (!submitting) closePaymentDialog();
  });
  paymentDialog.addEventListener("click", (event) => {
    if (event.target === paymentDialog && !submitting) closePaymentDialog();
  });
  paymentDialog.addEventListener("close", () => {
    checkoutButton.setAttribute("aria-expanded", "false");
    paymentPanel.hidden = true;
    directButton.hidden = false;
    directButton.setAttribute("aria-expanded", "false");
  });

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
