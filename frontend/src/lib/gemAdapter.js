export const categoryOptions = [
  { value: "street-food-momo", label: "Street Food & Momo" },
  { value: "viewpoints", label: "Quiet Viewpoints" },
  { value: "heritage-courtyards", label: "Heritage & Courtyards" },
  { value: "hidden-cafes", label: "Hidden Cafes & Tea Houses" },
  { value: "nature-trails", label: "Nature & Short Trails" },
  { value: "arts-crafts", label: "Local Art & Crafts" },
  { value: "nightlife-music", label: "Nightlife & Live Music" },
  { value: "books-study", label: "Books & Study Spots" },
];

const categoryAliases = {
  cafe: "hidden-cafes",
  cafes: "hidden-cafes",
  restaurant: "street-food-momo",
  food: "street-food-momo",
  "cafés & food": "hidden-cafes",
  culture: "heritage-courtyards",
  "culture & history": "heritage-courtyards",
  "quiet corners": "viewpoints",
  viewpoints: "viewpoints",
  nature: "nature-trails",
  "nature & views": "nature-trails",
  "local shops": "arts-crafts",
};

export function normalizeCategory(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return categoryOptions.find((item) => item.value === normalized || item.label.toLowerCase() === normalized)?.value
    || categoryAliases[normalized]
    || normalized.replaceAll(/\s+/g, "-");
}

export function normalizeGem(gem) {
  if (!gem) return gem;
  const images = (gem.images || [])
    .map((image) => typeof image === "string" ? image : image?.url)
    .filter(Boolean);
  const author = gem.submittedBy || gem.createdBy || gem.curator?.user || gem.curator;
  const category = categoryOptions.find((item) => item.value === normalizeCategory(gem.category))?.label || gem.category;

  return {
    ...gem,
    name: gem.name || gem.title,
    address: gem.address || gem.location?.address || "",
    location: { ...gem.location, address: gem.location?.address || gem.address || "" },
    images,
    image: images[0] || gem.image,
    category,
    rating: gem.rating || gem.averageRating,
    submittedBy: author
      ? { ...author, avatar: author.avatar || author.avatarUrl }
      : undefined,
  };
}

export function leafletCoordinates(gem) {
  const coordinates = gem.location?.coordinates || gem.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  return gem.location?.type === "Point"
    ? [Number(coordinates[1]), Number(coordinates[0])]
    : [Number(coordinates[0]), Number(coordinates[1])];
}

export function geoPointFromMap([latitude, longitude]) {
  return { type: "Point", coordinates: [Number(longitude), Number(latitude)] };
}
