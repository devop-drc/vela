const colors = [
  { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" },
  { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
  { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300" },
  { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" },
  { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
];

export const getCategoryColor = (category: string | null | undefined) => {
  if (!category) {
    return { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" };
  }
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
};

const colorNameToHex = (color: string) => {
  const colorMap: { [key: string]: string } = {
    "black": "#000000", "white": "#ffffff", "red": "#ff0000", "lime": "#00ff00", "blue": "#0000ff",
    "yellow": "#ffff00", "cyan": "#00ffff", "magenta": "#ff00ff", "silver": "#c0c0c0", "gray": "#808080",
    "maroon": "#800000", "olive": "#808000", "green": "#008000", "purple": "#800080", "teal": "#008080",
    "navy": "#000080", "orange": "#ffa500",
  };
  const lowerColor = color.toLowerCase();
  if (colorMap[lowerColor]) return colorMap[lowerColor];
  if (/^#[0-9A-F]{6}$/i.test(color) || /^#[0-9A-F]{3}$/i.test(color)) return color;
  return null;
};

const isColorLight = (hexColor: string | null): boolean => {
  if (!hexColor) return true;
  let r, g, b;
  if (hexColor.length === 4) {
    r = parseInt(hexColor[1] + hexColor[1], 16);
    g = parseInt(hexColor[2] + hexColor[2], 16);
    b = parseInt(hexColor[3] + hexColor[3], 16);
  } else {
    r = parseInt(hexColor.substring(1, 3), 16);
    g = parseInt(hexColor.substring(3, 5), 16);
    b = parseInt(hexColor.substring(5, 7), 16);
  }
  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
  return hsp > 127.5;
};

export const getTextColorForBackground = (colorString: string) => {
  const hex = colorNameToHex(colorString);
  return isColorLight(hex) ? 'text-gray-800' : 'text-white';
};