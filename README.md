# Gemini Reflection Journal

A secure, full-stack cognitive reflection journal and conversational brainstorming companion powered by **Gemini 3.6 Flash** and **Cloud Firestore** with automated mood analytics, continuous sentiment scoring, weekly retrospective synthesis, and strict per-user data isolation.

Built for the **Google Cloud Run AI Challenge**.

---

## 🌟 Key Features & Architecture

- **User Authentication**: Firebase Authentication with Federated Google Sign-In (no passwords stored or managed by application code).
- **Per-User Isolated Database**: Cloud Firestore enforcing strict owner-bound rules under `/users/{userId}/interactions` and `/users/{userId}/retrospectives`.
- **Gemini 3.6 Flash AI Engine**: Server-side proxy handling structured reflection generation, multi-turn follow-up dialogue, and multi-day retrospective synthesis.
- **Resilient Model Fallback Ladder**: Automated 4-stage error recovery matrix (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`).
- **Automated Mood & Sentiment Analytics**: Continuous sentiment scoring (`-1.0` to `+1.0`), categorical mood classification, and actionable cognitive reframes.
- **Weekly Retrospective Synthesis**: 7-day historical aggregation synthesizing recurring themes, personal breakthroughs, and actionable goals with minimum-entry validation (< 2 entries guard) and milestone persistence.
- **Indirect Prompt Injection Defense (OWASP LLM01)**: Untrusted input sanitization, control character stripping, defensive payload ingestion, and `<user_journal_content>` XML encapsulation.
- **Zero Hardcoded Secrets**: Protected server-side proxy; the browser never receives or handles `GEMINI_API_KEY`.
- **Payload Hygiene**: Strict undefined-value stripping (`stripUndefined`) and defensive null-safe payload parsing.

---

## 📋 Prerequisites

Before deploying, ensure you have:
1. A **Google Cloud Platform (GCP)** project with billing enabled.
2. The **Google Cloud SDK (`gcloud` CLI)** installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).
4. Required APIs enabled in your Google Cloud project:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     cloudbuild.googleapis.com
   ```

---

## 🚀 How to Share on GitHub

You can export and publish this repository to GitHub directly:

### Method A: Direct Export from Google AI Studio
1. In Google AI Studio Build, click the **Settings / Menu** icon in the upper-right corner.
2. Select **Export to GitHub** (or **Download ZIP**).
3. Connect your GitHub account and choose your repository name (e.g., `gemini-reflection-journal`).
4. Set the repository visibility to **Public** so judges and peers can view the code and architecture.

### Method B: Git Push via Terminal
If working from a downloaded workspace:
```bash
git init
git add .
git commit -m "Initial commit: Gemini Reflection Journal with Cloud Run deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gemini-reflection-journal.git
git push -u origin main
```

---

## 🔒 1. Cloud Firestore Security Rules

Deploy the following security rules to enforce complete per-user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data isolation: each user can only read and write their own documents and subcollections
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /retrospectives/{retrospectiveId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

To deploy rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 🔑 2. Secret Management Setup (Google Cloud Secret Manager)

Store the `GEMINI_API_KEY` securely in Secret Manager so it is never committed to source code or bundled into client assets:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Retrieve your Google Cloud project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# 3. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 💻 3. Local Development

To run the application locally:

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:3000`.

---

## ☁️ 4. Cloud Run Deployment Flow

Deploy the full-stack container directly to Cloud Run:

```bash
# Set deployment configuration variables
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_NAME="gemini-reflection-journal"

# Build and deploy container directly from source with Secret Manager binding
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### 🏷️ Mandatory Challenge Verification Label

Apply the required challenge label to register your Cloud Run deployment for automated verification:

```bash
gcloud run services update $SERVICE_NAME \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

Verify your deployment status:
```bash
gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"
```

---

## 🧪 5. End-to-End Functional Stability & Walkthrough Test Cases

Every user interaction that can be triggered in the application has a corresponding test script:

### Test Case 1: Landing Page & Unauthenticated State
1. **Navigate to App Root URL**:
   - **Expected Result**: Landing page displays "Conversational Reflection Powered by Gemini 3.6 Flash", architectural guarantee badges, and the "Sign In with Google" button.
   - **Verification**: No journal entry inputs or history lists are accessible before authentication.

### Test Case 2: User Authentication via Google Sign-In
1. **Click "Sign In with Google" (`#btn-google-sign-in`)**:
   - **Expected Result**: Firebase Google OAuth popup opens.
2. **Complete Google Account Selection**:
   - **Expected Result**: Popup closes; application transitions to Private Dashboard within 1-2 seconds.
   - **Verification**: Navbar displays user's Google avatar/initials, verified email, "User Data Isolated" badge, "Weekly Retrospective" button, and "New Reflection" button.

### Test Case 3: Initial Journal Creation & Automated Mood Analytics
1. **Select Objective Mode**:
   - Click "Deep Reflection" (`#mode-reflection`) or "Action Items" (`#mode-action_items`).
   - **Expected Result**: Card highlights with indigo border and indicator.
2. **Select Optional Mood or Let Gemini Detect Automatically**:
   - Select a mood pill or leave on default.
3. **Enter Journal Thoughts**:
   - Type reflection text into `#textarea-journal-body` or click an inspiration starter prompt.
4. **Submit Reflection**:
   - Click "Reflect with Gemini" (`#btn-generate-reflection`).
   - **Expected Result**: Button displays spinner with "Synthesizing via Gemini 3.6 Flash...".
   - **Expected Result**: Gemini response returns structured reflection, detected mood (e.g. Grateful, Overwhelmed, Motivated), sentiment score (e.g. +0.75), and actionable cognitive reframe.
   - **Expected Result**: The active workspace card displays the color-coded mood badge, numeric sentiment score, and the Actionable Cognitive Reframe box.
   - **Expected Result**: Interaction document is persisted to Cloud Firestore under `/users/{userId}/interactions/{interactionId}`.

### Test Case 4: Multi-Turn Conversation Thread
1. **Submit Follow-Up Question**:
   - In the active reflection view, locate the bottom follow-up input (`#input-follow-up-turn`).
   - Enter: *"Can you break the first suggestion down into three 5-minute micro-actions?"*
   - Click "Reply" (`#btn-send-follow-up`) or press Enter.
   - **Expected Result**: User's speech bubble appears on the right; Gemini thinking indicator appears; Gemini's follow-up reply appears on the left with model attribution.
   - **Expected Result**: Both turns are persisted immediately to Firestore under `/users/{userId}/interactions/{interactionId}`.

### Test Case 5: Weekly Retrospective Synthesis (< 2 Entries Guard)
1. **Pre-condition**: Sign in with an account having 0 or 1 reflection in the past 7 days.
2. **Action**: Click the **"Weekly Retrospective"** button in either the top navigation bar (`#btn-weekly-retro`) or the history sidebar (`#btn-sidebar-weekly-retro`).
3. **Expected Result**:
   - Modal opens displaying the minimum entry guard alert (*"More Reflections Needed for Synthesis"*).
   - Counter accurately displays `0 / 2 required` or `1 / 2 required`.
   - Clicking *"Write a Reflection Now"* closes the modal and focuses the journal entry editor.

### Test Case 6: Weekly Retrospective Synthesis & Milestone Persistence (>= 2 Entries)
1. **Pre-condition**: Account has 2 or more journal entries written in the past 7 days.
2. **Action**: Click **"Weekly Retrospective"** in the top navigation bar or history sidebar.
3. **Expected Result**:
   - Modal retrieves the user's 7-day entries and shows loading state with model attribution.
   - Synthesized retrospective renders:
     - Header card with synthesized title, entry count, dominant mood badge, and average sentiment score.
     - Narrative summary markdown block.
     - Key Recurring Themes, Personal Wins & Progress, and Focus for Coming Week cards.
4. **Save as Milestone**:
   - Click **"Save as Weekly Milestone"** (`#btn-save-milestone`).
   - Retrospective document is persisted to `/users/{userId}/retrospectives`.
   - Button updates to confirmed state and appears in the **"Saved Milestones"** tab.

### Test Case 7: History Navigation & Search Filtering
1. **Inspect History Sidebar**:
   - **Expected Result**: Reflections are listed with titles, color-coded mood badges, sentiment indicators, and turn counts.
2. **Test Search Filter**:
   - Enter a keyword in `#input-search-history`.
   - **Expected Result**: History list instantly filters to matching reflections.
3. **Switch Between Reflections**:
   - Click another reflection from history.
   - **Expected Result**: Workspace loads that reflection's original prompt, full turn history, and allows continuing the multi-turn chat.

### Test Case 8: Mood Dropdown Filtering in Sidebar
1. **Click Mood Filter Dropdown (`#select-filter-mood`)**:
   - Select a specific mood (e.g., "Grateful", "Overwhelmed", or "Motivated").
   - **Expected Result**: The sidebar dynamically updates to show only entries tagged with the chosen mood, with matching entry counts displayed in the dropdown options.
2. **Reset Filter to "All Moods"**:
   - Select "All Moods".
   - **Expected Result**: Full list of user interactions re-appears.

### Test Case 9: Deletion & Sign Out
1. **Click Delete Icon on an Entry**:
   - Confirm browser prompt.
   - **Expected Result**: Interaction document is deleted from Firestore, disappears from the sidebar, and editor resets cleanly.
2. **Click Sign Out (`#btn-sign-out`)**:
   - **Expected Result**: Active session is terminated, local state cleared, and view returns to Landing Page.

---

## 🛡️ Threat Model & Security Mitigations

| Threat Zone | Risk Description | Attack Scenario | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Malicious prompt injection in journal entries | Untrusted input attempting system directive overrides | Strict schema validation, sanitization helper (`sanitizeJournalInput`), length capping, and `<user_journal_content>` XML boundary tagging. |
| **Planning & Reasoning** | System instruction bypass | Prompt injection instructing model to ignore constraints | System prompt mandates strict JSON schema enforcement (`responseMimeType: 'application/json'`), regex parsing fallbacks, and multi-model fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`). |
| **Tool Execution** | Server crash or unhandled exceptions from malformed requests | Malformed JSON payload crashing Node process | Top-level body parser deserialization, null-safe payload extraction (`(req.body && typeof req.body === 'object')`), and explicit error status codes. |
| **Memory & State** | Cross-user data leakage in Firestore | Malicious actor attempting to read or overwrite another user's entries or retrospectives | Firestore rules mandate strictly isolated user paths: `/users/{userId}/interactions/{id}` and `/users/{userId}/retrospectives/{id}` with `allow read, write: if request.auth != null && request.auth.uid == userId`. Payload sanitization strips all `undefined` values before persistence. |
| **Inter-System Communication** | Gemini API key exposure | API key leaked in client-side code | Gemini API calls are strictly handled on the backend Express route `/api/gemini/*` using `process.env.GEMINI_API_KEY`. No secret keys are exposed to the client. |

---

## 📄 License

MIT License. Designed and developed for the Google Cloud Run AI Challenge.

