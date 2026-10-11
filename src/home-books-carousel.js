(() => {
  const carousel = document.querySelector("#homeBooksCarousel");
  const books = document.querySelectorAll("#libraryView .shop-book");
  if (!carousel || !books.length) return;

  books.forEach((book) => {
    const image = book.querySelector("img");
    const title = book.querySelector("h4");
    if (!image || !title) return;

    const card = document.createElement("article");
    card.className = "home-book-slide";
    const cover = image.cloneNode();
    cover.loading = "lazy";
    cover.removeAttribute("width");
    cover.removeAttribute("height");
    card.append(cover);
    const label = document.createElement("h3");
    label.textContent = title.textContent;
    card.append(label);
    carousel.append(card);
  });
})();
