// Checkout recovery keeps approval and confirmation separate from a new payment.
window.createPayPalRecovery = (options) => {
  let details = null;
  let approvedOrderId = "";
  let verifiedPayment = null;
  let confirmation = null;
  let generation = 0;
  let namespace = "";
  let buttons = [];
  let loading = false;
  let lastFailureReason = "THE PAYMENT FAILED";
  const completedOrders = new Set();
  const ui = options.ui;
  const storageKey = "sow-your-seed:paypal-pending-approval";
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
    if (/^[A-Z0-9-]{5,80}$/i.test(saved?.orderId || "")) {
      approvedOrderId = saved.orderId;
      details = { amount: Number(saved.amount) || 0, paymentRoute: saved.paymentRoute };
    }
  } catch { /* Recovery still works in memory when browser storage is unavailable. */ }

  function rememberApproval() {
    try {
      if (!approvedOrderId) window.sessionStorage.removeItem(storageKey);
      else window.sessionStorage.setItem(storageKey, JSON.stringify({
        orderId: approvedOrderId, amount: details?.amount, paymentRoute: details?.paymentRoute,
      }));
    } catch { /* Keep the in-memory approval guard. */ }
  }

  function cleanup() {
    generation += 1;
    loading = false;
    buttons.forEach((button) => {
      try { Promise.resolve(button.close?.()).catch(() => {}); } catch { /* Already closed by PayPal. */ }
    });
    buttons = [];
    ui.paypal.replaceChildren();
    ui.card.replaceChildren();
    if (namespace) options.resetSdk(namespace);
    namespace = "";
  }

  function setStatus(message) {
    ui.status.textContent = message;
  }

  function providerError(error) {
    let provider = Array.isArray(error?.details) ? error : error?.details;
    if (typeof provider === "string") {
      try { provider = JSON.parse(provider.slice(provider.indexOf("{"))); } catch { provider = null; }
    }
    return provider && typeof provider === "object" ? provider : null;
  }

  function failureIssue(error) {
    return providerError(error)?.details?.[0]?.issue || error?.code || "";
  }

  function setFailure(error, preserveKnownReason = false) {
    const reasons = {
      INSTRUMENT_DECLINED: "PayPal declined the selected payment method. Please choose another payment method.",
      PAYMENT_DENIED: "PayPal declined this payment. Please choose another payment method.",
      CARD_EXPIRED: "The card has expired. Please use a different card.",
      ORDER_NOT_APPROVED: "The payment was not approved in PayPal.",
      MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED: "PayPal's payment attempt limit was reached. Please choose another payment method.",
      REDIRECT_PAYER_FOR_ALTERNATE_FUNDING: "PayPal requested a different payment method.",
    };
    const provider = providerError(error);
    const issue = failureIssue(error);
    const suppliedCode = provider?.details?.[0]?.issue || provider?.name ||
      (/^(?:PAYEE_|PAYER_|PAYMENT_|CARD_|INSTRUMENT_|ORDER_|REDIRECT_|MAX_)/.test(issue) ? issue : "");
    const capture = provider?.purchase_units?.[0]?.payments?.captures?.at(-1);
    const reason = Object.hasOwn(reasons, issue) ? reasons[issue]
      : typeof suppliedCode === "string" && /^[A-Z][A-Z0-9_]{2,79}$/.test(suppliedCode) ? `PayPal reported: ${suppliedCode.toLowerCase().replaceAll("_", " ")}.`
      : ["DENIED", "DECLINED", "FAILED"].includes(capture?.status) ? "PayPal declined this payment. Please choose another payment method."
      : "";
    if (reason || !preserveKnownReason) lastFailureReason = reason || "THE PAYMENT FAILED";
    ui.reason.textContent = lastFailureReason;
  }

  function definitelyNotPaid(error, issue) {
    const capture = error?.details?.purchase_units?.[0]?.payments?.captures?.at(-1);
    return error?.status === 410 || ["DENIED", "DECLINED", "FAILED"].includes(capture?.status) ||
      ["INSTRUMENT_DECLINED", "PAYMENT_DENIED", "CARD_EXPIRED", "ORDER_NOT_APPROVED", "MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED"].includes(issue);
  }

  function showPendingConfirmation() {
    cleanup();
    ui.loading.hidden = true;
    ui.reload.disabled = Boolean(confirmation);
    ui.reload.textContent = verifiedPayment ? "Show payment confirmation" : "Check payment status";
    ui.title.textContent = verifiedPayment ? "Your Seed Was Sown" : "Checking Your Seed Payment";
    ui.description.textContent = verifiedPayment ? "Your payment is complete." : "We are checking your existing PayPal payment.";
    ui.reason.hidden = true;
    setStatus(verifiedPayment
      ? "PayPal confirmed your payment. Finish viewing your confirmation below."
      : "PayPal approval was received, but payment confirmation was interrupted. Check this payment before starting another attempt.");
  }

  async function approve(orderId, actions) {
    if (completedOrders.has(orderId)) return;
    if (confirmation) return confirmation;
    if (approvedOrderId && approvedOrderId !== orderId) {
      options.onFailure();
      return;
    }
    approvedOrderId = orderId;
    details ||= options.getDetails();
    rememberApproval();
    ui.reload.disabled = true;
    setStatus("Confirming your payment with PayPal…");
    const operation = (async () => {
      try {
        if (!verifiedPayment) {
          const payload = await options.captureOrder(approvedOrderId);
          if (!payload?.donation?.id) throw new Error("Payment confirmation is incomplete.");
          verifiedPayment = payload;
        }
        await options.finish(verifiedPayment);
        completedOrders.add(approvedOrderId);
        approvedOrderId = "";
        rememberApproval();
        verifiedPayment = null;
        details = null;
        cleanup();
      } catch (error) {
        setFailure(error);
        const issue = failureIssue(error);
        if (!verifiedPayment && definitelyNotPaid(error, issue)) {
          approvedOrderId = "";
          rememberApproval();
        }
        if (!verifiedPayment && issue === "INSTRUMENT_DECLINED") {
          confirmation = null;
          setStatus("Your seed wasn't sown. Please choose another PayPal payment method.");
          options.onDeclined();
          if (typeof actions?.restart === "function") {
            try { await actions.restart(); return; } catch { /* Offer a fresh checkout below. */ }
          }
        }
        // An interrupted capture can already have charged the buyer. Keep its ID.
        options.onFailure();
      }
    })();
    confirmation = operation;
    try { await operation; } finally {
      if (confirmation === operation) {
        confirmation = null;
        ui.reload.disabled = loading;
      } else if (!confirmation) ui.reload.disabled = loading;
    }
  }

  async function show() {
    details ||= options.getDetails();
    if (!details) return;
    ui.host.hidden = false;
    ui.amount.textContent = options.formatAmount(details.amount);
    if (approvedOrderId || verifiedPayment) {
      showPendingConfirmation();
      return;
    }
    cleanup();
    const currentGeneration = generation;
    const currentDetails = details;
    const currentNamespace = `paypalSysRecovery${currentGeneration}`;
    let rendering = true;
    namespace = currentNamespace;
    ui.title.textContent = "Your Seed Was Not Sown...";
    ui.reason.hidden = false;
    ui.reason.textContent = lastFailureReason;
    ui.description.textContent = "Your payment didn't finish. Your details are saved, and you can try again below.";
    ui.reload.textContent = "Reload PayPal options";
    ui.reload.disabled = true;
    loading = true;
    ui.loading.hidden = false;
    setStatus("Loading fresh, secure PayPal options. Your details are saved.");
    try {
      const paypal = await options.loadSdk(currentDetails, currentNamespace);
      if (generation !== currentGeneration) return;
      let rendered = 0;
      for (const [fundingSource, container] of [[paypal.FUNDING.PAYPAL, ui.paypal], [paypal.FUNDING.CARD, ui.card]]) {
        if (generation !== currentGeneration) return;
        let button;
        try {
          button = paypal.Buttons({
            fundingSource,
            style: { layout: "vertical", shape: "pill", tagline: false, height: 44 },
            createOrder: async () => {
              if (generation !== currentGeneration || approvedOrderId) throw new Error("This checkout has expired. Reload the payment options.");
              setFailure();
              let result;
              try { result = await options.createOrder(currentDetails); } catch (error) {
                if (generation === currentGeneration) setFailure(error);
                throw error;
              }
              if (generation !== currentGeneration) throw new Error("This checkout has expired. Reload the payment options.");
              return result.id;
            },
            onApprove: (data, actions) => generation === currentGeneration ? approve(data.orderID, actions) : undefined,
            onCancel: () => { if (generation === currentGeneration) { setFailure(); options.onFailure(); } },
            onError: (error) => {
              if (generation !== currentGeneration) return;
              setFailure(error, true);
              if (!rendering) { options.onFailure(); return; }
              // Do not spin up another SDK automatically if rendering itself failed.
              setStatus("PayPal couldn't complete this attempt. Reload the options below to try again.");
              ui.reload.disabled = false;
            },
          });
          if (!button.isEligible()) continue;
          buttons.push(button);
          await button.render(container);
          if (generation !== currentGeneration) return;
          await options.waitForButton(container);
          if (generation !== currentGeneration) return;
          rendered += 1;
        } catch {
          if (generation !== currentGeneration) return;
          container.replaceChildren();
        }
      }
      if (!rendered) throw new Error("No payment options loaded.");
      setStatus("Try PayPal or an available debit or credit card. You can reload these options whenever you need.");
    } catch {
      if (generation !== currentGeneration) return;
      setStatus("PayPal couldn't load. Check your connection, then reload the payment options below.");
    } finally {
      rendering = false;
      if (generation === currentGeneration) {
        loading = false;
        ui.loading.hidden = true;
        ui.reload.disabled = false;
      }
    }
  }

  return {
    approve,
    show,
    setFailure,
    hasPendingApproval: () => Boolean(approvedOrderId || verifiedPayment || confirmation),
    begin: () => { if (!approvedOrderId && !verifiedPayment) { cleanup(); details = null; setFailure(); } },
    close: cleanup,
    retry: () => approvedOrderId || verifiedPayment ? approve(approvedOrderId) : show(),
  };
};
