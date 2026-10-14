import type { Variants, Transition } from "motion/react"

/**
 * OBSIDIAN FLOW — Intelligence in Motion
 * Core easing curves and spring physics tailored for cybersecurity product experiences.
 */

export const flowEasing = [0.16, 1, 0.3, 1] as const // Premium cubic ease-out
export const sharpEasing = [0.25, 0.1, 0.25, 1] as const
export const smoothSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
  mass: 0.8,
}

export const snappySpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 28,
}

export const gentleSpring: Transition = {
  type: "spring",
  stiffness: 140,
  damping: 18,
}

// 1. Fade & Rise Presets
export const fadeUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: flowEasing,
    },
  },
}

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
}

// 2. Cinematic Masked Text Reveal
export const textMaskContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
}

export const textMaskItem: Variants = {
  hidden: {
    y: "115%",
    opacity: 0,
  },
  visible: {
    y: "0%",
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: flowEasing,
    },
  },
}

// 3. Staggered Container
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: flowEasing,
    },
  },
}

// 4. Tactile Card & Button Variants
export const cardHoverVariants: Variants = {
  rest: {
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: flowEasing },
  },
  hover: {
    y: -4,
    scale: 1.012,
    transition: { duration: 0.25, ease: flowEasing },
  },
  tap: {
    scale: 0.985,
    y: -1,
    transition: { duration: 0.1 },
  },
}

export const buttonVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.025,
    y: -2,
    transition: { duration: 0.2, ease: flowEasing },
  },
  tap: {
    scale: 0.97,
    y: 0,
    transition: { duration: 0.1 },
  },
}

// 5. Page Transitions
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: flowEasing,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.25,
      ease: "easeIn",
    },
  },
}

// 6. SVG Drawing Paths
export const pathVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1.2, ease: flowEasing },
      opacity: { duration: 0.3 },
    },
  },
}
