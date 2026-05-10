export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: "easeOut" },
  }),
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: (delay = 0) => ({
    opacity: 1,
    transition: { duration: 0.45, delay, ease: "easeOut" },
  }),
};

export const slideRight = {
  hidden: { opacity: 0, x: -16 },
  show: (delay = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, delay, ease: "easeOut" },
  }),
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

export const hoverLift = {
  whileHover: { y: -3, transition: { duration: 0.2 } },
};
