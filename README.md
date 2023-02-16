![Promo Image](https://user-images.githubusercontent.com/3608878/219253308-bf13ab8b-f072-49a5-bcd3-cb091ed858d4.png)

Tab++ is an extension for Chrome, Edge, Brave, and other Chromium-based browsers that allows you to save your tabs for later. You can organize, categorize, and name them, then restore individual tabs or tab groups at any time. You can even sync them across devices!

Tab++ is inspired by similar extensions like OneTab, only with **WAY** more features... Like folders, cloud-syncing, easy backup and restore, and more!

#### *Note:* Usage help can be found in the options page.

NEW IN v1.7.0:
- Ported to the new manifest v3 API.
- Total codebase rewrite with asynchronous architecture and service workers, for massively improved performance and stability.
- Fixed graphical bugs on loading screen in newer Chrome(/Chromium) versions.
- More error messages (instead of failing silently, without telling you!)
- Automatic restore-from-backup on critical sync error. Say no more to the sync tab eating your tabs into the void because your internet is slow.
- INFINITE SCROLLING! (Yeah boiii, now you can legit have 10,000+ tabs with zero lag! Tabs load via pop-in, as you scroll, similar to Discord and other messengers.)

NEW IN v1.6.0:
- Fixed tab export, and improved tab import. Multiple import modes and option to not overwrite duplicates. Import now automatically creates a backup.

NEW IN v1.5.3:
- New year update! Literally. Seems that there was a bug in the date parser that caused tabs saved in January to behave weirdly and not move to the top. Fixed!

NEW IN v1.5.2:
- Fixed small bug where locked tabs looked like they could be moved into other TabLists. (They couldn't, but they *looked* like they could)

NEW IN v1.5.1:
- Moving a tab in a locked tablist moves the whole tablist, without needing to hold shift. Unlike moving an unlocked tablist, the date is not updated to today when a locked list is moved, unless it's dragged to the sync-mode button for the mode it's already in.
- Moved help section to otherwise useless options page.

NEW IN v1.5.0:
- Ran out of digits for 1.4.x versions lol.
- Holding shift when opening a tab opens whole tablist.
- Fixed TabPlus page loader.