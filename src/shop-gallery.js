document.querySelectorAll(".shop-get-button").forEach((button) => {
  button.addEventListener("click", () => {
    const status = button.closest(".shop-book").querySelector(".shop-get-status");
    status.textContent = "Coming soon — this book isn't available to get yet.";
    status.hidden = false;
  });
});
