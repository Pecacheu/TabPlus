//TabPlus Options. Ray 2016, All rights reserved

//TODO: Some way to have a confirmation box??
'use strict';
function err(e) {document.body.textContent="Error: "+e}
window.onload=() => {
	TabServiceInit();
	bRst.onclick=async () => {try {
		await Promise.all([chrome.storage.local.clear(),chrome.storage.sync.clear()]);
		await TabService('openMainPage');
	} catch(e) {err(e)}}
}