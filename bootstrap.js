/* ***** BEGIN LICENSE BLOCK *****
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/
 * 
 * The Original Code is Preferences Monitor Mozilla Extension.
 * 
 * The Initial Developer of the Original Code is
 * Copyright (C)2012 Diego Casorran <dcasorran@gmail.com>
 * All Rights Reserved.
 * 
 * ***** END LICENSE BLOCK ***** */

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components,
	OS = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService),
	PS = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService),
	CS = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService),
	WM = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator),
	SP = {
		console2: ['extensions.consolefilter'],
		'pdf.js.components': ['pdfjs.database'],
		noscript: ['dom.max_chrome_script_run_time','dom.max_script_run_time']
	};

Cu.import('resource://gre/modules/AddonManager.jsm');

let PrefMon = {
	prefs: {},
	pan: {},
	adb: {},
	llm: [],
	
	log: function(m) {
		// dump('Preferences Monitor :: '+ m + "\n");
		if(~this.llm.indexOf(m))
			return;
		if(this.llm.length == 2)
			this.llm.shift();
		this.llm.push(m);
		CS.logStringMessage('Preferences Monitor :: '+(new Date()).toString()+"\n> "+m);
	},
	
	onInstalled: function(a) this.adb[a.id] = a.name,
	gN: function(id) id in this.adb && this.adb[id] || null,
	sM: function(s,p) (let (x = s.match(p)) x && x[1]),
	
	p: function(n) {
		switch(PS.getPrefType(n)) {
			case Ci.nsIPrefBranch.PREF_STRING:
				return PS.getComplexValue(n, Ci.nsISupportsString).data;
			case Ci.nsIPrefBranch.PREF_INT:
				return PS.getIntPref(n);
			case Ci.nsIPrefBranch.PREF_BOOL:
				return PS.getBoolPref(n);
			default:break;
		}
		return null;
	},
	
	c: function(window,nn) {
		return function() {
			let wnd = WM.getMostRecentWindow('global:console');
			
			if( wnd ) {
				wnd.focus();
			} else {
				wnd = window.openDialog("chrome://global/content/console.xul",nn,'centerscreen,resizable');
				wnd.addEventListener("load", function() {
					let w = this;
					w.removeEventListener("load", arguments.callee, false);
					w.setTimeout(function(){
						if(w.gFilter) {
							w.gFilter.value = nn;
							w.filterConsole();
							w.gConsole.scrollToIndex(w.gConsole.itemCount-1);
						} else {
							w.gConsole.mode = "Errors";
						}
						w.document.title = nn;
						w = null;
					},20);
					
				}, false );
			}
			wnd = window = null;
		};
	},
	
	observe: function(s, t, d) {
		switch(t) {
			case 'nsPref:changed': {
				let b = WM;
				if(!b || !(b=b.getMostRecentWindow("navigator:browser")) || !(b=b.gBrowser)) {
					this.log('WARNING: Unable to obtain navigator:browser (NotificationBox Unavailable)');
				}
				
				let c = Components.stack.caller,sN,lN,p,ext,ext2,ext3,sNo = null, self = this,
					updV = function(k,v) self.prefs[k] = v, nV = this.p(d),
					oV = (d in this.prefs ? this.prefs[d] : null), stack = [], eN;
				
				if(c == null) {
					this.log('ERROR: Stack unavailable, changed preference: `'+d+'´ FROM `'+oV+'´ TO `'+nV+'´');
					updV(d,nV);
					break;
				}
				
				do {
					sN = c.filename;
					lN = c.lineNumber;
				} while(sN === null && (c = c.caller));
				
				if(sN == null) {
					this.log('ERROR: Unable to obtain caller, changed preference: `'+d+'´ FROM `'+oV+'´ TO `'+nV+'´');
					updV(d,nV);
					break;
				}
				
				if((p = sN.lastIndexOf(' -> ')) != -1) {
					sNo = sN;
					sN = sN.substr(p+4);
				}
				
				p = sN.indexOf('://') + 1;
				while(sN.charAt(p) == '/')++p;
				ext = sN.substr(p,sN.indexOf('/',p)-p);
				
				if(~['global','mozapps','browser','components','modules','gre','services-common','services-sync'].indexOf(ext) || /^about:/.test(sN)) {
					this.log('Permitted change by `'+(ext||sN)+'´ for "'+d+'"');
					updV(d,nV);
					break;
				}
				
				// let LOG = (function(m) this.log(m)).bind(this);
				
				// LOG(' ^^^ '+ext+' ~ '+sN);
				if(/^(jar|file)\:/i.test(sN)) {
					
					ext = this.sM(decodeURIComponent(sN),/extensions\/([^\/@]+)(?:@[^\/]+)?\//);
					if(ext)ext = ext.replace(/\.xpi!?$/,'');
				}
				
				ext2 = this.sM(sN,/extensions\/([^\/@]+)@[^\/]+\//);
				ext3 = this.sM(sN,/extensions\/[^\/@]+@([^\/]+)\//);
				eN = this.gN(ext) || this.gN(''+ext2+'@'+(ext3||'').replace(/\.xpi!?$/,'')) || ext;
				if(ext3)ext3 = ext3.replace(/(\.\w+)+!?$/,'');
				
				// LOG(ext+' ~ '+ext2+' ~ '+ext3+' ~~ '+eN);
				
				let dL = d.toLowerCase();
				for each(let e in [ext,ext2,ext3,eN]) {
					if(!e)continue;
					let eL = e.replace(/\s+/g,'').toLowerCase(), c;
					if(!~dL.indexOf(eL + '.')
					&& !~dL.indexOf(eL + '@')
					&& !~dL.indexOf(e.replace(/^([a-z]+)[A-Z_][a-z]+$/,'$1').toLowerCase() + '.')) {
						if(!~(SP[e]||'').indexOf(dL))
							continue;
						c = 1;
					}
					this.log('Permitted '+(c?'controlled':'self-made')+' change by `'+eN+'´ for "'+d+'"');
					updV(d,nV);
					return;
				}
				
				if(oV === nV) {
					this.log('VOID change by `'+eN+'´ for "'+d+'" -> ('+nV+')');
					break;
				}
				updV(d,nV);
				
				c = Components.stack;
				while((c = c.caller)) {
					if(c.filename || stack.length)
						stack.push('@' + c.filename + ':' + c.lineNumber);
				}
				
				let _ = function(v) {
					if(v === 0)
						return "0";
					if(v === false)
						return 'false';
					if(v === null)
						return v;
					return typeof v != 'string' || v.length ? v.toString().substr(0,0x80) : null;
				},nn = 'Preferences Monitor',Msg = '`' + eN + '´ changed the value of "' + d + '"',
					MsgExt = nn + ' :: ' + (new Date()).toString() + "\n\n" + Msg + "\n\noldValue: " +  (_(oV)||'`No old Value found´')
						+ "\nnewValue: " + (_(nV)||'`Empty (Value Cleared?)´')
						+ (sNo ? "\n\n"+sNo.replace(sN.replace(/!\/.+$/,'!'),'','g'):"")
						+ (stack.length ? (sNo ? "\n":"\n\n") + stack.join("\n"):""),
				
				sE = Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError);
				sE.init(MsgExt,sN,String(lN),lN,null,Ci.nsIScriptError.errorFlag,'chrome javascript');
				CS.logMessage(sE);
				
				if(!b)break;
				
				if(!(d in this.pan)) {
					this.pan[d] = 0;
				}
				if(++this.pan[d] > 3)
					break;
				
				let n = b.getNotificationBox(), bn = "More Info", pn;
				if((pn = n.getNotificationWithValue(nn))) {
					n.removeNotification(pn);
					bn += '*';
				}
				n.appendNotification(nn+': '+Msg,nn,"chrome://global/skin/icons/warning-16.png",n.PRIORITY_WARNING_MEDIUM, [
					{label:bn,accessKey:"I",callback:this.c(b.browsers[0].contentWindow,nn)}
				]);
				
			}	break;
			
			default:break;
		}
	}
};

let sTimer;
function startup(aData, aReason) {
	let i = Ci.nsITimer;
	(sTimer = Cc["@mozilla.org/timer;1"].createInstance(i))
		.initWithCallback({notify:(function() {
			sTimer = null;
			
			if("nsIPrefBranch2" in Ci)
				PS.QueryInterface(Ci.nsIPrefBranch2);
			
			for each(let o in PS.getChildList("", {value: 0})) {
				this.prefs[o] = this.p(o);
			}
			
			PS.addObserver("", this, false);
		}).bind(PrefMon)},1942,i.TYPE_ONE_SHOT);
	
	AddonManager.addAddonListener(PrefMon);
	AddonManager.getAddonsByTypes(['extension'],function(addons) {
		addons.forEach(function(addon) PrefMon.adb[addon.id] = addon.name);
	});
}

function shutdown(aData, aReason) {
	if(aReason == APP_SHUTDOWN)
		return;
	
	if(sTimer) sTimer.cancel();
	AddonManager.removeAddonListener(PrefMon);
	PS.removeObserver("", PrefMon);
}

function install(aData, aReason) {}
function uninstall(aData, aReason) {}
