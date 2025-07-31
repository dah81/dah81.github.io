# 🏒 Zamboni Game

A fun and engaging ice cleaning game built with Next.js where you control a zamboni to clean hockey rinks! Experience the satisfaction of transforming dirty ice into pristine skating surfaces.

![Zamboni Game](https://img.shields.io/badge/Game-Zamboni-blue?style=for-the-badge&logo=gamepad)
![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Build Status](https://img.shields.io/badge/Build-Passing-green?style=for-the-badge)

## 🎮 Game Features

### 🏒 Authentic Hockey Experience
- **Simplified Hockey Rink Design**: Goals at 5% and 95%, blue lines at 25% and 75%, center line with face-off dot at 50%
- **Professional Blue & White Zamboni**: Clean, modern sprite design without text clutter
- **Rounded Corner Rinks**: Perfect collision detection for smooth corner cleaning

### 🎯 3-Level Progression
1. **Practice Arena** (600×300) - Learn the basics with 30% dirt coverage
2. **NHL Stadium** (960×400) - Master standard play with 50% dirt coverage  
3. **Speed Clean Challenge** (960×400) - Ultimate 6-minute time trial with 95% target cleanliness

### ⚡ Smooth Gameplay
- **Optimized Performance**: Smooth movement on all devices
- **Touch Controls**: Full mobile support with touch controls
- **Responsive Design**: Scales perfectly from mobile to desktop
- **Instant Cleaning**: Satisfying single-pass ice cleaning mechanics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/kamarshi_microsoft/zamboni-vibe.git

# Navigate to the project directory
cd zamboni-game

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start playing!

## 🛠️ Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 🎮 How to Play

### Controls
- **Desktop**: Arrow keys or WASD to move the zamboni
- **Mobile**: Touch controls with on-screen directional pad
- **Pause**: Spacebar or P key

### Objective
- Clean the specified percentage of ice on each rink
- Navigate around hockey markings and rink boundaries
- Complete Level 3's time challenge to master the game!

### Gameplay Tips
- Use the zamboni's wide cleaning radius efficiently
- Plan your routes to avoid retracing cleaned areas
- The zamboni automatically bounces off walls - use this to your advantage
- On the Speed Clean Challenge, focus on large dirty areas first

## 🏗️ Tech Stack

- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Rendering**: SVG-based game graphics
- **Performance**: Optimized game loop with unlimited FPS
- **Mobile**: Touch-responsive controls and viewport scaling

## 📱 Platform Support

- ✅ **Desktop**: Windows, macOS, Linux (Chrome, Firefox, Safari, Edge)
- ✅ **Mobile**: iOS Safari, Android Chrome
- ✅ **Tablet**: iPad, Android tablets
- ✅ **Performance**: Smooth 60fps+ on modern devices

## 🎨 Game Architecture

### Core Components
- `GameBoard`: Main game rendering and logic
- `Zamboni`: Professional blue & white zamboni sprite
- `IceRink`: Hockey rink with authentic markings
- `GameUI`: Score, progress, and level information
- `TouchControls`: Mobile-friendly control interface

### Game Systems
- **Physics**: Smooth zamboni movement with collision detection
- **Cleaning**: Instant ice cleaning with visual feedback
- **Progression**: 3-level difficulty curve
- **Performance**: Optimized for all device types

## 🎯 Game Progression

| Level | Rink | Size | Dirt % | Target % | Time Limit | Challenge |
|-------|------|------|--------|----------|------------|-----------|
| 1 | Practice Arena | 600×300 | 30% | 85% | None | Learn basics |
| 2 | NHL Stadium | 960×400 | 50% | 90% | None | Standard play |
| 3 | Speed Clean Challenge | 960×400 | 40% | 95% | 6 minutes | Time pressure |

## 🌟 Recent Updates

- ✅ Simplified hockey rink design with authentic markings
- ✅ Streamlined 3-level progression (removed redundant levels)
- ✅ Professional blue & white zamboni sprite
- ✅ Optimized performance and build system
- ✅ Mobile touch controls and responsive design
- ✅ Clean code with zero build warnings

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Acknowledgments

- Inspired by the satisfying work of real zamboni operators
- Built with modern web technologies for smooth gameplay
- Designed for players of all ages who enjoy casual gaming

---

**Ready to clean some ice?** 🏒 [Play the game now!](https://your-deployed-url.com)

*Made with ❤️ and lots of ice cleaning*
