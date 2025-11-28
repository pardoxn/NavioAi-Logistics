<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1D6x4xi2BiVFPhLJIaEFK8js1yPzUy40A

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set env in `.env.local`:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   # optional
   GEMINI_API_KEY=your-gemini-key
   ```
3. Run the app:
   `npm run dev`
