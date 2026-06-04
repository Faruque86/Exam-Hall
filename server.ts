import express from 'express';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import { Quiz, QuizAttempt, User, LeaderboardEntry, Question, QuizApproval, SubMenu } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Path to durable storage
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'quiz_db.json');

// Memory store fallback
interface DatabaseSchema {
  users: User[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  passwords: Record<string, string>; // userId -> password (stored simply for mock validation)
  approvals?: QuizApproval[];
  subMenus?: SubMenu[];
}

let dbData: DatabaseSchema = {
  users: [],
  quizzes: [],
  attempts: [],
  passwords: {},
  approvals: [],
  subMenus: []
};

// Seed Quiz Questions
const webDevQuestions: Question[] = [
  {
    id: "wdq1",
    text: "What does HTML stand for?",
    options: {
      A: "HyperText Markup Language",
      B: "HighText Machine Language",
      C: "HyperTransfer Multi Language",
      D: "HighTech Media Language"
    },
    correctAnswer: "A",
    explanation: "HTML stands for HyperText Markup Language. It is the standard markup language used to structure web pages."
  },
  {
    id: "wdq2",
    text: "Which CSS property controls the text size?",
    options: {
      A: "text-style",
      B: "font-style",
      C: "font-size",
      D: "text-size"
    },
    correctAnswer: "C",
    explanation: "The font-size property in CSS sets the size of the font."
  },
  {
    id: "wdq3",
    text: "What is the output of 'typeof null' in JavaScript?",
    options: {
      A: "object",
      B: "null",
      C: "undefined",
      D: "type-error"
    },
    correctAnswer: "A",
    explanation: "In JavaScript, typeof null is historical behavior returning 'object'. Although a bug, it cannot be fixed without breaking backward compatibility."
  },
  {
    id: "wdq4",
    text: "Which TypeScript configuration file specifies root files and compiler options?",
    options: {
      A: "package.json",
      B: "typescript.config",
      C: "tsconfig.json",
      D: "tslint.json"
    },
    correctAnswer: "C",
    explanation: "tsconfig.json dictates configuration settings for the TypeScript compiler."
  },
  {
    id: "wdq5",
    text: "Which React hook is used to perform side effects in functional components?",
    options: {
      A: "useState",
      B: "useEffect",
      C: "useContext",
      D: "useReducer"
    },
    correctAnswer: "B",
    explanation: "The useEffect Hook lets you perform side effects in function components, such as data fetching, subscriptions, or manual DOM manipulations."
  },
  {
    id: "wdq6",
    text: "What is the correct syntax for a React Fragment?",
    options: {
      A: "<Fragment></Fragment>",
      B: "<></>",
      C: "<react:fragment></react:fragment>",
      D: "Both A and B are correct"
    },
    correctAnswer: "D",
    explanation: "Both <Fragment> (imported from React) and the short syntax <></> are valid ways to return multiple elements without adding extra nodes to the DOM."
  },
  {
    id: "wdq7",
    text: "Which Tailwind CSS responsive modifier targets screens of size medium (768px) and above?",
    options: {
      A: "sm:",
      B: "md:",
      C: "lg:",
      D: "xl:"
    },
    correctAnswer: "B",
    explanation: "In Tailwind CSS, sm: is for 640px+, md: is for 768px+, lg: is for 1024px+, and xl: is for 1280px+."
  },
  {
    id: "wdq8",
    text: "In Git, how do you commit saved staging changes to the permanent history?",
    options: {
      A: "git stage",
      B: "git commit -m 'message'",
      C: "git save",
      D: "git push origin"
    },
    correctAnswer: "B",
    explanation: "git commit records changes from the staging area to the local repository history."
  },
  {
    id: "wdq9",
    text: "Which SQL clause is used to retrieve data from a database?",
    options: {
      A: "RETRIEVE",
      B: "GET",
      C: "SELECT",
      D: "FETCH"
    },
    correctAnswer: "C",
    explanation: "The SELECT statement in SQL is used to extract data from a database."
  },
  {
    id: "wdq10",
    text: "What does URL stand for?",
    options: {
      A: "Uniform Resource Locator",
      B: "Universal Route Link",
      C: "Unique Resource Locator",
      D: "Unified Relational Line"
    },
    correctAnswer: "A",
    explanation: "URL stands for Uniform Resource Locator, colloquially termed a web address."
  },
  {
    id: "wdq11",
    text: "Which HTTP status code represents Client Error Unauthorized?",
    options: {
      A: "401",
      B: "403",
      C: "404",
      D: "400"
    },
    correctAnswer: "A",
    explanation: "The HTTP 401 Unauthorized status code indicates that the request has not been applied because it lacks valid authentication credentials."
  },
  {
    id: "wdq12",
    text: "How do you declare a variable in block scope that cannot be reassigned?",
    options: {
      A: "let",
      B: "var",
      C: "const",
      D: "immutable"
    },
    correctAnswer: "C",
    explanation: "The const declaration creates block-scoped read-only variables whose values cannot be changed through reassignment."
  },
  {
    id: "wdq13",
    text: "What is the Virtual DOM in React?",
    options: {
      A: "A hardware accelerator for rendering browser layouts",
      B: "An exact physical layer connected directly to the browser window",
      C: "A direct proxy for Google Search Index analytics",
      D: "A lightweight programming concept where an ideal UI representation is kept in memory"
    },
    correctAnswer: "D",
    explanation: "The virtual DOM is a programming concept where an ideal, or 'virtual', representation of a UI is kept in memory and synced with the 'real' DOM by a library such as ReactDOM (reconciliation)."
  },
  {
    id: "wdq14",
    text: "Which command installs all required packages defined inside package.json dependencies?",
    options: {
      A: "npm start",
      B: "npm install",
      C: "npm build",
      D: "npm package"
    },
    correctAnswer: "B",
    explanation: "npm install downloads and resolves external code dependencies into the local node_modules directory."
  },
  {
    id: "wdq15",
    text: "Which syntax is the primary serialization formatting standard for web APIs?",
    options: {
      A: "JSON",
      B: "XML",
      C: "YAML",
      D: "CSV"
    },
    correctAnswer: "A",
    explanation: "JSON (JavaScript Object Notation) is a lightweight file and data-interchange format easily read by computers and humans."
  },
  {
    id: "wdq16",
    text: "Which TypeScript utility type constructs a type with all properties of another type set to optional?",
    options: {
      A: "Required<T>",
      B: "Partial<T>",
      C: "ReadOnly<T>",
      D: "Omit<T, K>"
    },
    correctAnswer: "B",
    explanation: "The Partial<T> utility builds a type where all properties of T are optionally set to undefined."
  },
  {
    id: "wdq17",
    text: "What does setting the CSS 'display: grid' property prepare on a container?",
    options: {
      A: "A one-dimensional row formatting box",
      B: "A two-dimensional coordinate-based rendering mesh",
      C: "A float-clearing absolute viewport",
      D: "A background vector painting guide"
    },
    correctAnswer: "B",
    explanation: "CSS Grid Layout creates a two-dimensional layout system grid-based layout handling columns and rows."
  },
  {
    id: "wdq18",
    text: "Which Array method returns a new array containing only indices that satisfy a user criteria?",
    options: {
      A: "map()",
      B: "reduce()",
      C: "filter()",
      D: "find()"
    },
    correctAnswer: "C",
    explanation: "The filter() method shallow copies a portion of a given array, filtered down to just the elements that pass the test implemented by the provided function."
  },
  {
    id: "wdq19",
    text: "What is Vite?",
    options: {
      A: "A server side rendering database connector",
      B: "An ultra-fast, modern web build tool and dev server",
      C: "A code styling checker matching ES6 definitions",
      D: "A cloud deployment terminal simulator"
    },
    correctAnswer: "B",
    explanation: "Vite is a build tool that aims to provide a faster and leaner development experience for modern web projects."
  },
  {
    id: "wdq20",
    text: "In Node.js context, what is NPM's main purpose?",
    options: {
      A: "Native Protocol Modifier",
      B: "Node Package Manager",
      C: "Neural Predictive Modeler",
      D: "Nested Port Monitor"
    },
    correctAnswer: "B",
    explanation: "NPM is the Node Package Manager, used to search, share, and install packages for server-side or frontend libraries."
  }
];

const banglaCultureQuestions: Question[] = [
  {
    id: "bnq1",
    text: "বাংলাদেশের স্বাধীনতা দিবস কবে পালন করা হয়?",
    options: {
      A: "১৬ই ডিসেম্বর",
      B: "২৬শে মার্চ",
      C: "২১শে ফেব্রুয়ারি",
      D: "১৪ই এপ্রিল"
    },
    correctAnswer: "B",
    explanation: "২৬শে মার্চ বাংলাদেশের স্বাধীনতা দিবস। ১৯৭১ সালের এই দিনে আনুষ্ঠানিকভাবে স্বাধীনতার ঘোষণা দেয়া হয়।"
  },
  {
    id: "bnq2",
    text: "বাংলাদেশ কত সালে স্বাধীন রাষ্ট্র হিসেবে প্রতিষ্ঠিত হয়?",
    options: {
      A: "১৯৭২",
      B: "১৯৪৭",
      C: "১৯৭১",
      D: "১৯৫২"
    },
    correctAnswer: "C",
    explanation: "১৯৭১ সালের ১৬ই ডিসেম্বর দীর্ঘ ৯ মাসের সশস্ত্র সংগ্রামের মধ্য দিয়ে বাংলাদেশ একটি স্বাধীন সার্বভৌম দেশ হিসেবে আত্মপ্রকাশ করে।"
  },
  {
    id: "bnq3",
    text: "বাংলাদেশের জাতীয় খেলা কোনটি?",
    options: {
      A: "ক্রিকেট",
      B: "ফুটবল",
      C: "হকি",
      D: "হা-ডু-ডু (কাবাডি)"
    },
    correctAnswer: "D",
    explanation: "হা-ডু-ডু বা কাবাডি বাংলাদেশের জাতীয় খেলা হিসেবে রাষ্ট্রীয়ভাবে স্বীকৃত।"
  },
  {
    id: "bnq4",
    text: "বাংলা সাহিত্যের আদি নিদর্শন কোনটি?",
    options: {
      A: "চর্যাপদ",
      B: "গীতাঞ্জলি",
      C: "মহাভারত",
      D: "শ্রীকৃষ্ণকীর্তন"
    },
    correctAnswer: "A",
    explanation: "বাংলা সাহিত্যের প্রাচীনতম লিখিত নিদর্শন হলো চর্যাপদ, যা অষ্টম থেকে দ্বাদশ শতাব্দীর মাঝে বৌদ্ধ সহজিয়াদের দ্বারা রচিত।"
  },
  {
    id: "bnq5",
    text: "বাংলাদেশের জাতীয় কবির নাম কী?",
    options: {
      A: "রবীন্দ্রনাথ ঠাকুর",
      B: "জসীমউদ্দীন",
      C: "কাজী নজরুল ইসলাম",
      D: "জীবনানন্দ দাশ"
    },
    correctAnswer: "C",
    explanation: "কাজী নজরুল ইসলাম বাংলাদেশের জাতীয় কবি। তিনি 'বিদ্রোহী কবি' হিসেবেও সমধিক পরিচিত।"
  },
  {
    id: "bnq6",
    text: "বাংলা নববর্ষের প্রথম মাসের নাম কী?",
    options: {
      A: "বৈশাখ",
      B: "আষাঢ়",
      C: "চৈত্র",
      D: "কার্তিক"
    },
    correctAnswer: "A",
    explanation: "বঙ্গাব্দের বা বাংলা সালের প্রথম মাস হলো বৈশাখ এবং পহেলা বৈশাখ হলো বর্ষবরণ উৎসব।"
  },
  {
    id: "bnq7",
    text: "বাংলাদেশের প্রথম রাষ্ট্রপতির নাম কী?",
    options: {
      A: "তাজউদ্দীন আহমদ",
      B: "সৈয়দ নজরুল ইসলাম",
      C: "বঙ্গবন্ধু শেখ মুজিবুর রহমান",
      D: "মোহাম্মদ উল্লাহ"
    },
    correctAnswer: "C",
    explanation: "জাতির পিতা বঙ্গবন্ধু শেখ মুজিবুর রহমান ১৯৭১ সালের ১৭ই এপ্রিল গঠিত মুজিবনগর সরকারের প্রথম রাষ্ট্রপতি ছিলেন।"
  },
  {
    id: "bnq8",
    text: "বিশ্বের বৃহত্তম ম্যানগ্রোভ বন 'সুন্দরবন' বাংলাদেশের কোন অঞ্চলে অবস্থিত?",
    options: {
      A: "উত্তর-পূর্ব অঞ্চল",
      B: "দক্ষিণ-পশ্চিম অঞ্চল",
      C: "দক্ষিণ-পূর্ব অঞ্চল",
      D: "উত্তর-পশ্চিম অঞ্চল"
    },
    correctAnswer: "B",
    explanation: "সুন্দরবন মূলত বাংলাদেশের দক্ষিণ-পশ্চিম উপকূলবর্তী জেলা খুলনা, বাগেরহাট ও সাতক্ষীরা অঞ্চলে অবস্থিত।"
  },
  {
    id: "bnq9",
    text: "বাংলাদেশের রাষ্ট্রীয় মুদ্রার নাম কী?",
    options: {
      A: "টাকা",
      B: "রুপি",
      C: "ডলার",
      D: "ইউরো"
    },
    correctAnswer: "A",
    explanation: "বাংলাদেশের রাষ্ট্রীয় মুদ্রার নাম টাকা এবং ক্ষুদ্রতম বিভাগের নাম পয়সা।"
  },
  {
    id: "bnq10",
    text: "ঐতিহাসিক সোনারগাঁওয়ের প্রাচীন নাম কী ছিল?",
    options: {
      A: "সুবর্ণগ্রাম",
      B: "জাহাঙ্গীরনগর",
      C: "নাসিরাবাদ",
      D: "খলিফাতাবাদ"
    },
    correctAnswer: "A",
    explanation: "সোনারগাঁওয়ের প্রাচীন নাম ছিল সুবর্ণগ্রাম। এটি প্রাচীন বাংলার ঈসা খাঁর বারো ভূঁইয়া সাম্রাজ্যের রাজধানী ছিল।"
  },
  {
    id: "bnq11",
    text: "রবীন্দ্রনাথ ঠাকুর কত সালে গীতাঞ্জলি কাব্যের জন্য বিখ্যাত নোবেল পুরস্কার লাভ করেন?",
    options: {
      A: "১৯১১",
      B: "১৯১৩",
      C: "১৯১৫",
      D: "১৯২১"
    },
    correctAnswer: "B",
    explanation: "রবীন্দ্রনাথ ঠাকুর ১৯১৩ সালে এশিয়ার প্রথম ব্যক্তি হিসেবে সাহিত্যে সম্মানজনক নোবেল অর্জন করেন।"
  },
  {
    id: "bnq12",
    text: "ইউনেস্কো (UNESCO) কত সালে ২১শে ফেব্রুয়ারিকে আন্তর্জাতিক মাতৃভাষা দিবস হিসেবে ঘোষণা দেয়?",
    options: {
      A: "১৯৭১",
      B: "১৯৯৬",
      C: "১৯৯৯",
      D: "২০০১"
    },
    correctAnswer: "C",
    explanation: "১৭ই নভেম্বর ১৯৯৯ সালে ইউনেস্কোর সাধারণ সভায় সর্বসম্মতিক্রমে ২১শে ফেব্রুয়ারিকে 'আন্তর্জাতিক মাতৃভাষা দিবস' হিসেবে ঘোষণা করা হয়।"
  },
  {
    id: "bnq13",
    text: "বাংলাদেশের দীর্ঘতম সীমানা বা বর্ডার বেল্ট কোন দেশের সাথে রয়েছে?",
    options: {
      A: "ভারত",
      B: "মিয়ানমার",
      C: "নেপাল",
      D: "চীন"
    },
    correctAnswer: "A",
    explanation: "বাংলাদেশের আন্তর্জাতিক স্থলসীমানার সিংহভাগ অর্থাৎ প্রায় ৪,১৫৬ কিমি ভারতের সাথে সংযুক্ত।"
  },
  {
    id: "bnq14",
    text: "তাজিংডং বা বিজয় পর্বতশৃঙ্গ বাংলাদেশের কোন জেলায় অবস্থিত?",
    options: {
      A: "সিলেট",
      B: "রাঙ্গামাটি",
      C: "খাগড়াছড়ি",
      D: "বান্দরবান"
    },
    correctAnswer: "D",
    explanation: "তাজিংডং পর্বতশৃঙ্গ বাংলাদেশের বান্দরবান পার্বত্য জেলার রুমা উপজেলায় অবস্থিত।"
  },
  {
    id: "bnq15",
    text: "ঐতিহাসিক প্রাকৃতিক ও প্রত্নতাত্ত্বিক নিদর্শন 'ময়নামতি' কোথায় অবস্থিত?",
    options: {
      A: "বগুড়া",
      B: "রাজশাহী",
      C: "কুমিল্লা",
      D: "দিনাজপুর"
    },
    correctAnswer: "C",
    explanation: "ময়নামতি কুমিল্লার লালমাই অঞ্চলে অবস্থিত বৌদ্ধ সভ্যতার এক অতি প্রাচীন লীলাভূমি ও ধ্বংসাবশেষ।"
  },
  {
    id: "bnq16",
    text: "বাংলা বর্ণমালায় মাত্রাছাড়া বর্ণ কয়টি রয়েছে?",
    options: {
      A: "৮টি",
      B: "১০টি",
      C: "১১টি",
      D: "৬টি"
    },
    correctAnswer: "B",
    explanation: "বাংলা বর্ণমালায় মোট মাত্রাছাড়া বর্ণ ১০টি (৪টি স্বরবর্ণ এবং ৬টি ব্যঞ্জনবর্ণ)।"
  },
  {
    id: "bnq17",
    text: "সাভারে আন্তর্জাতিক মানের জাতীয় স্মৃতিসৌধের প্রধান স্থপতি কে?",
    options: {
      A: "সৈয়দ মঈনুল হোসেন",
      B: "হামিদুর রহমান",
      C: "মুস্তাফা মনোয়ার",
      D: "ফজলুর রহমান খান"
    },
    correctAnswer: "A",
    explanation: "জাতীয় স্মৃতিসৌধের নকশাকার হলেন প্রখ্যাত স্থপতি সৈয়দ মঈনুল হোসেন।"
  },
  {
    id: "bnq18",
    text: "বাংলাদেশের জাতীয় ফল কোনটি?",
    options: {
      A: "আম",
      B: "কাঁঠাল",
      C: "লিচু",
      D: "নারকেল"
    },
    correctAnswer: "B",
    explanation: "কাঁঠাল হলো বাংলাদেশের জাতীয় ফল। এটি অত্যন্ত সুস্বাদু এবং এর বিচি অত্যন্ত পুষ্টিকর।"
  },
  {
    id: "bnq19",
    text: "মুঘল শাসনামলে রাজধানী হিসেবে গড়ে ওঠা ঢাকার পূর্ব প্রাচীন নাম কী ছিল?",
    options: {
      A: "নাসিরাবাদ",
      B: "জাহাঙ্গীরনগর",
      C: "মুর্শিদাবাদ",
      D: "আলাউদ্দিনপুর"
    },
    correctAnswer: "B",
    explanation: "১৬১০ সালে সুবাদার ইসলাম খান ঢাকা জয় করে মুঘল সম্রাট জাহাঙ্গীরের সম্মানার্থে এর নাম দেন জাহাঙ্গীরনগর।"
  },
  {
    id: "bnq20",
    text: "বাংলাদেশের দীর্ঘতম বৃহত্তম ও প্রধান নদীর নাম কী?",
    options: {
      A: "মেঘনা",
      B: "যমুনা",
      C: "পদ্মা",
      D: "কর্ণফুলী"
    },
    correctAnswer: "C",
    explanation: "পদ্মা বাংলাদেশের অন্যতম প্রধান দীর্ঘতম ও জটিল জলপ্রবাহসম্পন্ন বৃহত্তম নদী।"
  }
];

const class6Questions: Question[] = [
  {
    id: "c6q1",
    text: "Which of the following is a living thing?",
    options: { A: "Stone", B: "Water", C: "Plant", D: "Air" },
    correctAnswer: "C",
    explanation: "Plants have life, they grow, breathe and reproduce, so they are living things."
  },
  {
    id: "c6q2",
    text: "How many bones are there in an adult human body?",
    options: { A: "106", B: "206", C: "306", D: "406" },
    correctAnswer: "B",
    explanation: "There are 206 bones in an adult human body."
  }
];

const class7Questions: Question[] = [
  {
    id: "c7q1",
    text: "What is the capital of Bangladesh?",
    options: { A: "Sylhet", B: "Chittagong", C: "Dhaka", D: "Rajshahi" },
    correctAnswer: "C",
    explanation: "Dhaka is the capital and largest city of Bangladesh."
  },
  {
    id: "c7q2",
    text: "What is the chemical symbol for Water?",
    options: { A: "CO2", B: "H2O", C: "NaCl", D: "O2" },
    correctAnswer: "B",
    explanation: "Water consists of hydrogen and oxygen (H2O)."
  }
];

const class8Questions: Question[] = [
  {
    id: "c8q1",
    text: "Who wrote the national anthem of Bangladesh 'Amar Sonar Bangla'?",
    options: { A: "Kazi Nazrul Islam", B: "Rabindranath Tagore", C: "Jashimuddin", D: "Lalon Shah" },
    correctAnswer: "B",
    explanation: "Rabindranath Tagore wrote the national anthem 'Amar Sonar Bangla' in 1905."
  },
  {
    id: "c8q2",
    text: "Which planet is known as the Red Planet?",
    options: { A: "Venus", B: "Mars", C: "Jupiter", D: "Saturn" },
    correctAnswer: "B",
    explanation: "Mars is called the Red Planet because of the iron oxide (rust) on its surface."
  }
];

const class9Questions: Question[] = [
  {
    id: "c9q1",
    text: "What is the value of gravitational acceleration 'g' on Earth's surface?",
    options: { A: "8.8 m/s^2", B: "9.8 m/s^2", C: "10.8 m/s^2", D: "11.8 m/s^2" },
    correctAnswer: "B",
    explanation: "The standard acceleration due to gravity 'g' is approximately 9.8 m/s^2."
  },
  {
    id: "c9q2",
    text: "Who is the Father of the Nation of Bangladesh?",
    options: { A: "Tajuddin Ahmad", B: "Sher-e-Bangla AK Fazlul Huq", C: "Bangabandhu Sheikh Mujibur Rahman", D: "Mawlana Bhashani" },
    correctAnswer: "C",
    explanation: "Bangabandhu Sheikh Mujibur Rahman is recognized as the Father of the Nation of Bangladesh."
  }
];

const class10Questions: Question[] = [
  {
    id: "c10q1",
    text: "What is the value of sin(90 degrees)?",
    options: { A: "0", B: "0.5", C: "1", D: "Undefined" },
    correctAnswer: "C",
    explanation: "Sin(90°) = 1."
  },
  {
    id: "c10q2",
    text: "If x + 5 = 12, then what is the value of x^2?",
    options: { A: "49", B: "25", C: "144", D: "36" },
    correctAnswer: "A",
    explanation: "x = 12 - 5 = 7. Thus, x^2 = 7^2 = 49."
  }
];

const hscQuestions: Question[] = [
  {
    id: "hscq1",
    text: "What is the unit of electric resistance?",
    options: { A: "Ampere", B: "Volt", C: "Ohm", D: "Watt" },
    correctAnswer: "C",
    explanation: "Ohm is the SI unit of electrical resistance, named after Georg Ohm."
  },
  {
    id: "hscq2",
    text: "Which force holds protons and neutrons together in an atomic nucleus?",
    options: { A: "Gravitational force", B: "Electromagnetic force", C: "Strong nuclear force", D: "Weak nuclear force" },
    correctAnswer: "C",
    explanation: "The strong nuclear force binds protons and neutrons inside the nucleus."
  }
];

const bcsQuestions: Question[] = [
  {
    id: "bcsq1",
    text: "বঙ্গভঙ্গ কত সালে রদ করা হয়?",
    options: { A: "১৯০৫", B: "১৯১১", C: "১৯৪৭", D: "১৯৫২" },
    correctAnswer: "B",
    explanation: "১৯০৫ সালে বঙ্গভঙ্গ হওয়ার পর চরম আন্দোলনের মুখে ১৯১১ সালে লর্ড হার্ডিঞ্জ বঙ্গভঙ্গ এবং বিভক্তি ঘোষণা রদ ঘোষণা করেন।"
  },
  {
    id: "bcsq2",
    text: "মুজিবনগর সরকার কোন তারিখে শপথ গ্রহণ করে?",
    options: { A: "১০ই এপ্রিল ১৯৭১", B: "১৭ই এপ্রিল ১৯৭১", C: "১৬ই ডিসেম্বর ১৯৭১", D: "২৬শে মার্চ ১৯৭১" },
    correctAnswer: "B",
    explanation: "১০ই এপ্রিল ১৯৭১ মুজিবনগর সরকার গঠিত হয় এবং ১৭ই এপ্রিল ১৯৭১ মেহেরপুরের বৈদ্যনাথতলায় আনুষ্ঠানিকভাবে শপথ গ্রহণ করে।"
  }
];

const jobsQuestions: Question[] = [
  {
    id: "jobsq1",
    text: "What is the main memory of a computer system?",
    options: { A: "Hard Disk", B: "SSD", C: "RAM", D: "CD-ROM" },
    correctAnswer: "C",
    explanation: "RAM (Random Access Memory) is the primary volatile workspace/main memory utilized by the CPU."
  },
  {
    id: "jobsq2",
    text: "Which protocol is used to secure web communications?",
    options: { A: "HTTP", B: "HTTPS", C: "FTP", D: "SMTP" },
    correctAnswer: "B",
    explanation: "HTTPS (Hypertext Transfer Protocol Secure) encrypts communication over a computer network for secure browsing."
  }
];

function makeDefaultSubMenus(): SubMenu[] {
  return [
    { id: "sub-class6-sci", parentClass: "Class 6", en: "General Science", bn: "সাধারণ বিজ্ঞান" },
    { id: "sub-class6-math", parentClass: "Class 6", en: "Mathematics", bn: "গণিত" },
    { id: "sub-class7-geo", parentClass: "Class 7", en: "Geography", bn: "ভূগোল" },
    { id: "sub-class7-eng", parentClass: "Class 7", en: "English Grammar", bn: "ইংরেজি ব্যাকরণ" },
    { id: "sub-class8-soc", parentClass: "Class 8", en: "Social Studies", bn: "সমাজবিজ্ঞান" },
    { id: "sub-class8-ast", parentClass: "Class 8", en: "Astrophysics basics", bn: "বেসিক জ্যোতির্বিজ্ঞান" },
    { id: "sub-class9-phy", parentClass: "Class 9", en: "Physical Chemistry", bn: "ভৌত রসায়ন" },
    { id: "sub-class10-trig", parentClass: "Class 10", en: "Trigonometry", bn: "ত্রিকোণমিতি" }
  ];
}

function initializeDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      dbData = JSON.parse(raw);
      
      // Make sure approvals array exists
      if (!dbData.approvals) {
        dbData.approvals = [];
      }

      // Make sure subMenus array exists
      if (!dbData.subMenus || dbData.subMenus.length === 0) {
        dbData.subMenus = makeDefaultSubMenus();
        fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
      }

      // Make sure quizzes are not blank
      if (!dbData.quizzes || dbData.quizzes.length === 0) {
        dbData.quizzes = makeDefaultQuizzes();
        fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
      }
    } else {
      dbData = {
        users: [
          {
            id: "user1",
            name: "Default Admin",
            email: "admin@quiz.com",
            role: "admin",
            createdAt: new Date().toISOString()
          },
          {
            id: "user2",
            name: "John Student",
            email: "student@quiz.com",
            role: "user",
            createdAt: new Date().toISOString()
          }
        ],
        quizzes: makeDefaultQuizzes(),
        attempts: makeDefaultAttempts(),
        passwords: {
          "user1": "admin123",
          "user2": "student123"
        },
        approvals: [],
        subMenus: makeDefaultSubMenus()
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
    }
  } catch (err) {
    console.error("Database failure, falling back to memory:", err);
  }
}

function makeDefaultQuizzes(): Quiz[] {
  return [
    {
      id: "quiz-web-dev",
      title: "Web Development Masterclass (Full MCQ Series)",
      subject: "Computer Science",
      description: "A professional computer science assessment measuring basic HTML, CSS, JavaScript, React, Git, TypeScript, and modern responsive layout concepts with explanations.",
      questions: webDevQuestions,
      isPublished: true,
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      duration: 15
    },
    {
      id: "quiz-bangla",
      title: "বাংলা সংস্কৃতি ও সাধারণ জ্ঞান (Bangla Quiz)",
      subject: "General Knowledge",
      description: "মহান মুক্তিযুদ্ধ, ভাষা আন্দোলন, ঐতিহ্যগত কবি-সাহিত্যিক এবং ঐতিহাসিক স্থান সম্পর্কিত ২০টি অত্যন্ত গুরুত্বপূর্ণ অবজেক্টিভ প্রশ্ন।",
      questions: banglaCultureQuestions,
      isPublished: true,
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      duration: 15
    },
    {
      id: "quiz-class6",
      title: "Class 6 General Science Chapter 1-3",
      subject: "Class 6",
      subMenuId: "sub-class6-sci",
      description: "Practice questions covering living entities, skeletal structures, and nutritional building blocks.",
      questions: class6Questions,
      isPublished: true,
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      duration: 5
    },
    {
      id: "quiz-class7",
      title: "Class 7 Basic General Geography & Science",
      subject: "Class 7",
      subMenuId: "sub-class7-geo",
      description: "Core objective metrics reviewing cities, physical states of matter, and elemental chemistry.",
      questions: class7Questions,
      isPublished: true,
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      duration: 5
    },
    {
      id: "quiz-class8",
      title: "Class 8 Social Studies & Astrophysics Drill",
      subject: "Class 8",
      subMenuId: "sub-class8-ast",
      description: "Analytical review of national historic poems and celestial bodies of our solar system.",
      questions: class8Questions,
      isPublished: true,
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      duration: 5
    },
    {
      id: "quiz-class9",
      title: "Class 9 Secondary Physical Sciences",
      subject: "Class 9",
      subMenuId: "sub-class9-phy",
      description: "Standard curriculum validation covering gravitational acceleration parameters and historic biographies.",
      questions: class9Questions,
      isPublished: true,
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      duration: 10
    },
    {
      id: "quiz-class10",
      title: "Class 10 Advanced Coordinate Trigonometry",
      subject: "Class 10",
      subMenuId: "sub-class10-trig",
      description: "Core mathematical examinations analyzing sinusoidal profiles and linear equation systems.",
      questions: class10Questions,
      isPublished: true,
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      duration: 8
    },
    {
      id: "quiz-hsc",
      title: "HSC Physics & Electrical Field Mechanics",
      subject: "HSC",
      description: "Advanced college preparatory assessment evaluating electrical resistance units and nuclear binding mechanics.",
      questions: hscQuestions,
      isPublished: true,
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      duration: 12
    },
    {
      id: "quiz-bcs",
      title: "BCS Preliminary Drill: Bangladesh History",
      subject: "BCS",
      description: "Essential model test on constitutional histories, Bengali partitioning declarations, and wartime secretariats.",
      questions: bcsQuestions,
      isPublished: true,
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      duration: 10
    },
    {
      id: "quiz-jobs",
      title: "Primary Teacher & Bank Job IT Prep",
      subject: "Jobs",
      description: "Recruitment MCQ training covering main memory models, communication encryption protocols, and browser secure routing.",
      questions: jobsQuestions,
      isPublished: true,
      createdBy: "user1",
      createdAt: new Date().toISOString(),
      duration: 10
    }
  ];
}

function makeDefaultAttempts(): QuizAttempt[] {
  return [
    {
      id: "att_webdev_1",
      userId: "user2",
      userName: "John Student",
      userEmail: "student@quiz.com",
      quizId: "quiz-web-dev",
      quizTitle: "Web Development Masterclass (Full MCQ Series)",
      subject: "Computer Science",
      score: 80,
      correctCount: 16,
      wrongCount: 4,
      totalQuestions: 20,
      answers: {
        "wdq1": "A", "wdq2": "C", "wdq3": "A", "wdq4": "C", "wdq5": "B"
      },
      isPassed: true,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      timeSpentSeconds: 480
    },
    {
      id: "att_webdev_2",
      userId: "user_samia",
      userName: "Samia Rahman",
      userEmail: "samia@school.com",
      quizId: "quiz-web-dev",
      quizTitle: "Web Development Masterclass (Full MCQ Series)",
      subject: "Computer Science",
      score: 95,
      correctCount: 19,
      wrongCount: 1,
      totalQuestions: 20,
      answers: {},
      isPassed: true,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      timeSpentSeconds: 390
    },
    {
      id: "att_webdev_3",
      userId: "user_faria",
      userName: "Faria Alam",
      userEmail: "faria@school.com",
      quizId: "quiz-web-dev",
      quizTitle: "Web Development Masterclass (Full MCQ Series)",
      subject: "Computer Science",
      score: 60,
      correctCount: 12,
      wrongCount: 8,
      totalQuestions: 20,
      answers: {},
      isPassed: true,
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      timeSpentSeconds: 520
    },
    {
      id: "att_c6_1",
      userId: "user2",
      userName: "John Student",
      userEmail: "student@quiz.com",
      quizId: "quiz-class6",
      quizTitle: "Class 6 General Science Chapter 1-3",
      subject: "Class 6",
      score: 100,
      correctCount: 2,
      wrongCount: 0,
      totalQuestions: 2,
      answers: { "c6q1": "C", "c6q2": "B" },
      isPassed: true,
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      timeSpentSeconds: 120
    },
    {
      id: "att_c6_2",
      userId: "user_rafsan",
      userName: "Rafsan Chowdhury",
      userEmail: "rafsan@school.com",
      quizId: "quiz-class6",
      quizTitle: "Class 6 General Science Chapter 1-3",
      subject: "Class 6",
      score: 50,
      correctCount: 1,
      wrongCount: 1,
      totalQuestions: 2,
      answers: { "c6q1": "C", "c6q2": "A" },
      isPassed: true,
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      timeSpentSeconds: 140
    },
    {
      id: "att_bcs_1",
      userId: "user_samia",
      userName: "Samia Rahman",
      userEmail: "samia@school.com",
      quizId: "quiz-bcs",
      quizTitle: "BCS Preliminary Drill: Bangladesh History",
      subject: "BCS",
      score: 100,
      correctCount: 2,
      wrongCount: 0,
      totalQuestions: 2,
      answers: { "bcsq1": "B", "bcsq2": "B" },
      isPassed: true,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      timeSpentSeconds: 220
    },
    {
      id: "att_bcs_2",
      userId: "user_faria",
      userName: "Faria Alam",
      userEmail: "faria@school.com",
      quizId: "quiz-bcs",
      quizTitle: "BCS Preliminary Drill: Bangladesh History",
      subject: "BCS",
      score: 50,
      correctCount: 1,
      wrongCount: 1,
      totalQuestions: 2,
      answers: { "bcsq1": "A", "bcsq2": "B" },
      isPassed: true,
      createdAt: new Date(Date.now() - 3600000 * 15).toISOString(),
      timeSpentSeconds: 280
    }
  ];
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
  } catch (err) {
    console.error("Failed to save db file:", err);
  }
}

// Prepare baseline data
initializeDatabase();

// ---------------- API ENDPOINTS ----------------

// --- OTP Authentication state and helpers ---
interface OtpRequest {
  otp: string;
  expiresAt: number;
  userData: any;
}
const registerOtpRequests = new Map<string, OtpRequest>();
const loginOtpRequests = new Map<string, OtpRequest>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

async function sendOtpEmail(email: string, otp: string, purpose: 'register' | 'login'): Promise<{ emailSent: boolean; error?: string }> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn(`[OTP System] SMTP_USER or SMTP_PASS not set. Cannot send real email to ${email}. Logging OTP: ${otp}`);
    return { emailSent: false, error: 'SMTP credentials missing. Please configure SMTP_USER & SMTP_PASS in secrets for real email dispatch.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const subject = purpose === 'register' 
      ? '[EXAMHALL] Verify your sign-up OTP code' 
      : '[EXAMHALL] One-Time Password (OTP) for Login';

    const text = `Hello,

Your One-Time Password (OTP) code is: ${otp}

This code is valid for 5 minutes.

Best regards,
The EXAMHALL Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">EXAMHALL</h2>
          <p style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold; margin-top: 5px;">Secure Online Assessment Portal</p>
        </div>
        <p>Hello,</p>
        <p>To finalize your ${purpose === 'register' ? 'account registration' : 'login session'}, please submit the following security One-Time Password (OTP) code. This code is active for 5 minutes:</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 28px; font-weight: bold; text-align: center; padding: 15px; margin: 20px 0; letter-spacing: 5px; font-family: monospace; color: #1e1b4b;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 11px;">If you were not the sender of this request, please completely ignore this notice.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"EXAMHALL" <${user}>`,
      to: email,
      subject,
      text,
      html
    });

    return { emailSent: true };
  } catch (error: any) {
    console.error(`[OTP System] SMTP transmission failure for ${email}:`, error);
    return { emailSent: false, error: error.message || 'SMTP delivery failing.' };
  }
}

// Request Sign-Up OTP
app.post('/api/auth/register-request', async (req, res) => {
  const { name, email, password, role, devPermitKey } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required registration inputs." });
  }
  const existingUser = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "A user with this email already exists." });
  }

  const normalizedRole = role === 'admin' ? 'admin' : 'user';
  if (normalizedRole === 'admin') {
    const permitCode = process.env.ADMIN_REGISTRATION_CODE || "devpermit123";
    if (devPermitKey !== permitCode) {
      return res.status(400).json({ error: "Invalid developer permit key. Registration as Admin is blocked." });
    }
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
  registerOtpRequests.set(email.toLowerCase(), {
    otp,
    expiresAt,
    userData: { name, email, password, role: normalizedRole }
  });

  const emailResult = await sendOtpEmail(email, otp, 'register');
  return res.json({
    success: true,
    otpRequired: true,
    emailSent: emailResult.emailSent,
    devOtp: emailResult.emailSent ? undefined : otp,
    error: emailResult.error
  });
});

// Verify Sign-Up OTP
app.post('/api/auth/register-verify', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP code are required parameters." });
  }

  const reqEmail = email.toLowerCase();
  const pending = registerOtpRequests.get(reqEmail);
  if (!pending) {
    return res.status(400).json({ error: "No pending sign-up request found for this email. Please request a new OTP." });
  }

  if (Date.now() > pending.expiresAt) {
    registerOtpRequests.delete(reqEmail);
    return res.status(400).json({ error: "The verification code has expired. Please request a new OTP." });
  }

  if (pending.otp !== otp) {
    return res.status(400).json({ error: "Incorrect security OTP code. Please try again." });
  }

  const { name, password, role } = pending.userData;
  const existingUser = dbData.users.find(u => u.email.toLowerCase() === reqEmail);
  if (existingUser) {
    registerOtpRequests.delete(reqEmail);
    return res.status(400).json({ error: "This email has been registered during your wait. Please log in directly." });
  }

  const newUser: User = {
    id: "user_" + Math.random().toString(36).substr(2, 9),
    name,
    email: pending.userData.email,
    role,
    createdAt: new Date().toISOString()
  };

  dbData.users.push(newUser);
  dbData.passwords[newUser.id] = password;
  saveDb();

  registerOtpRequests.delete(reqEmail);
  res.json({ success: true, user: newUser });
});

// Request Login OTP
app.post('/api/auth/login-request', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Credentials input missing." });
  }

  const reqEmail = email.toLowerCase();
  const user = dbData.users.find(u => u.email.toLowerCase() === reqEmail);
  if (!user) {
    return res.status(401).json({ error: "No user found with this email." });
  }

  const realPassword = dbData.passwords[user.id];
  if (realPassword !== password) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
  loginOtpRequests.set(reqEmail, {
    otp,
    expiresAt,
    userData: { userId: user.id }
  });

  const emailResult = await sendOtpEmail(user.email, otp, 'login');
  return res.json({
    success: true,
    otpRequired: true,
    emailSent: emailResult.emailSent,
    devOtp: emailResult.emailSent ? undefined : otp,
    error: emailResult.error
  });
});

// Verify Login OTP
app.post('/api/auth/login-verify', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP code are required parameters." });
  }

  const reqEmail = email.toLowerCase();
  const pending = loginOtpRequests.get(reqEmail);
  if (!pending) {
    return res.status(400).json({ error: "No pending login verification found for this email. Please attempt login again." });
  }

  if (Date.now() > pending.expiresAt) {
    loginOtpRequests.delete(reqEmail);
    return res.status(400).json({ error: "The verification code has expired. Please attempt login again." });
  }

  if (pending.otp !== otp) {
    return res.status(400).json({ error: "Incorrect security OTP code. Please try again." });
  }

  const user = dbData.users.find(u => u.id === pending.userData.userId);
  if (!user) {
    loginOtpRequests.delete(reqEmail);
    return res.status(401).json({ error: "Assigned user account could not be found." });
  }

  loginOtpRequests.delete(reqEmail);
  res.json({ success: true, user });
});

// Authorization Helper / Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, devPermitKey } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required registration inputs." });
  }

  const existingUser = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "A user with this email already exists." });
  }

  const normalizedRole = role === 'admin' ? 'admin' : 'user';

  if (normalizedRole === 'admin') {
    const permitCode = process.env.ADMIN_REGISTRATION_CODE || "devpermit123";
    if (devPermitKey !== permitCode) {
      return res.status(400).json({ error: "Invalid developer permit key. Registration as Admin is blocked." });
    }
  }

  const newUser: User = {
    id: "user_" + Math.random().toString(36).substr(2, 9),
    name,
    email,
    role: normalizedRole,
    createdAt: new Date().toISOString()
  };

  dbData.users.push(newUser);
  dbData.passwords[newUser.id] = password;
  saveDb();

  res.json({ user: newUser });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Credentials input missing." });
  }

  const user = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "No user found with this email." });
  }

  const realPassword = dbData.passwords[user.id];
  if (realPassword !== password) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  res.json({ user });
});

// Forgot Password
app.post('/api/auth/forgot-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email input missing." });
  }

  const user = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "No registered account matches this email." });
  }

  if (newPassword) {
    dbData.passwords[user.id] = newPassword;
    saveDb();
    return res.json({ success: true, message: "Password updated successfully!" });
  }

  res.json({ success: true, message: "Verification link dispatched.", simulation: true });
});

// Update profile / Switch Role for Testing!
app.post('/api/auth/update-profile', (req, res) => {
  const { userId, name, role } = req.body;
  const userIndex = dbData.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User profile not found." });
  }

  if (name) dbData.users[userIndex].name = name;
  if (role) dbData.users[userIndex].role = role === 'admin' ? 'admin' : 'user';

  saveDb();
  res.json({ user: dbData.users[userIndex] });
});

// Get all users (Developer Admin / Dev Admin / General Roles panel)
app.get('/api/users', (req, res) => {
  const sanitizedUsers = dbData.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt
  }));
  res.json(sanitizedUsers);
});

// Change user roles (Promote/Demote role)
app.post('/api/users/:id/role', (req, res) => {
  const { role } = req.body;
  const user = dbData.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  user.role = role === 'admin' ? 'admin' : 'user';
  saveDb();
  res.json({ success: true, user });
});

// Get Quizzes
app.get('/api/quizzes', (req, res) => {
  const isRequestingAdmin = req.query.admin === 'true';
  const querySubject = req.query.subject as string;
  const searchTerm = req.query.search as string;

  let list = dbData.quizzes;

  if (!isRequestingAdmin) {
    list = list.filter(q => q.isPublished);
  }

  if (querySubject && querySubject !== 'All') {
    list = list.filter(q => q.subject.toLowerCase() === querySubject.toLowerCase());
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    list = list.filter(q => 
      q.title.toLowerCase().includes(term) || 
      q.description.toLowerCase().includes(term) ||
      q.subject.toLowerCase().includes(term)
    );
  }

  res.json(list);
});

// Get Single Quiz
app.get('/api/quizzes/:id', (req, res) => {
  const quiz = dbData.quizzes.find(q => q.id === req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: "Quiz not found." });
  }
  res.json(quiz);
});

// Save / Create Quiz Manual
app.post('/api/quizzes', (req, res) => {
  const { title, subject, description, questions, duration, isPublished, createdBy, subMenuId } = req.body;
  if (!title || !subject || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Invalid quiz model data structure." });
  }

  const newQuiz: Quiz = {
    id: "quiz_" + Math.random().toString(36).substr(2, 9),
    title,
    subject,
    description: description || "",
    questions: questions.map((q: any, idx: number) => ({
      id: q.id || `q_${idx}_${Date.now()}`,
      text: q.text,
      options: q.options || { A: "", B: "", C: "", D: "" },
      correctAnswer: q.correctAnswer || "A",
      explanation: q.explanation || ""
    })),
    duration: isNaN(Number(duration)) ? 15 : Number(duration),
    isPublished: isPublished ?? true,
    createdBy: createdBy || 'system',
    createdAt: new Date().toISOString(),
    subMenuId: subMenuId || undefined
  };

  dbData.quizzes.push(newQuiz);
  saveDb();
  res.json(newQuiz);
});

// Edit Quiz Manual
app.put('/api/quizzes/:id', (req, res) => {
  const { title, subject, description, questions, duration, isPublished, subMenuId } = req.body;
  const requestUserId = req.headers['x-user-id'] || req.get('x-user-id');
  const requestingUser = dbData.users.find(u => u.id === requestUserId);
  const isDevAdmin = requestingUser && (requestingUser.email === 'admin@quiz.com' || (requestingUser.role as string) === 'dev_admin');

  const quizIndex = dbData.quizzes.findIndex(q => q.id === req.params.id);
  if (quizIndex === -1) {
    return res.status(404).json({ error: "Quiz not found." });
  }

  const existingQuiz = dbData.quizzes[quizIndex];
  
  // Enforce quiz ownership constraint for non-dev admins
  if (!isDevAdmin) {
    const isOwner = !existingQuiz.createdBy || existingQuiz.createdBy === 'system' || existingQuiz.createdBy === requestUserId;
    if (!isOwner) {
      return res.status(403).json({ error: "Access Denied: You cannot modify another administrator's quiz." });
    }
  }
  
  if (title) existingQuiz.title = title;
  if (subject) existingQuiz.subject = subject;
  if (description !== undefined) existingQuiz.description = description;
  if (questions && Array.isArray(questions)) {
    existingQuiz.questions = questions.map((q: any, idx: number) => ({
      id: q.id || existingQuiz.questions[idx]?.id || `q_${idx}_${Date.now()}`,
      text: q.text,
      options: q.options || { A: "", B: "", C: "", D: "" },
      correctAnswer: q.correctAnswer || "A",
      explanation: q.explanation || ""
    }));
  }
  if (duration !== undefined) existingQuiz.duration = isNaN(Number(duration)) ? 15 : Number(duration);
  if (isPublished !== undefined) existingQuiz.isPublished = isPublished;
  
  // Set subMenuId (might be empty or explicitly unlinked)
  existingQuiz.subMenuId = subMenuId || undefined;

  saveDb();
  res.json(existingQuiz);
});

// Delete Quiz
app.delete('/api/quizzes/:id', (req, res) => {
  const requestUserId = req.headers['x-user-id'] || req.get('x-user-id');
  const requestingUser = dbData.users.find(u => u.id === requestUserId);
  const isDevAdmin = requestingUser && (requestingUser.email === 'admin@quiz.com' || (requestingUser.role as string) === 'dev_admin');

  const quizIndex = dbData.quizzes.findIndex(q => q.id === req.params.id);
  if (quizIndex === -1) {
    return res.status(404).json({ error: "Quiz not found" });
  }
  
  const existingQuiz = dbData.quizzes[quizIndex];

  // Enforce quiz ownership constraint for non-dev admins
  if (!isDevAdmin) {
    const isOwner = !existingQuiz.createdBy || existingQuiz.createdBy === 'system' || existingQuiz.createdBy === requestUserId;
    if (!isOwner) {
      return res.status(403).json({ error: "Access Denied: You cannot delete another administrator's quiz." });
    }
  }

  dbData.quizzes.splice(quizIndex, 1);
  saveDb();
  res.json({ success: true });
});

// Import Quiz Questions Parsing Simulation
app.post('/api/quizzes/import-parse', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "CSV text input is required." });
  }

  // Parse custom CSV formats
  try {
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    const parsedQuestions: Question[] = [];

    // Skip header if matches text like "Question" or "text"
    let startIdx = 0;
    if (lines[0] && (lines[0].toLowerCase().includes('question') || lines[0].toLowerCase().includes('text'))) {
      startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      
      // Basic split with CSV escaping handling
      // We'll support standard comma-split or quote-aware split
      let parts: string[] = [];
      let insideQuotes = false;
      let currentPart = '';

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          parts.push(currentPart.trim());
          currentPart = '';
        } else {
          currentPart += char;
        }
      }
      parts.push(currentPart.trim());

      // If comma parsing yields fewer parts, try semicolon split
      if (parts.length < 6) {
        parts = line.split(';').map((s: string) => s.trim());
      }

      const qText = parts[0];
      const optA = parts[1] || "";
      const optB = parts[2] || "";
      const optC = parts[3] || "";
      const optD = parts[4] || "";
      
      // Clean correct answer format
      let corr = (parts[5] || "A").toUpperCase().trim();
      if (corr.startsWith('A') || corr === '1') corr = 'A';
      else if (corr.startsWith('B') || corr === '2') corr = 'B';
      else if (corr.startsWith('C') || corr === '3') corr = 'C';
      else if (corr.startsWith('D') || corr === '4') corr = 'D';
      else corr = 'A';

      const exp = parts[6] || "";

      if (qText) {
        parsedQuestions.push({
          id: "imported_" + Math.random().toString(36).substr(2, 9),
          text: qText.replace(/^"|"$/g, ''),
          options: {
            A: optA.replace(/^"|"$/g, '') || "Option A",
            B: optB.replace(/^"|"$/g, '') || "Option B",
            C: optC.replace(/^"|"$/g, '') || "Option C",
            D: optD.replace(/^"|"$/g, '') || "Option D"
          },
          correctAnswer: corr as 'A' | 'B' | 'C' | 'D',
          explanation: exp.replace(/^"|"$/g, '')
        });
      }
    }

    res.json({ questions: parsedQuestions });
  } catch (err: any) {
    res.status(400).json({ error: "Failed to parse CSV standard file pattern: " + err.message });
  }
});

// Helper functions for Gemini operations
let aiInstance: GoogleGenAI | null = null;
function getAIInstance() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Please configure it in your Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiInstance;
}

function cleanBase64(base64Str: string): string {
  if (base64Str.includes(';base64,')) {
    return base64Str.split(';base64,')[1];
  }
  return base64Str;
}

// AI Question Auto-generation endpoint
app.post('/api/quizzes/ai-generate', async (req, res) => {
  const { command, image, imageMimeType } = req.body;
  if (!command && !image) {
    return res.status(400).json({ error: "Either a prompt command or an image is required to generate questions." });
  }

  try {
    const ai = getAIInstance();
    const contents: any[] = [];
    
    if (image) {
      contents.push({
        inlineData: {
          mimeType: imageMimeType || 'image/jpeg',
          data: cleanBase64(image)
        }
      });
    }

    contents.push({
      text: `Create educational multiple-choice quiz questions based on this instruction/image:
Instruction/Command: ${command || "Generate high quality questions from the provided image details."}

Requirements:
1. Formulate clear, grade-appropriate multiple-choice questions.
2. Provide exactly four options (A, B, C, D).
3. Specify the correctAnswer exactly as one of 'A', 'B', 'C', or 'D'.
4. Include a detailed, educational 'explanation' for each question.
5. Support any language requested by the instruction (e.g. English or Bangla). If not specified, match the input language of the user instruction or default to English.
`
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              description: "Array of generated high-quality multiple choice questions.",
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "The content/stem of the question." },
                  options: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING, description: "Option A" },
                      B: { type: Type.STRING, description: "Option B" },
                      C: { type: Type.STRING, description: "Option C" },
                      D: { type: Type.STRING, description: "Option D" },
                    },
                    required: ["A", "B", "C", "D"]
                  },
                  correctAnswer: { type: Type.STRING, description: "Correct option identifier. Must be 'A', 'B', 'C', or 'D'." },
                  explanation: { type: Type.STRING, description: "Explanation of why the option is correct." }
                },
                required: ["text", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("No response content generated from Gemini.");
    }

    const parsedJson = JSON.parse(textResult.trim());
    if (!parsedJson.questions || !Array.isArray(parsedJson.questions)) {
      throw new Error("Gemini response is not in the correct JSON schema format.");
    }

    // Add unique IDs to the generated questions
    const finalQuestions = parsedJson.questions.map((q: any) => ({
      id: "ai_" + Math.random().toString(36).substr(2, 9),
      text: q.text,
      options: {
        A: q.options?.A || "Option A",
        B: q.options?.B || "Option B",
        C: q.options?.C || "Option C",
        D: q.options?.D || "Option D",
      },
      correctAnswer: (q.correctAnswer || 'A').toUpperCase().trim() as 'A' | 'B' | 'C' | 'D',
      explanation: q.explanation || ""
    }));

    res.json({ questions: finalQuestions });
  } catch (error: any) {
    console.error("[AI Generate Endpoint Error]:", error);
    res.status(500).json({ error: error.message || "An error occurred during AI auto-generation." });
  }
});

// Submit Quiz Answer & Evaluate Score
app.post('/api/quizzes/:id/submit', (req, res) => {
  const quiz = dbData.quizzes.find(q => q.id === req.params.id);
  if (!quiz) {
    return res.status(404).json({ error: "Target Quiz not found" });
  }

  const { userId, answers, timeSpentSeconds, userName, userEmail } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User identity required to record attempt." });
  }

  let correctCount = 0;
  let wrongCount = 0;
  const totalQuestions = quiz.questions.length;

  quiz.questions.forEach((q) => {
    const userAns = answers[q.id];
    if (userAns === q.correctAnswer) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const isPassed = percentage >= 50; // Pass threshold 50%

  const newAttempt: QuizAttempt = {
    id: "att_" + Math.random().toString(36).substr(2, 9),
    userId,
    userName: userName || "Unknown User",
    userEmail: userEmail || "",
    quizId: quiz.id,
    quizTitle: quiz.title,
    subject: quiz.subject,
    score: percentage,
    correctCount,
    wrongCount,
    totalQuestions,
    answers,
    isPassed,
    createdAt: new Date().toISOString(),
    timeSpentSeconds: timeSpentSeconds || 0
  };

  dbData.attempts.push(newAttempt);

  // Consume any active approved retake request for this user and quiz
  if (dbData.approvals) {
    const activeApproval = dbData.approvals.find(
      appv => appv.userId === userId && appv.quizId === quiz.id && appv.status === 'approved'
    );
    if (activeApproval) {
      activeApproval.status = 'used';
      activeApproval.resolvedAt = new Date().toISOString();
    }
  }

  saveDb();

  res.json(newAttempt);
});

// ==========================================
// QUIZ PARTICIPATION APPROVALS API endpoints
// ==========================================

// Get All Approval Requests (For Admin)
app.get('/api/approvals', (req, res) => {
  const list = dbData.approvals || [];
  // Sort latest requests first
  const sorted = [...list].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  res.json(sorted);
});

// Get Approval Requests for a User
app.get('/api/approvals/user/:userId', (req, res) => {
  const list = dbData.approvals || [];
  const filtered = list.filter(a => a.userId === req.params.userId);
  res.json(filtered);
});

// Create a re-participation approval request
app.post('/api/approvals/request', (req, res) => {
  const { userId, userName, userEmail, quizId, quizTitle } = req.body;
  if (!userId || !quizId) {
    return res.status(400).json({ error: "Missing userId or quizId for approval request." });
  }

  if (!dbData.approvals) {
    dbData.approvals = [];
  }

  // Check if there is already a pending approval for this user/quiz
  const existingPending = dbData.approvals.find(
    a => a.userId === userId && a.quizId === quizId && a.status === 'pending'
  );
  if (existingPending) {
    return res.json(existingPending); // Return existing instead of duplicate
  }

  // Check if there is already an approved but unused bypass for this user/quiz
  const existingApproved = dbData.approvals.find(
    a => a.userId === userId && a.quizId === quizId && a.status === 'approved'
  );
  if (existingApproved) {
    return res.json(existingApproved);
  }

  const newApproval: QuizApproval = {
    id: "appv_" + Math.random().toString(36).substr(2, 9),
    userId,
    userName: userName || "Unknown User",
    userEmail: userEmail || "",
    quizId,
    quizTitle: quizTitle || "Unnamed Quiz",
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  dbData.approvals.push(newApproval);
  saveDb();

  res.json(newApproval);
});

// Resolve an approval request (Approve/Reject)
app.post('/api/approvals/:id/resolve', (req, res) => {
  const { status } = req.body;
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: "Invalid status option. Must be 'approved' or 'rejected'." });
  }

  if (!dbData.approvals) {
    dbData.approvals = [];
  }

  const approval = dbData.approvals.find(a => a.id === req.params.id);
  if (!approval) {
    return res.status(404).json({ error: "Target approval request not found." });
  }

  approval.status = status;
  approval.resolvedAt = new Date().toISOString();
  saveDb();

  res.json(approval);
});

// ==========================================
// SUB-MENUS API endpoints
// ==========================================

// Get All Sub-menus
app.get('/api/submenus', (req, res) => {
  const list = dbData.subMenus || [];
  res.json(list);
});

// Admin Add Sub-menu
app.post('/api/submenus', (req, res) => {
  const { parentClass, en, bn } = req.body;
  if (!parentClass || !en || !bn) {
    return res.status(400).json({ error: "Missing parentClass, en, or bn translation." });
  }

  if (!dbData.subMenus) {
    dbData.subMenus = [];
  }

  const newSubMenu: SubMenu = {
    id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    parentClass,
    en: en.trim(),
    bn: bn.trim()
  };

  dbData.subMenus.push(newSubMenu);
  saveDb();
  res.json(newSubMenu);
});

// Admin Delete Sub-menu
app.delete('/api/submenus/:id', (req, res) => {
  if (!dbData.subMenus) {
    dbData.subMenus = [];
  }
  const id = req.params.id;
  dbData.subMenus = dbData.subMenus.filter(sm => sm.id !== id);

  // Unlink subMenuId from quizzes that belonged to it
  if (dbData.quizzes) {
    dbData.quizzes.forEach(q => {
      if (q.subMenuId === id) {
        delete q.subMenuId;
      }
    });
  }

  saveDb();
  res.json({ success: true, message: "Sub-menu deleted." });
});

// Admin Reorder Sub-menus
app.post('/api/submenus/reorder', (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: "Missing or invalid ids array in request body." });
  }

  if (!dbData.subMenus) {
    dbData.subMenus = [];
  }

  const reordered: SubMenu[] = [];
  const remaining = [...dbData.subMenus];

  for (const id of ids) {
    const idx = remaining.findIndex(sm => sm.id === id);
    if (idx !== -1) {
      reordered.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }

  dbData.subMenus = [...reordered, ...remaining];
  saveDb();
  res.json({ success: true, subMenus: dbData.subMenus });
});

// Get User Attempt History
app.get('/api/attempts/user/:userId', (req, res) => {
  const attempts = dbData.attempts
    .filter(a => a.userId === req.params.userId)
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(attempts);
});

// Get All Student Attempts for a Quiz (Result Sheet)
app.get('/api/attempts/quiz/:quizId', (req, res) => {
  const attempts = dbData.attempts
    .filter(a => a.quizId === req.params.quizId)
    .sort((a,b) => b.score - a.score || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  res.json(attempts);
});

// Get Leaderboard Data
app.get('/api/leaderboard', (req, res) => {
  // Aggregate stats per user
  const userStats: Record<string, {
    userId: string;
    userName: string;
    userEmail: string;
    quizzesTaken: number;
    totalScoresSum: number;
    totalCorrect: number;
  }> = {};

  dbData.attempts.forEach((att) => {
    if (!userStats[att.userId]) {
      userStats[att.userId] = {
        userId: att.userId,
        userName: att.userName,
        userEmail: att.userEmail,
        quizzesTaken: 0,
        totalScoresSum: 0,
        totalCorrect: 0
      };
    }
    const stat = userStats[att.userId];
    stat.quizzesTaken += 1;
    stat.totalScoresSum += att.score;
    stat.totalCorrect += att.correctCount;
  });

  const list: LeaderboardEntry[] = Object.values(userStats).map((s) => ({
    userId: s.userId,
    userName: s.userName,
    userEmail: s.userEmail,
    quizzesTaken: s.quizzesTaken,
    averageScore: Math.round(s.totalScoresSum / s.quizzesTaken),
    totalCorrectAnswers: s.totalCorrect
  })).sort((a,b) => b.averageScore - a.averageScore || b.totalCorrectAnswers - a.totalCorrectAnswers);

  res.json(list);
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const totalUsers = dbData.users.length;
  const totalQuizzes = dbData.quizzes.length;
  const totalAttempts = dbData.attempts.length;
  
  // Average Score across all attempts
  const allAttempts = dbData.attempts;
  const averageScore = allAttempts.length > 0 
    ? Math.round(allAttempts.reduce((acc, a) => acc + a.score, 0) / allAttempts.length) 
    : 0;

  // Breakdown of performance ranges (for charts)
  const scoreRanges = {
    excellent: allAttempts.filter(a => a.score >= 85).length, // 85-100
    good: allAttempts.filter(a => a.score >= 70 && a.score < 85).length, // 70-84
    average: allAttempts.filter(a => a.score >= 50 && a.score < 70).length, // 50-69
    failed: allAttempts.filter(a => a.score < 50).length // <50
  };

  // Breakdown by subject
  const subjectDistribution: Record<string, { attempts: number, totalScore: number, avgScore: number }> = {};
  allAttempts.forEach(att => {
    const sub = att.subject || "General";
    if (!subjectDistribution[sub]) {
      subjectDistribution[sub] = { attempts: 0, totalScore: 0, avgScore: 0 };
    }
    subjectDistribution[sub].attempts += 1;
    subjectDistribution[sub].totalScore += att.score;
  });

  Object.keys(subjectDistribution).forEach(sub => {
    const item = subjectDistribution[sub];
    item.avgScore = Math.round(item.totalScore / item.attempts);
  });

  res.json({
    totalUsers,
    totalQuizzes,
    totalAttempts,
    averageScore,
    scoreRanges,
    subjectDistribution
  });
});

// ---------------- VITE MIDDLEWARE SETUP ----------------

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Educational Quiz Server booting on port ${PORT}`);
  });
}

start();
