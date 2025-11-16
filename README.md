# Trade AI Project

## Overview
Trade AI is a simulated high-frequency trading bot designed for Forex currency pairs. The application leverages real-time market data and AI-driven decision-making to simulate trading actions. It provides a user-friendly interface for monitoring trading metrics, AI decisions, and trade history.

## Features
- **Simulated Trading**: Execute trades based on AI-generated decisions.
- **Real-Time Data**: Visualize current market conditions, including order book data.
- **Trade History**: Track executed trades and their outcomes.
- **Firebase Integration**: Store and manage user data and trading signals.

## Project Structure
```
trade-ai
├── public
│   └── index.html          # Main HTML file for the application
├── src
│   ├── index.jsx           # Entry point of the application
│   ├── App.jsx             # Main application component
│   ├── components           # Contains all UI components
│   │   ├── atoms           # Atomic components (smallest building blocks)
│   │   │   ├── MetricItem.jsx  # Displays a metric item
│   │   │   └── DataBox.jsx     # Displays a data box with optional styling
│   │   ├── molecules        # Molecule components (combinations of atoms)
│   │   │   └── OrderBookRow.jsx # Represents a row in the order book
│   │   ├── organisms        # Organism components (complex UI components)
│   │   │   ├── Header.jsx   # Application header
│   │   │   ├── ControlPanel.jsx # Control panel for trading actions
│   │   │   ├── OrderBookDisplay.jsx # Displays the order book
│   │   │   └── TradeHistoryTable.jsx # Displays trade history
│   │   └── templates        # Template components (page layouts)
│   │       └── Dashboard.jsx # Main dashboard layout
│   ├── hooks                # Custom hooks
│   │   └── useFirebase.js   # Firebase initialization and authentication
│   ├── services             # API service functions
│   │   └── geminiApi.js     # Functions for interacting with the Gemini API
│   ├── utils                # Utility functions
│   │   ├── simulation.js     # Functions for generating simulated market data
│   │   └── helpers.js        # Helper functions for formatting and calculations
│   └── styles               # CSS styles
│       └── tailwind.css      # Tailwind CSS styles
├── package.json             # npm configuration file
├── .gitignore               # Git ignore file
└── README.md                # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd trade-ai
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage
1. Start the development server:
   ```
   npm start
   ```
2. Open your browser and navigate to `http://localhost:3000` to view the application.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.