(() => {
  const panel = document.querySelector(".seed-testimonies");
  if (!panel) return;
  const track = panel.querySelector(".testimony-track");
  const slides = [...track.querySelectorAll(".testimony-slide")];
  if (!slides.length) return;
  const status = panel.querySelector("#testimonyStatus");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = 0;
  let scrollFrame = 0;
  let autoAdvanceTimer = 0;
  let pointerDown = false;

  // A visual copy lets the last testimony slide left into the first one.
  if (slides.length > 1) {
    const firstSlideCopy = slides[0].cloneNode(true);
    firstSlideCopy.setAttribute("aria-hidden", "true");
    firstSlideCopy.setAttribute("inert", "");
    track.appendChild(firstSlideCopy);
  }

  function updatePosition(index) {
    activeIndex = index;
    status.textContent = `Testimony ${index + 1} of ${slides.length}`;
  }

  function showSlide(index, behavior = reducedMotion.matches ? "auto" : "smooth") {
    if (!track.clientWidth) return;
    const nextIndex = index === slides.length && slides.length > 1
      ? slides.length : (index + slides.length) % slides.length;
    track.scrollTo({ left: nextIndex * track.clientWidth, behavior });
  }

  function stopAutoAdvance() {
    window.clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = 0;
  }

  function scheduleAutoAdvance() {
    stopAutoAdvance();
    if (slides.length < 2 || document.hidden || reducedMotion.matches || pointerDown) return;
    autoAdvanceTimer = window.setTimeout(() => {
      showSlide(activeIndex + 1);
      scheduleAutoAdvance();
    }, 25000);
  }

  slides.forEach((slide, index) => {
    slide.setAttribute("aria-label", `${index + 1} of ${slides.length}`);
  });

  panel.addEventListener("click", (event) => {
    const arrow = event.target.closest("[data-testimony-step]");
    if (!arrow) return;
    showSlide(activeIndex + Number(arrow.dataset.testimonyStep));
    scheduleAutoAdvance();
  });

  track.addEventListener("keydown", (event) => {
    if (event.target !== track) return;
    const destinations = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: slides.length - 1 };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    showSlide(destinations[event.key]);
    scheduleAutoAdvance();
  });
  track.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      if (!track.clientWidth) return;
      const physicalIndex = Math.max(0, Math.min(slides.length, Math.round(track.scrollLeft / track.clientWidth)));
      const index = physicalIndex % slides.length;
      if (index !== activeIndex) updatePosition(index);
      if (!pointerDown && Math.abs(track.scrollLeft - slides.length * track.clientWidth) < 1) {
        track.scrollTo({ left: 0, behavior: "instant" });
      }
      scheduleAutoAdvance();
    });
  }, { passive: true });
  track.addEventListener("pointerdown", () => {
    pointerDown = true;
    stopAutoAdvance();
  }, { passive: true });
  function releasePointer() {
    if (!pointerDown) return;
    pointerDown = false;
    if (track.clientWidth && Math.abs(track.scrollLeft - slides.length * track.clientWidth) < 1) {
      track.scrollTo({ left: 0, behavior: "instant" });
    }
    scheduleAutoAdvance();
  }
  window.addEventListener("pointerup", releasePointer, { passive: true });
  window.addEventListener("pointercancel", releasePointer, { passive: true });
  track.addEventListener("wheel", scheduleAutoAdvance, { passive: true });
  document.addEventListener("visibilitychange", scheduleAutoAdvance);
  reducedMotion.addEventListener("change", scheduleAutoAdvance);

  const resizeObserver = new window.ResizeObserver(() => showSlide(activeIndex, "auto"));
  resizeObserver.observe(track);
  updatePosition(0);
  scheduleAutoAdvance();
})();
