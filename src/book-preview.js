(() => {
  const dialog = document.querySelector("#bookPreviewDialog");
  const titleOutput = document.querySelector("#bookPreviewTitle");
  const coverOutput = document.querySelector("#bookPreviewCover");
  const summaryOutput = document.querySelector("#bookPreviewSummary");
  const descriptionOutput = document.querySelector("#bookPreviewDescription");
  const pagesOutput = document.querySelector("#bookPreviewPages");
  const getLink = document.querySelector("#bookPreviewGetLink");
  const pdfReader = document.querySelector("#freeEbookPdfReader");
  const pdfFrame = document.querySelector("#freeEbookPdfFrame");
  const pdfStatus = document.querySelector("#freeEbookPdfStatus");
  const previewCard = dialog?.querySelector(".book-preview-card");
  const flipStage = document.querySelector("#bookFlipStage");
  const flipFront = document.querySelector("#bookFlipFront");
  const flipBack = document.querySelector("#bookFlipBack");
  const flipControls = document.querySelector("#bookFlipControls");
  const flipHint = document.querySelector("#bookFlipHint");
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
  let activeFreeEbookPdf = "";
  let pdfLoadVersion = 0;
  let touchStartX = null;

  const loadFreeEbookPdf = async (relativePath) => {
    const loadVersion = ++pdfLoadVersion;
    activeFreeEbookPdf = "";
    getLink.hidden = true;
    pdfFrame.hidden = true;
    pdfFrame.removeAttribute("src");
    pdfStatus.hidden = false;
    pdfStatus.textContent = "Loading the free EBook PDF…";

    if (!relativePath) {
      pdfStatus.textContent = "The PDF for this free EBook has not been added yet.";
      return;
    }

    const pdfUrl = new URL(relativePath, document.baseURI);
    try {
      const response = await fetch(pdfUrl, { method: "HEAD", cache: "no-store" });
      if (loadVersion !== pdfLoadVersion) return;
      if (!response.ok) throw new Error("PDF not found");

      activeFreeEbookPdf = pdfUrl.href;
      pdfFrame.src = `${pdfUrl.href}#toolbar=1&navpanes=0&view=FitH`;
      pdfFrame.hidden = false;
      pdfStatus.hidden = true;
      getLink.href = pdfUrl.href;
      getLink.download = pdfUrl.pathname.split("/").pop() || "free-ebook.pdf";
      getLink.textContent = "Download Free EBook PDF";
      getLink.setAttribute("aria-label", "Download this free EBook PDF");
      getLink.hidden = false;
    } catch {
      if (loadVersion !== pdfLoadVersion) return;
      pdfStatus.textContent = "This free EBook PDF is not available yet.";
    }
  };

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
    pdfLoadVersion += 1;
    activeFreeEbookPdf = "";
    const title = book.querySelector("h4")?.textContent?.trim();
    const cover = book.querySelector("img");
    if (!title || !cover) return;

    titleOutput.textContent = title;
    coverOutput.src = cover.currentSrc || cover.src;
    coverOutput.alt = `${title} ebook cover`;
    const pages = Number.parseInt(book.dataset.bookPages, 10);
    pagesOutput.textContent = Number.isFinite(pages) ? `Page Count: ${pages}` : "";
    const seriesName = book.dataset.bookSeries || "The Stories We Leave Behind";
    dialog.querySelector(".book-preview-copy .section-kicker").textContent = `Series: ${seriesName}`;
    summaryOutput.textContent = book.dataset.bookSummary || `A story from ${seriesName}.`;
    descriptionOutput.textContent = book.dataset.bookDescription || `Part of ${seriesName}.`;
    const seedCost = Number.parseInt(book.querySelector(".shop-seed-cost")?.textContent.match(/\d+/)?.[0], 10);
    const isFreePreview = book.dataset.bookNumber === "1";
    const pdfPath = isFreePreview ? book.dataset.freeEbookPdf || "" : "";
    previewCard.classList.toggle("is-pdf-reader", isFreePreview);
    pdfReader.hidden = !isFreePreview;
    flipStage.hidden = isFreePreview;
    if (isFreePreview) {
      previewPages = [];
      previewPageIndex = 0;
      flipControls.hidden = true;
      flipHint.hidden = true;
      pagesOutput.hidden = true;
      getLink.hidden = true;
      void loadFreeEbookPdf(pdfPath);
    } else {
      previewPages = [];
      flipControls.hidden = true;
      flipHint.hidden = true;
      pagesOutput.hidden = false;
      getLink.hidden = false;
      getLink.href = "#support";
      getLink.removeAttribute("download");
      getLink.textContent = `To Get: ${Number.isFinite(seedCost) ? seedCost : 2}+ 🌱`;
      getLink.removeAttribute("aria-label");
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
      const bookLabel = `EBook ${bookNumber}`;
      title.textContent = title.textContent.replace(/^(?:EBook|Book) \d+:\s*/, "");
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
          if (getButton) {
            getButton.textContent = "Get Free EBook 🌱";
            getButton.setAttribute("aria-label", `Open the free ${title.textContent} ebook reader`);
            getButton.addEventListener("click", (event) => {
              event.stopPropagation();
              openPreview(book);
            });
          }
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
  flipStage?.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });
  flipStage?.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(delta) >= 48) turnPage(delta < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (!dialog.open || !previewPages.length) return;
    if (event.key === "ArrowRight") turnPage(1);
    if (event.key === "ArrowLeft") turnPage(-1);
  });
  getLink?.addEventListener("click", (event) => {
    if (activeFreeEbookPdf) return;
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
    pdfLoadVersion += 1;
    coverOutput.removeAttribute("src");
    pdfFrame.removeAttribute("src");
    activeFreeEbookPdf = "";
    pdfReader.hidden = true;
    flipStage.hidden = false;
    previewCard.classList.remove("is-pdf-reader");
  });
})();
