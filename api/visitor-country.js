module.exports = function visitorCountry(request, response) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Vercel-CDN-Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const header = request.headers["x-vercel-ip-country"];
  const country = typeof header === "string" ? header.trim().toUpperCase() : "";
  return response.status(200).json({ country: /^[A-Z]{2}$/.test(country) ? country : "" });
};
