### Prefences Monitor _aka, PrefMon_ - Mozilla Firefox Extension ###

Over the time one of the most common complains from users is about add-ons which suddenly changed Firefox preferences without their knowledge. This gave the idea to create this add-on... Preferences Monitor will watch for changes on the about:config preferences and notify you of what was changed exactly.

There are three scenarios regarding changes:

1. Changes made by Firefox itself.

2. Changes made by extensions to its own preferences.

3. Changes made by extensions to private Firefox preferences.

All of them will be notified on the ErrorConsole, while those of point 3 will be notified with a NotificationBox as well (see screenshot), in such NotificationBox you have a "More Info" button which you can use to open the ErrorConsole. There will be maintained a single NotificationBox at a time, if several changes are noticed simultaneously an asterisk will be added to the button (will become "More Info*")

Additionally it also allows you to automatically or manually revert any changes made, saving console messages to a file on your hard disk for later inspection, _or recently the eCleaner add-on has been merged into PrefMon, which allows you to remove garbage left by extensions after uninstallation._

Please refer to the AMO listing page for further details:

<https://addons.mozilla.org/addon/preferences-monitor/>

If you would like to help testing by installing PrefMon straight from this repository, you can do so by using [GitHubExtIns](https://github.com/diegocr/GitHubExtIns).
