console.log('Polymath Background Service Worker Loaded');

// Allow clicking the action icon to open the side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
