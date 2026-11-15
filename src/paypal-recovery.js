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

  function failureIssue(error) {
    let provider = error?.details;
    if (typeof provider === "string") {
      try { provider = JSON.parse(provider.slice(provider.indexOf("{"))); } catch { provider = null; }
    }
    return error?.code || provider?.details?.[0]?.issue || "";
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
              const result = await options.createOrder(currentDetails);
              if (generation !== currentGeneration) throw new Error("This checkout has expired. Reload the payment options.");
              return result.id;
            },
            onApprove: (data, actions) => generation === currentGeneration ? approve(data.orderID, actions) : undefined,
            onCancel: () => { if (generation === currentGeneration) options.onFailure(); },
            onError: () => {
              if (generation !== currentGeneration) return;
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
    hasPendingApproval: () => Boolean(approvedOrderId || verifiedPayment || confirmation),
    begin: () => { if (!approvedOrderId && !verifiedPayment) { cleanup(); details = null; } },
    close: cleanup,
    retry: () => approvedOrderId || verifiedPayment ? approve(approvedOrderId) : show(),
  };
};
