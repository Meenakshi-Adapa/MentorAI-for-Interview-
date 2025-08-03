# AI Coding Mentor

An interactive, AI-powered platform designed to help users rebuild their logical thinking and prepare for technical interviews. This application provides a structured learning path with classic coding problems, an integrated AI mentor for hints and code reviews, and a persistent workspace to track progress.

###AI Coding Mentor Screenshot
<img width="1895" height="891" alt="image" src="https://github.com/user-attachments/assets/9aa21a1e-9e6c-420f-957b-64f049dc4b06" />


## Features

- **Interactive Problem Solving:** A dedicated workspace with sections for understanding the problem, planning a solution, executing the code, and reviewing the results (the U-P-E-R method).
- **AI-Powered Mentor:** An integrated chatbot powered by the Google Gemini API that provides Socratic hints, explains concepts, and performs detailed code reviews.
- **Dynamic Content:** Problems, learning phases, and test cases are fetched directly from a Firestore database, allowing for easy updates without redeploying the application.
- **Persistent Progress:** All user notes and code are automatically saved to Firestore, allowing users to pick up right where they left off.
- **Customizable Layout:** Resizable panels allow users to customize their workspace for an optimal learning experience.
- **Secure Authentication:** Anonymous user sessions are handled securely through Firebase Authentication.

## Tech Stack

- **Frontend:** [React](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database:** [Google Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **AI Integration:** [Google Gemini API](https://ai.google.dev/)
- **Icons:** [Lucide React](https://lucide.dev/)

## Setup and Deployment

This project is configured for easy deployment on [Vercel](https://vercel.com/).

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x or newer recommended)
- A [Google Firebase](https://firebase.google.com/) project
- A [Google Gemini API Key](https://ai.google.dev/)

### 1. Set Up Firebase

1.  Create a new project in the Firebase Console.
2.  Create a **Firestore Database**.
    - Start in **Production mode**.
    - Choose a location near you.
3.  Set up **Authentication**.
    - Go to the "Sign-in method" tab.
    - Enable the **Anonymous** sign-in provider.
4.  Set up your **Firestore Security Rules**.
    - Go to the "Rules" tab in Firestore and replace the default rules with the following to allow users to read public data and write to their own progress documents:
      ```
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /problems/{problemId} {
            allow read: if request.auth != null;
          }
          match /phases/{phaseId} {
            allow read: if request.auth != null;
          }
          match /artifacts/{appId}/users/{userId}/{document=**} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
        }
      }
      ```
5.  Populate your database with the `phases` and `problems` collections as described in the project's setup guide.

### 2. Environment Variables

Create a `.env` file in the root of your project and add your Firebase and Gemini keys. **This file should not be committed to GitHub.**


VITE_FIREBASE_CONFIG='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
VITE_APP_ID="my-coding-mentor-app"


### 3. Deploy to Vercel

1.  Push your project to a GitHub repository.
2.  Import the repository into Vercel.
3.  In the Vercel project settings, navigate to the **Environment Variables** section.
4.  Add the same three variables (`VITE_FIREBASE_CONFIG`, `VITE_GEMINI_API_KEY`, `VITE_APP_ID`) with the same values from your `.env` file.
5.  Go to the **General** settings and ensure the **Node.js Version** is set to **20.x** or **18.x**.
6.  Trigger a new deployment.

## Future Enhancements

- **Automated Test Case Execution:** Build a secure backend service (e.g., using Node.js, Express, and Docker) to safely compile and run user-submitted code against the test cases.
- **Admin Panel:** Create a separate interface for admins to easily add, edit, and delete problems and phases directly in the database.
- **More Languages:** Extend the platform to support other languages like Python and JavaScript.
