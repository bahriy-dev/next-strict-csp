// Stands in for a third-party snippet (analytics, chat, …) loaded through next/script.
window.widgetLoaded = true;
window.dispatchEvent(new Event('widget:loaded'));
