# CiderMill

A Chrome extension for exporting your Apple purchase history to a CSV file.

Apple doesn't provide a very convenient way to get your purchase history.
CiderMill solves that problem by:
* Helping you find your purchase history.
* Loading all purchases for the time period you're interested in.
* Displaying it at either the order or item level.
* Saving it all to a CSV file for you to download.

## Installation

### From Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store listing](https://chrome.google.com/webstore/detail/cidermill/...) (link to be added)
2. Click "Add to Chrome"
3. Follow the installation prompts

### Manual Installation (Developer Mode)

1. Download the latest release from the [Releases page](https://github.com/jadeglaze/cidermill/releases)
2. Extract the ZIP file to a location on your computer
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (toggle in the top right)
5. Click "Load unpacked" and select the extracted folder

## Usage

If you're not on the Apple purchase history site, click the CiderMill extension icon in your Chrome toolbar and it'll show a link to help you get there.

1. If you are the manager of a family for Apple purchases, select the family member of interest (or "All") on the Apple site.
2. Click the CiderMill extension icon in your Chrome toolbar.
3. Choose between "orders" or "items" view
4. Select your desired date range
5. Click "Extract" to load all the data and display it in a concise table.
6. Click "Download CSV" to export your data

## Development

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jadeglaze/cidermill.git
   cd cidermill
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

### Development Workflow

- `npm run build` - Build the extension
- `npm run watch` - Watch for changes and rebuild automatically
- `npm run package` - Create a distribution ZIP file

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Privacy

CiderMill processes your Apple purchase data locally in your browser. No data is sent to external servers. The extension only accesses the Apple purchase data when you explicitly interact with it.

## Support

For support, please [open an issue](https://github.com/jadeglaze/cidermill/issues) on GitHub.
