document.querySelectorAll(".shop-get-button").forEach((button) => {
  button.addEventListener("click", () => {
    const status = button.closest(".shop-book").querySelector(".shop-get-status");
    if (!status.hidden) {
      status.hidden = true;
      return;
    }
    status.textContent = button.closest(".shop-book")?.dataset.bookNumber === "1"
      ? "This first book in the series is free. Open its cover to read the preview."
      : "To receive this book as a digital download, sow the required number of Seeds and choose the book. We’ll also send it to you by email.";
    status.hidden = false;
  });
});
