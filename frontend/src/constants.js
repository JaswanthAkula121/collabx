export const NAV_LINKS = ["Features", "GitHub"];

export const FEATURES = [
  {
    id: "collab",
    icon: "</>",
    color: "purple",
    title: "Real-time Collaboration",
    desc: "Code together in real-time with cursor sharing, highlighting, and follow mode.",
    extra: "avatars",
  },
  {
    id: "terminal",
    icon: ">_",
    color: "yellow",
    title: "Shared Terminal",
    desc: "Execute code and see results together with over 80 supported languages.",
  },
  {
    id: "preview",
    icon: "◈",
    color: "cyan",
    title: "Live Preview",
    desc: "Preview UI changes instantly with loaded libraries like Tailwind CSS and more.",
  },
  {
  id: "rooms",
  icon: "🔒",
  color: "green",
  title: "Protected Rooms",
  desc: "Create secure coding rooms with custom passwords.",
},
{
  id: "chat",
  icon: "💬",
  color: "blue",
  title: "Live Chat",
  desc: "Collaborate instantly with built-in realtime messaging.",
},
   
];

export const AVATARS = [
  { initials: "AZ", bg: "#7c3aed", label: "Azuki" },
  { initials: "MA", bg: "#16a34a", label: "Maple" },
  { initials: "SH", bg: "#0891b2", label: "Shigure" },
  { initials: "CI", bg: "#ca8a04", label: "Cinnamon" },
  { initials: "FR", bg: "#db2777", label: "Fraise" },
];

export const CODE_LINES = [
  { text: "class MainCafe:", type: "keyword" },
  { text: "  def __init__(self):", type: "def" },
  { text: "    self.energy = 100", type: "normal" },
  {
    text: '    self.name = "cafe"',
    type: "normal",
    chip: {
      label: "Azuki",
      color: "#7c3aed",
    },
  },
  { text: " ", type: "blank" },

  { text: "  def hire_maid(self):", type: "def" },
  { text: "    for maid in self.maids:", type: "normal" },
  {
    text: "      maid.work()",
    type: "normal",
    chip: {
      label: "Vanilla",
      color: "#16a34a",
    },
  },

  { text: " ", type: "blank" },

  { text: "  def serve(self):", type: "def" },
  {
    text: '    print("fetching customers")',
    type: "normal",
  },

  { text: " ", type: "blank" },

  { text: "  def collect(self, maid):", type: "def" },
  { text: "    for i in range(3):", type: "normal" },
  {
    text: "      maid.work()",
    type: "normal",
    chip: {
      label: "Maple",
      color: "#0891b2",
    },
  },
];

export const TERMINAL_LINES = [
  {
    text: "✨ Welcome to CodeXshare - Code Collaboration Platform",
    color: "text-purple-400",
    bold: true,
  },

  {
    text: "-------------------------------",
    color: "text-purple-400",
  },

  {
    text: "This is a shared terminal. All participants can view the output here.",
    color: "text-gray-400",
  },

  { text: " ", color: "" },

  {
    text: "Type your code in the editor and click run.",
    color: "text-gray-400",
  },

  {
    text: "Select language via the dropdown in the bottom right corner.",
    color: "text-gray-400",
  },

  { text: " ", color: "" },

  {
    text: "[00:30:09:178] ▶ executing code...",
    color: "text-green-400",
  },

  {
    text: "  Error: 'cafe' was never closed",
    color: "text-red-400",
  },

  {
    text: "  Traceback: use was never closed",
    color: "text-red-400",
  },

  {
    text: "[00:30:13:722] ▶ Freestyle code...",
    color: "text-yellow-400",
  },

  {
    text: "[00:30:14:255] Python 3.10.0 (87ms)",
    color: "text-green-400",
  },

  {
    text: "  Hello World!",
    color: "text-green-300",
  },
];

export const SALES_BARS = [
  {
    height: 30,
    color: "from-violet-600 to-purple-500",
  },

  {
    height: 48,
    color: "from-pink-500 to-purple-500",
  },

  {
    height: 58,
    color: "from-violet-600 to-purple-500",
  },

  {
    height: 38,
    color: "from-violet-600 to-purple-500",
  },

  {
    height: 62,
    color: "from-cyan-500 to-blue-500",
  },

  {
    height: 50,
    color: "from-violet-600 to-purple-500",
  },
];

export const ICON_CLASSES = {
  purple: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
  },

  yellow: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
  },

  cyan: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-400",
  },

  green: {
    bg: "bg-green-500/15",
    text: "text-green-400",
  },

  pink: {
    bg: "bg-pink-500/15",
    text: "text-pink-400",
  },

  blue: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
  },
};