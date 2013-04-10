### Mozilla Firefox Extension designed to track unwanted changes made to about:config preferences.###

Over the time one of the most common user complains is about add-ons which suddenly changed Firefox preferences without their knowledge. This gave the idea to create this add-on... Preferences Monitor will watch for changes on the about:config preferences and notify you of what was changed exactly.

There are three scenarios regarding changes:

1. Changes made by Firefox itself.

2. Changes made by extensions to its own preferences.

3. Changes made by extensions to private Firefox preferences.

All of them will be notified on the ErrorConsole, while those of point 3 will be notified with a NotificationBox as well (see screenshot), in such NotificationBox you have a "More Info" button which you can use to open the ErrorConsole. There will be maintained a single NotificationBox at a time, if several changes are noticed simultaneously an asterisk will be added to the button (will become "More Info*")

_**Note: The method used to detect extensions making changes to its own preferences (point 2) may isn't accurate if a specific extension does not use its own name for their preferences, in such case the notification will be performed as for point 3.**_

On the ErrorConsole you'll find the exact line of code where the change was invoked (as shown on the screenshot), you can click on the reported file to check the add-on's source code which performed such change.

Also, you should be aware that the NotificationBox won't show up more than three times for a changed preferences, yet these changes will still be reported on the ErrorConsole, and duplicates discarded from being reported there as well.

> &nbsp;
##➜ Configurable Options###

✔ __Ignore Changes On__:  Prevent the NotificationBox from being shown for changed preferences matching with this RegExp Pattern. Placing a "." (dot) here will disable such notifications.

✔ __Ignore By Add-On__: This is the internal whitelist of changed preferences being reported as "controlled" which it was private until version 3.2.2

The syntax is as for CSS rules, ie "addon-name:preferences.branch;[other-addon:other-branch;and-so-on...]"

Note "addon-name" refers to the former Add-On Name or a chrome namespace, in fact whatever is reported as changing some preference, for example:

_`Preferences Monitor: 'tweak' changed the value of "network.http.max.connections"`_


- To ignore just that specific change: ```;tweak:^network\.http\.max\.connections```

- To ignore all changes made to network preferences: ```;tweak:^network\.```

- To ignore all changes made by the add-on: ```;tweak:.```

> (In RegExp a single non-escaped dot means everything.)


✔ __Ask to Revert Changes__: Enable it and a new additional button will appear on the NotificationBox which you can click to revert the change. Note NotificationBox elements will no longer be grouped when this is enabled.


✔ __Revert Changes On__: Automatically revert changes made to preferences matching with this RegExp Pattern. By default changes to browser.startup. (ie, homepage), keyword.URL and general.useragent. will always be reverted, obviously you can change this behavior if you want.

> &nbsp;

<https://addons.mozilla.org/addon/preferences-monitor/>
