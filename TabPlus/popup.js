//TabPlus Popup Script. Ray 2016, All rights reserved

'use strict';
window.onload = () => {
	TabServiceInit(); options.onclick=() => chrome.runtime.openOptionsPage();
	utils.getClassList('menuItem').each(b => {b.onclick=() => saveTabs(b.id)});
	main.onclick=() => TabService('openMainPage');
}
async function saveTabs(type) {try {
	let sel; switch(type) {
		case "all": case "left": case "right": sel={currentWindow:true};
		break; case "only": sel={currentWindow:true,active:true};
		break; case "other": sel={currentWindow:true,active:false};
	}
	let tabs=await chrome.tabs.query(sel);
	await TabService('runTabSaver',tabs,type);
} catch(e) {alert(e);throw e}}