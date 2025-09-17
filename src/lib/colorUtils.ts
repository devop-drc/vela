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