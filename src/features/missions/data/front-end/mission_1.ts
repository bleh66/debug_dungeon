import type { Mission } from "../../types/mission";

export const landingPageRescue: Mission = {
  id: "frontend-01",

  title: "Landing Page Rescue",

  topic: "CSS Flexbox ",

  track: "frontend",

  difficulty: "Easy",

  xpReward: 100,

  estimatedTime: 15,

  description:
    "A client's landing page is broken on smaller screens. Your job is to diagnose the issue and restore a responsive layout.",

  objectives: [
    "Identify the layout issue",
    "Fix the responsive behavior",
    "Restore consistent spacing"
  ],

  questions: [
    {
      id: 1,
      category: "CSS Flexbox",
      question: "Which flexbox property pushes items to the far edges of a row?",
      options: [
        "justify-content",
        "align-items",
        "flex-wrap",
        "gap"
      ],
      correctAnswer: 0,
      explanation: "justify-content controls distribution along the main axis, which is what separates items across a row.",
      xp: 20
    },
    {
      id: 2,
      category: "Responsive Layout",
      question: "Which CSS unit scales relative to the root font size?",
      options: [
        "px",
        "rem",
        "vh",
        "%"
      ],
      correctAnswer: 1,
      explanation: "rem stays consistent with the document root, making spacing easier to scale across breakpoints.",
      xp: 20
    },
    {
      id: 3,
      category: "Spacing",
      question: "Which property creates consistent space between flex or grid children without margin tricks?",
      options: [
        "padding",
        "border-spacing",
        "gap",
        "inset"
      ],
      correctAnswer: 2,
      explanation: "gap is the cleanest way to separate items inside flex and grid layouts.",
      xp: 20
    },
    {
      id: 4,
      category: "Viewport",
      question: "What does the viewport meta tag help mobile browsers understand?",
      options: [
        "Page animation timing",
        "The visible area and scaling rules",
        "Server response headers",
        "Font loading strategy"
      ],
      correctAnswer: 1,
      explanation: "The viewport tag tells the browser how to size and scale the layout on smaller screens.",
      xp: 20
    },
    {
      id: 5,
      category: "Debugging",
      question: "When a layout shifts unexpectedly, what is the best first move?",
      options: [
        "Change all colors first",
        "Add more animations",
        "Inspect the smallest failing layout surface",
        "Rewrite the entire page"
      ],
      correctAnswer: 2,
      explanation: "Reducing the problem to the smallest visible failure usually reveals the root cause faster.",
      xp: 20
    }
  ]
};