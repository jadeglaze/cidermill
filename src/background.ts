console.log('Background script loaded!');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'checkUrl') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log('Current tabs:', tabs);
      const currentTab = tabs[0];
      const isAppleReportPage = currentTab?.url?.includes('reportaproblem.apple.com') || false;
      console.log('Current URL:', currentTab?.url);
      console.log('Is Apple Report Page:', isAppleReportPage);
      sendResponse({ isAppleReportPage });
    });
    return true; // Required for async response
  }
}); 