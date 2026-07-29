# Ishara

<p align="center">
  <b>Arabic Sign Language Recognition & Translation Platform</b>
</p>

<p align="center">
A full-stack platform for capturing, storing, and translating Arabic sign language gestures using browser-based hand tracking and gesture recognition algorithms.
</p>

---

## 🌍 Overview

Ishara is an accessibility-focused platform designed to help bridge communication gaps by providing a foundation for Arabic sign language recognition.

The project focuses on building a scalable system for:

- Collecting Arabic sign language gesture data.
- Storing structured gesture samples.
- Translating hand movements into Arabic text.
- Supporting future research and machine learning approaches.

---

## ✨ Features

- Real-time hand tracking using MediaPipe.
- 3D hand landmark extraction from webcam input.
- Arabic sign recording and dataset management.
- Gesture-to-text translation.
- Dialect-aware sign storage.
- Admin tools for adding new samples.
- Confidence-based translation results.
- PostgreSQL-powered data storage.

---

## 🧠 How It Works

Ishara converts hand movements into numerical landmark sequences.

Each hand is represented using:

```
21 landmarks × 3 coordinates (x, y, z)

= 63 values per hand
```

The translation pipeline:

```
Camera
  ↓
MediaPipe Hand Tracking
  ↓
3D Landmark Extraction
  ↓
Gesture Sequence
  ↓
DTW Similarity Matching
  ↓
KNN Classification
  ↓
Arabic Text Output
```

---

## 🤖 Recognition Approach

The current version uses a lightweight and explainable approach:

### Dynamic Time Warping (DTW)

Used to compare gesture sequences while handling differences in movement speed between users.

### K-Nearest Neighbors (KNN)

Used to classify gestures based on the closest stored examples.

This approach allows Ishara to expand its dataset without requiring model retraining after every new sample.

Future versions may explore deep learning models such as LSTM and Transformers when larger datasets become available.

---

## 🏗️ Architecture

```
React + Vite Client

        │

Express + TypeScript API

        │

Translation Service

        │

DTW + KNN Engine

        │

PostgreSQL Database
```

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- MediaPipe Tasks Vision

### Backend

- Node.js
- Express
- TypeScript
- Drizzle ORM
- PostgreSQL
- Zod
- Helmet

### Development

- Docker
- npm

---

## 🗄️ Data Model

Ishara stores:

### Signs

General information about each sign:

- Arabic text
- Category
- Difficulty
- Internal identifier

### Sign Variants

Gesture samples for different variations:

- Dialect
- Landmark sequences
- Media references
- Sample count

---

## 📊 Dataset Growth

The project is currently focused on creating a reliable foundation before large-scale expansion.

Future dataset growth will include:

- More Arabic signs.
- More users and contributors.
- Quality verification systems.
- User feedback collection.
- Improved filtering against incorrect samples.

---

## 🚀 Roadmap

### Current

✅ Webcam hand tracking
✅ Gesture recording
✅ PostgreSQL storage
✅ DTW + KNN translation engine

### Next

- Real-time continuous translation.
- Improved user experience.
- Authentication and protected admin tools.
- Translation feedback system.
- Dataset review workflow.

### Future

- Larger Arabic sign language dataset.
- LSTM / Transformer-based recognition.
- Mobile applications.
- Research-oriented experiments.

---

## 🔬 Research Potential

Ishara can serve as a foundation for research in:

- Arabic sign language recognition.
- Human-computer interaction.
- Accessibility technologies.
- Gesture recognition algorithms.
- Machine learning approaches for sign translation.

The current system provides a transparent baseline that can later be compared with neural network-based solutions.

---

## ⚙️ Running Locally

Requirements:

- Node.js
- npm
- Docker

Start PostgreSQL:

```bash
docker-compose up -d
```

Install dependencies:

```bash
npm install --prefix client
npm install --prefix server
```

Run development servers:

```bash
npm run dev:client
npm run dev:server
```

---

## 📄 License

This project is licensed under the Apache License 2.0.

---

## 👤 Author

**mnoNoor**

Building technology for accessibility and Arabic sign language understanding.
