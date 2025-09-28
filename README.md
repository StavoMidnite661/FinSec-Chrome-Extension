# FinSec Chrome Extension

## Overview
FinSec is a Chrome extension designed to enhance financial security while browsing the web. It provides users with tools and features to manage their online financial activities safely and efficiently.

## Features
- Background script to manage the extension's lifecycle and handle events.
- Content script that interacts with web pages to manipulate the DOM and respond to messages.
- Popup interface for quick access to extension features.
- Options page for configuring user settings and preferences.
- Utility functions for common tasks throughout the extension.

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/StavoMidnite661/FinSec-Chrome-Extension.git
   ```
2. Navigate to the project directory:
   ```
   cd FinSec-Chrome-Extension
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
1. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable "Developer mode" in the top right corner.
   - Click "Load unpacked" and select the `FinSec-Chrome-Extension` directory.

2. Access the popup by clicking the extension icon in the Chrome toolbar.

3. Configure settings through the options page available in the popup.

## Development
- To build the extension, run:
  ```
  npm run build
  ```

- To start the development server, run:
  ```
  npm start
  ```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.