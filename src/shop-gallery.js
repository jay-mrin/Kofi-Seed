document.querySelectorAll(".shop-get-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.closest(".shop-book")?.dataset.bookNumber === "1") return;
    const status = button.closest(".shop-book").querySelector(".shop-get-status");
    if (!status.hidden) {
      status.hidden = true;
      return;
    }
    status.textContent = button.closest(".shop-book")?.dataset.bookNumber === "1"
      ? "This first ebook in the series is free. Open its cover to read the preview."
      : "To receive this ebook as a digital download, sow the required number of Seeds and choose the ebook. We’ll also send it to you by email.";
    status.hidden = false;
  });
});
