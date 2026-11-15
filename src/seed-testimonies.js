(() => {
  const panel = document.querySelector(".seed-testimonies");
  if (!panel) return;
  const track = panel.querySelector(".testimony-track");
  const slides = [...track.querySelectorAll(".testimony-slide")];
  const navigation = panel.querySelector(".testimony-navigation");
  const dots = panel.querySelector(".testimony-dots");
  const status = panel.querySelector("#testimonyStatus");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = 0;
  let scrollFrame = 0;

  function updatePosition(index) {
    activeIndex = index;
    [...dots.children].forEach((dot, dotIndex) => {
      dot.setAttribute("aria-current", String(dotIndex === index));
    });
    status.textContent = `Testimony ${index + 1} of ${slides.length}`;
  }

  function showSlide(index, behavior = reducedMotion.matches ? "auto" : "smooth") {
    if (!track.clientWidth || !slides.length) return;
    const nextIndex = (index + slides.length) % slides.length;
    track.scrollTo({ left: nextIndex * track.clientWidth, behavior });
  }

  slides.forEach((slide, index) => {
    slide.setAttribute("aria-label", `${index + 1} of ${slides.length}`);
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "testimony-dot";
    dot.setAttribute("aria-label", `Show testimony ${index + 1}`);
    dot.setAttribute("aria-controls", "testimonyTrack");
    dot.addEventListener("click", () => showSlide(index));
    dots.appendChild(dot);
  });

  panel.querySelectorAll("[data-testimony-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      showSlide(activeIndex + Number(button.dataset.testimonyDirection));
    });
  });
  track.addEventListener("keydown", (event) => {
    if (event.target !== track) return;
    const destinations = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: slides.length - 1 };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    showSlide(destinations[event.key]);
  });
  track.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      if (!track.clientWidth) return;
      const index = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      if (index !== activeIndex) updatePosition(index);
    });
  }, { passive: true });

  const resizeObserver = new window.ResizeObserver(() => showSlide(activeIndex, "auto"));
  resizeObserver.observe(track);
  navigation.hidden = slides.length < 2;
  if (slides.length) updatePosition(0);
})();
