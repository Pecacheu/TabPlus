//TabPlus Popup Script. Ray 2016, All rights reserved

'use strict';
window.onload = () => {
	TabServiceInit(); options.onclick=() => chrome.runtime.openOptionsPage();
	utils.getClassList('menuItem').each(b => {b.onclick=() => saveTabs(b.id)});
	main.onclick=() => TabService('openMainPage');
}
async function saveTabs(type) {try {
	let sel={}, p=await TabService('getOpt','SavePinned');
	if(type == "all" || type == "left" || type == "right") sel={currentWindow:true,pinned:p};
	else if(type == "only") sel={currentWindow:true,active:true};
	else if(type == "other") sel={currentWindow:true,active:false,pinned:p};
	let tabs=await chrome.tabs.query(sel); await TabService('runTabSaver',tabs,type);
} catch(e) {alert(e);throw e}}