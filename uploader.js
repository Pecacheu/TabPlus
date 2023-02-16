//HTML5 Uploader API 1.15. Ray 2016, All rights reserved
//Requires 'uploader.css' & 'upload.svg'

"use strict";
function Uploader(extList, parent, maxFiles, doneMsg) {
	//-- Settings:
	const LabelText = "<strong>Choose a file</strong> or drag it here.",
	UploadText = "<i>Reading File...</i>", DoneText = doneMsg || "File Loaded Successfully!",
	ErrorTextL = "<i>Error:</i> ", ErrorTextR = "!<br><strong>Try Again?</strong>", self = this;
	if(typeof maxFiles !== 'number' || !(maxFiles > 0)) maxFiles = 1;
	if(extList && typeof extList === 'string') extList = [extList];
	else if(!Array.isArray(extList) || extList.length === 0) extList = null;

	//-- Create Uploader Box:
	const fileBox = makeEl('div', "upFileBox", parent), upCont = makeEl('div', "upContents", fileBox),
	icon = makeEl('div', "icon", upCont), label = makeEl('label', null, upCont),
	input = makeEl('input', null, upCont), text = makeEl('span', null, upCont);
	input.id = "upInput"; if(extList) input.accept = extList.join(',');
	label.setAttribute('for', "upInput"); input.type = 'file';
	label.innerHTML = LabelText; text.style.display = "none";

	//Add Event Listeners:
	fileBox.ondrag = prevent;
	fileBox.ondragover = fileBox.ondragenter = onDragOver;
	fileBox.ondragleave = fileBox.ondragend = onDragOut;
	fileBox.ondrop = input.onchange = onDrop;

	//-- Public Functions:
	this.remove = function() { fileBox.remove(); }
	this.element = fileBox;

	//-- External Event Listeners:
	this.onFileLoad = false; //Called once per file. An error can be returned as a string.
	this.onLoadDone = false; //Called once all files in a drop are processed. An error can be returned as a string.

	//-- Internal Listeners:
	function prevent(e) { e.preventDefault(); e.stopPropagation(); }
	function onDragOver(e) { prevent(e); fileBox.classList.add("upDragOver"); }
	function onDragOut(e) { prevent(e); fileBox.classList.remove("upDragOver"); }

	function onDrop(e) {
		fileBox.ondrop = input.onchange = null; onDragOut(e); setText(UploadText);
		document.body.style.cursor = "wait"; let files;
		//Check for input files:
		if(e.type == 'drop') files = e.dataTransfer.files; else if(e.type == 'change') files = e.target.files;
		if(!files || files.length < 1) { setText(LabelText); onDropExit(); return; }
		if(files.length > maxFiles) { setText(ErrorTextL+"Too many files"+ErrorTextR); onDropExit(); return; }
		setTimeout(function(){parseNext(files,0)},1);
	}

	function parseNext(files, f) {
		let usrErr; if(f == files.length) {
			if(self.onLoadDone) usrErr = self.onLoadDone.call(self);
			if(usrErr) setText(ErrorTextL+usrErr+ErrorTextR); else setText(DoneText);
			onDropExit();
		} else {
			const n = files[f].name;
			if(extList && extList.indexOf(n.substr(n.lastIndexOf('.')).toLowerCase()) == -1) { //Check extention
				setText(ErrorTextL+"Invalid file type"+ErrorTextR); onDropExit(); return;
			}
			readFile(files[f], function(data) { //Read file contents
				if(typeof data != 'string' || !data) { setText(ErrorTextL+"No data read"+ErrorTextR); onDropExit(); return; }
				if(self.onFileLoad) usrErr = self.onFileLoad.call(self,data,files[f]);
				if(usrErr) { setText("<i>Error in '"+n+"':</i> "+usrErr+ErrorTextR); onDropExit(); return; }
				parseNext(files, f+1);
			});
		}
	}

	function onDropExit() {
		document.body.style.cursor = null; input.value = null;
		fileBox.ondrop = input.onchange = onDrop;
	}

	//-- Helpful Functions:
	function makeEl(tag, cls, par) {
		var el = document.createElement(tag);
		if(cls) el.className = cls; if(par) par.appendChild(el);
		return el;
	}
	function setText(txt) {
		var lStl = label.style, tStl = text.style;
		if(txt == LabelText || txt.indexOf("<i>Error") == 0) { label.innerHTML = txt; lStl.display = null; tStl.display = "none"; }
		else { text.innerHTML = txt; lStl.display = "none"; tStl.display = null; text.className = txt==DoneText?"doneAnim":''; }
	}
	function readFile(f, cb) {
		var reader = new FileReader(); reader.readAsBinaryString(f);
		reader.onload = function(e) { cb(e.target.result); };
	}
}