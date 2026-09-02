# Ishara Project Structure

Directory layout of the Ishara repository. For what each piece does functionally, see the [README](../README.md); for the full request/matching pipeline, see [PipelineProcess.md](PipelineProcess.md).

## Root Level

```
ishara/
├── .git/                    # Git repository
├── .gitignore               # Git ignore rules
├── client/                  # Frontend React/TypeScript application
├── docker-compose.yml       # Docker Compose configuration for containerization
├── docs/                    # Project documentation
├── LICENSE                  # Project license
├── package.json             # Root package.json (workspace root)
├── README.md                # Project README
└── server/                  # Backend Node.js/TypeScript server
```

---

## Client Directory (`client/`)

```
client/
├── index.html               # Entry HTML file
├── package.json             # Client dependencies
├── tsconfig.app.json        # TypeScript config for app code
├── tsconfig.json            # Main TypeScript config
├── tsconfig.node.json       # TypeScript config for Node scripts
├── vite.config.ts           # Vite build configuration
│
├── public/                  # Static assets
│   └── mediapipe/           # MediaPipe models and WASM files
│       ├── models/          # Pre-trained models
│       │   ├── face_landmarker.task      # Face detection model
│       │   ├── hand_landmarker.task      # Hand detection model
│       │   └── pose_landmarker_lite.task # Pose detection model (lite version)
│       └── wasm/            # WebAssembly modules
│           ├── vision_wasm_internal.js
│           ├── vision_wasm_module_internal.js
│           └── vision_wasm_nosimd_internal.js
│
└── src/                     # Source code
    ├── App.tsx              # Root App component
    ├── index.css            # Global styles
    ├── main.tsx             # Application entry point
    │
    ├── components/          # React components
    │   ├── Footer.tsx        # Footer component
    │   ├── Header.tsx        # Header/Navigation component
    │   │
    │   ├── video/           # Video processing components
    │   │   ├── SignRecorder.tsx  # Sign recording functionality
    │   │   ├── Translate.tsx     # One-shot translation UI — not currently routed in App.tsx (disabled)
    │   │   └── Video.tsx         # Video capture component
    │   │
    │   └── vision/          # Computer vision engine and utilities
    │       ├── types.ts              # Vision-related TypeScript types
    │       ├── VisionEngine.ts       # Main vision processing engine
    │       ├── VisionFileset.ts      # Vision fileset management
    │       │
    │       ├── drawing/              # Canvas drawing utilities
    │       │   └── DrawingLayer.ts   # Drawing layer for visualization
    │       │
    │       ├── landmarkers/          # MediaPipe landmarkers
    │       │   ├── FaceLandmarker.ts  # Face landmarks detection
    │       │   ├── HandLandmarker.ts  # Hand landmarks detection
    │       │   └── PoseLandmarker.ts  # Pose landmarks detection
    │       │
    │       ├── processing/           # Landmark data processing
    │       │   ├── faceLandmarkSubset.ts  # Face landmark filtering/subsetting
    │       │   └── landmarkFilters.ts    # General landmark filtering utilities
    │       │
    │       ├── recording/            # Frame recording
    │       │   └── FrameRecorder.ts  # Records and processes video frames
    │       │
    │       └── tracking/             # Hand tracking
    │           └── HandTracker.ts    # Hand position/movement tracking
    │
    ├── constants/           # Application constants
    │   └── dialects.ts      # Supported sign language dialects
    │
    ├── context/             # React Context for state management
    │   └── AuthContext.tsx  # Authentication context
    │
    ├── layout/              # Layout components
    │   └── Layout.tsx       # Main layout wrapper
    │
    ├── pages/               # Page components (routes)
    │   ├── About.tsx            # About page
    │   ├── Contact.tsx          # Contact page
    │   ├── Dictionary.tsx       # Sign language dictionary page
    │   ├── Home.tsx             # Home/landing page
    │   ├── LiveTranslation.tsx  # Live (WebSocket) translation page — the current, active translation UI
    │   ├── Login.tsx            # Login page
    │   └── Register.tsx         # Registration page
    │
    ├── types/               # TypeScript type definitions
    │   ├── auth.types.ts    # Authentication-related types
    │   └── index.ts         # Type exports
    │
    └── utils/               # Utility functions
        └── api.ts           # API client/request utilities
```

---

## Server Directory (`server/`)

```
server/
├── drizzle.config.ts        # Drizzle ORM configuration
├── package.json             # Server dependencies
├── tsconfig.json            # TypeScript configuration
├── .env.example              # Example environment variables
│
└── src/                     # Source code
    ├── index.ts             # Application entry point: Express + Socket.IO setup
    │
    ├── controllers/         # Request handlers (business logic)
    │   ├── adminController.ts       # Admin operations
    │   ├── authController.ts        # Authentication logic
    │   ├── dictionaryController.ts  # Dictionary operations
    │   └── translateController.ts   # Translation service logic
    │
    ├── db/                  # Database layer
    │   ├── db.ts            # Database connection setup
    │   ├── schema.ts        # Database schema definitions (Drizzle)
    |   ├── db.types.ts      # Type definitions for database entities
    │   └── migrations/      # Database migrations
    │
    ├── middleware/          # Express middleware
    │   ├── auth.ts          # Authentication middleware (JWT verification)
    │   └── validate.ts      # Request validation middleware
    │
    ├── routes/              # API route definitions
    │   ├── adminRouter.ts        # Admin endpoints
    │   ├── authRouter.ts         # Authentication endpoints (login, register, etc.)
    │   ├── dictionaryRoutes.ts   # Dictionary lookup/management endpoints
    │   └── translateRouter.ts    # Translation endpoints
    │
    ├── services/            # Business logic services
    │   ├── translateService.ts       # One-shot translation: normalization + DTW/KNN
    │   ├── liveTranslateService.ts   # Live WebSocket session lifecycle: hold coordination, event emission
    │   ├── signTrie.ts               # Builds the hold-indexed trie and matches against it
    │   └── vision/                   # Server-side landmark processing for live translation
    │       ├── holdDetector.ts       # Detects stillness/hold events
    │       ├── poseVector.ts         # Converts a frame into a normalized pose vector
    │       ├── dtwMatcher.ts         # DTW with Sakoe-Chiba banding (live fallback matcher)
    │       └── frameDistance.ts      # Euclidean distance between frame vectors
    │
    ├── utils/               # Utility functions
    │   └── jwt.ts           # JWT token generation/verification utilities
    │
    └── validation/          # Request validation schemas
        ├── authSchema.ts        # Authentication request validation
        ├── recordSignSchema.ts  # Sign recording validation
        └── translateSchema.ts   # Translation request validation
```

---

## Docs Directory (`docs/`)

```
docs/
├── ProjectStructure.md      # This file - repository layout
└── PipelineProcess.md       # Capture, matching, and storage pipeline in detail
```

---

## Entry points

- Client: `client/src/main.tsx`
- Server: `server/src/index.ts`
