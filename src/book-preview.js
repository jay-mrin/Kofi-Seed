(() => {
  const dialog = document.querySelector("#bookPreviewDialog");
  const titleOutput = document.querySelector("#bookPreviewTitle");
  const coverOutput = document.querySelector("#bookPreviewCover");
  const summaryOutput = document.querySelector("#bookPreviewSummary");
  const descriptionOutput = document.querySelector("#bookPreviewDescription");
  const pagesOutput = document.querySelector("#bookPreviewPages");
  const getLink = document.querySelector("#bookPreviewGetLink");
  const flipStage = document.querySelector("#bookFlipStage");
  const flipFront = document.querySelector("#bookFlipFront");
  const flipBack = document.querySelector("#bookFlipBack");
  const flipControls = document.querySelector("#bookFlipControls");
  const flipPrev = document.querySelector("#bookFlipPrev");
  const flipNext = document.querySelector("#bookFlipNext");
  const flipPageLabel = document.querySelector("#bookFlipPageLabel");
  const pageCopy = document.querySelector("#bookPreviewPageCopy");
  const closeButton = document.querySelector("#closeBookPreviewButton");
  const collections = document.querySelectorAll("#libraryView .shop-series-blue, #libraryView .shop-series-peach, #libraryView .shop-series-grey");
  if (!dialog || !collections.length) return;
  let previewPages = [];
  let previewPageIndex = 0;
  let turning = false;

  const renderFlipPage = () => {
    const page = previewPages[previewPageIndex];
    if (!page) return;
    const flipImage = flipFront.querySelector("img");
    const label = pageCopy.querySelector(".section-kicker");
    const heading = pageCopy.querySelector("h3");
    const body = pageCopy.querySelector("p:last-child");
    flipImage.hidden = Boolean(page.copy);
    pageCopy.hidden = !page.copy;
    if (page.copy) {
      label.textContent = page.label;
      heading.textContent = page.heading;
      body.textContent = page.copy;
    } else {
      flipImage.src = page.src;
      flipImage.alt = page.alt;
    }
    flipPageLabel.textContent = `${previewPageIndex + 1} / ${previewPages.length}`;
    flipPrev.disabled = previewPageIndex === 0;
    flipNext.disabled = previewPageIndex === previewPages.length - 1;
  };

  const turnPage = (direction) => {
    if (turning) return;
    const nextIndex = previewPageIndex + direction;
    if (nextIndex < 0 || nextIndex >= previewPages.length) return;
    turning = true;
    flipBack.style.backgroundImage = `url("${previewPages[nextIndex].src || ""}")`;
    flipStage.classList.toggle("is-turning-forward", direction > 0);
    flipStage.classList.toggle("is-turning-backward", direction < 0);
    window.setTimeout(() => {
      previewPageIndex = nextIndex;
      renderFlipPage();
      flipStage.classList.remove("is-turning-forward", "is-turning-backward");
      turning = false;
    }, 480);
  };

  const openPreview = (book) => {
    const title = book.querySelector("h4")?.textContent?.trim();
    const cover = book.querySelector("img");
    if (!title || !cover) return;

    titleOutput.textContent = title;
    coverOutput.src = cover.currentSrc || cover.src;
    coverOutput.alt = `${title} book cover`;
    const pages = Number.parseInt(book.dataset.bookPages, 10);
    pagesOutput.textContent = Number.isFinite(pages) ? `Page Count: ${pages}` : "";
    const seriesName = book.dataset.bookSeries || "The Stories We Leave Behind";
    dialog.querySelector(".book-preview-copy .section-kicker").textContent = `Series: ${seriesName}`;
    summaryOutput.textContent = book.dataset.bookSummary || `A story from ${seriesName}.`;
    descriptionOutput.textContent = book.dataset.bookDescription || `Part of ${seriesName}.`;
    const seedCost = Number.parseInt(book.querySelector(".shop-seed-cost")?.textContent.match(/\d+/)?.[0], 10);
    const isFreePreview = book.dataset.bookNumber === "1";
    if (isFreePreview) {
      const firstPageCopy = book.dataset.bookSummary || "A first look inside this book.";
      previewPages = [
        { src: cover.currentSrc || cover.src, alt: `${title} cover` },
        { copy: firstPageCopy, label: `Free preview · ${seriesName}`, heading: title },
        { copy: book.dataset.bookDescription || firstPageCopy, label: `Book 1 · ${seriesName}`, heading: "About this story" },
      ];
      previewPageIndex = 0;
      flipControls.hidden = false;
      getLink.textContent = "Get Free Book 🌱";
    } else {
      previewPages = [];
      flipControls.hidden = true;
      getLink.textContent = `To Get: ${Number.isFinite(seedCost) ? seedCost : 2} 🌱`;
    }
    renderFlipPage();
    dialog.showModal();
  };

  collections.forEach((collection) => {
    const seriesName = collection.querySelector(".shop-series-heading h3")?.textContent.trim();
    collection.querySelectorAll(".shop-book").forEach((book, index) => {
      const title = book.querySelector("h4");
      if (!title) return;
      const bookNumber = index + 1;
      const bookLabel = `Book ${bookNumber}`;
      title.textContent = title.textContent.replace(/^Book \d+:\s*/, "");
      let subtitle = book.querySelector(".shop-book-series-subtitle");
      if (!subtitle) {
        subtitle = document.createElement("p");
        subtitle.className = "shop-book-series-subtitle";
        title.insertAdjacentElement("afterend", subtitle);
      }
      subtitle.textContent = bookLabel;
      book.dataset.bookNumber = String(bookNumber);
      book.dataset.bookSeries = seriesName || book.dataset.bookSeries || "";
      if (bookNumber === 1) {
        const cost = book.querySelector(".shop-seed-cost");
        if (cost) {
          cost.dataset.originalCost ||= cost.textContent.match(/\d+/)?.[0] || "0";
          cost.innerHTML = '<span aria-hidden="true">🌱</span> Free';
          const getButton = book.querySelector(".shop-get-button");
          if (getButton) getButton.setAttribute("aria-label", `Get ${title.textContent} free`);
        }
      }
      const currentDescription = book.dataset.bookDescription || "";
      book.dataset.bookDescription = `${bookLabel} in the ${book.dataset.bookSeries} series. ${currentDescription}`.trim();

      book.addEventListener("click", (event) => {
        if (event.target.closest(".shop-get-button")) return;
        openPreview(book);
      });
    });
  });

  closeButton?.addEventListener("click", () => dialog.close());
  flipPrev?.addEventListener("click", () => turnPage(-1));
  flipNext?.addEventListener("click", () => turnPage(1));
  getLink?.addEventListener("click", (event) => {
    event.preventDefault();
    dialog.close();
    const homeTab = document.querySelector('[data-section-tab="homeView"]');
    homeTab?.click();
    history.pushState(null, "", "#home");
    document.querySelector("#home")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    coverOutput.removeAttribute("src");
  });
})();
