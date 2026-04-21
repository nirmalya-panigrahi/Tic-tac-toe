<div align="center">

# 🎮 ULTIMATE TIC-TAC-TOE
### *A Modern Tactical Grid Engine v2.5.1*

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)](LICENSE)

![Game Preview](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

</div>

---

## 🚀 Quick Start

> **Prerequisites:** Node.js 18+

### Installation

```bash
# 1️⃣ Clone & install dependencies
npm install

# 2️⃣ Configure your environment
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# 3️⃣ Launch the game
npm run dev
```

Your game will be live at **`http://localhost:3000`** 🎯

---

## 🎯 What is Ultimate Tic-Tac-Toe?

A modern twist on the classic game! Instead of a simple 3×3 grid, you play on a **9×9 meta-grid** where:

- 🎲 **9 small grids** make up the big board
- 🎯 **Your move location** determines where opponent plays next
- 🏆 **Win small grids** to control the meta-board
- 👑 **Dominate 3 grids** in a row to win the game

---

## 🎮 Game Features

| Feature | Details |
|---------|---------|
| 🤖 **AI Opponent** | 3 difficulty levels: Novice → Tactician → Grandmaster |
| ✨ **Smooth Animations** | Motion UI with neon cyan & pink aesthetics |
| 📊 **Tactical Analysis** | Real-time win probability & move commentary |
| 💾 **Game History** | Undo moves, replay tactical decisions |
| 🎨 **Dark Mode** | Cyberpunk-inspired design with glassmorphism |
| 📱 **Responsive** | Perfect on desktop, tablet, and mobile |

---

## 🛠️ Tech Stack

```
Frontend:
  ✦ React 19 (UI framework)
  ✦ TypeScript (type-safe development)
  ✦ Tailwind CSS (styling)
  ✦ Motion (smooth animations)
  
Game Logic:
  ✦ Minimax AI (alpha-beta pruning)
  ✦ Heuristic evaluation
  ✦ Turn-based game engine  
  
Build Tools:
  ✦ Vite (lightning-fast bundler)
  ✦ ESBuild (TypeScript compilation)
```

---

## 📚 Project Structure

```
np-tic-tac-toe/
├── src/
│   ├── App.tsx              # Main game component
│   ├── types.ts             # TypeScript definitions
│   ├── index.css            # Global styles
│   ├── main.tsx             # React entry point
│   └── lib/
│       ├── gameEngine.ts    # Turn logic & validation
│       └── aiEngine.ts      # Minimax AI algorithm
├── index.html               # HTML template
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite configuration
└── README.md                # This file!
```

---

## 🎮 How to Play

1. **Choose Your Callsign** — Enter your pilot name (15 chars max)
2. **Select Difficulty** — Pick your challenge level
3. **Make Your Move** — Click any empty cell in the active grid
4. **Dominate Grids** — Get 3 in a row in small grids to win them
5. **Control the Meta** — Win 3 grids in a row on the big board to win! 👑

### 🔥 Pro Tips

- 🎯 Control the **center grid (middle)** — it's worth more!
- 🧠 Your move forces the opponent's next grid
- 💡 Use the **Hint button** for optimal suggestions
- ⏮️ **Undo moves** to replay tactical decisions
- 📊 Watch the **Win Probability** bar in the tactical panel

---

## 🚀 Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Type-check with TypeScript |
| `npm run clean` | Remove dist folder |

---

## 🔧 Configuration

### Environment Variables

Create `.env.local` with:

```env
GEMINI_API_KEY=your_api_key_here
APP_URL=http://localhost:3000
```

---

## 🎨 Customization

### Change AI Difficulty

Edit `src/App.tsx` line 197:

```typescript
const [difficulty, setDifficulty] = useState<Difficulty>('Tactician');
// Options: 'Novice' | 'Tactician' | 'Grandmaster'
```

### Modify Theme Colors

Edit `src/index.css` and update CSS variables:

```css
:root {
  --color-cyan: #22d3ee;    /* Main accent */
  --color-pink: #ec4899;    /* Secondary accent */
  --color-dark: #050505;    /* Background */
}
```

---

## 📈 Game Stats

- **Grids:** 9 small 3×3 grids
- **Total Cells:** 81 cells
- **Difficulty Levels:** 3 (Novice → Tactician → Grandmaster)
- **AI Depth:** 2-6 (depending on difficulty)
- **Average Game Time:** 5-10 minutes

---

## 🤝 Contributing

Found a bug or have an idea? [Open an issue](https://github.com/nirmalya-iitkgp/np-tic-tac-toe/issues) or submit a pull request! 

---

## 📜 License

Licensed under [Apache License 2.0](LICENSE) — feel free to use and modify!

---

## 🎯 Deployment

Ready to deploy? Check out:
- **[Vercel](https://vercel.com)** — Zero-config React hosting
- **[Netlify](https://netlify.com)** — Git-integrated deployment
- **[GitHub Pages](https://pages.github.com)** — Free static hosting

---

<div align="center">

### ⚡ Made with ❤️ by [nirmalya-iitkgp](https://github.com/nirmalya-iitkgp)

*"The grid has been established. Deploy now."* 🚀

</div>
