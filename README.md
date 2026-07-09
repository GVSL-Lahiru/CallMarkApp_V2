<div align="center">
<img width="300" height="300" alt="CallMark Logo" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# CallMark

*An AI-powered call marking and analysis application*

<div style="margin: 20px 0;">
  <img alt="version" src="https://img.shields.io/badge/version-2.0-blue" />
  <img alt="platform" src="https://img.shields.io/badge/platform-Node.js-green" />
  <img alt="stack" src="https://img.shields.io/badge/stack-React%20%2B%20Gemini%20AI-yellow" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-purple" />
</div>
</div>

---

## 🚀 Get Started

- [View in AI Studio](https://ai.studio/apps/224123e6-f278-4323-99f1-b072afb4c1ca)
- [Run Locally](#run-locally)
- [Documentation](#documentation)

---

## 📋 Run Locally

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/GVSL-Lahiru/CallMarkApp_V2.git
   cd CallMarkApp_V2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your API key**
   - Open `.env.local`
   - Set your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - Navigate to `http://localhost:3000`

---

## 🎯 Features

- 🤖 AI-powered call analysis using Gemini
- 📊 Real-time call marking and annotation
- 💾 Persistent data storage
- 🎨 Intuitive user interface
- ⚡ Fast and responsive

---

## 📁 Project Structure

```
CallMarkApp_V2/
├── public/          # Static assets
├── src/             # Source code
├── .env.local       # Environment variables
├── package.json     # Dependencies
└── README.md        # This file
```

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run tests |

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: API Endpoints
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## 📚 Documentation

For more information, refer to:
- [Gemini API Docs](https://ai.google.dev/)
- [Node.js Documentation](https://nodejs.org/)

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">

**Made with ❤️ by GVSL-Lahiru**

[⬆ back to top](#callmark)

</div>
