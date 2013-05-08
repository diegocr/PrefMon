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
	PR = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService),
	WM = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator),
	SP = {
		cooliris: ["permissions.default.image"],
		console2: ['extensions.consolefilter'],
		'pdf.js.components': ['pdfjs.database'],
		noscript: ['dom.max_chrome_script_run_time','dom.max_script_run_time']
	},
	SPR = {
		'Preferences Monitor': /./, // XXX..
		'prefmon-ecleaner': /./    // XXX..
	},
	BR = 'extensions.preferencesmonitor.',
	TP = [
		BR + 'revon',
		BR + 'revask',
		BR + 'nonboxfor',
		BR + 'nonboxbyex',
		BR + 'revonstrg'
	];

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
	
	onEnabled: function(a) this.adb[a.id.toLowerCase()] = a.name,
	onInstalled: function(a) this.adb[a.id.toLowerCase()] = a.name,
	gN: function(id) this.adb[id.toLowerCase()],
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
	
	s: function(n,v) {
		switch(PS.getPrefType(n)) {
			case Ci.nsIPrefBranch.PREF_STRING:
				let ss = Ci.nsISupportsString,
					t = Cc["@mozilla.org/supports-string;1"] .createInstance(ss);
				t.data = v;
				return PS.setComplexValue(n,ss,t);
			case Ci.nsIPrefBranch.PREF_INT:
				return PS.setIntPref(n,v);
			case Ci.nsIPrefBranch.PREF_BOOL:
				return PS.setBoolPref(n,v);
			default:break;
		}
		return null;
	},
	
	c: function(window,nn,k,v) {
		return function() {
			let wnd = WM.getMostRecentWindow('global:console');
			
			if( wnd ) {
				wnd.focus();
			} else {
				wnd = window.openDialog("chrome://global/content/console.xul",nn,'centerscreen,resizable');
				wnd.addEventListener("load", function() {
					let w = this;
					if(k) {
						w.addEventListener('unload',function(){
							w.removeEventListener("unload", arguments.callee, false);
							if(!PR.confirmEx(null,nn,'Do you want to revert the change?',1027,'','','',null,{value:!1})) {
								PrefMon.s(k,v);
							}
						},false)
					}
					w.removeEventListener("load", arguments.callee, false);
					w.setTimeout(function(){
						if(w.gFilter) {
							w.gFilter.value = nn;
							try {
								// console2
								w.filterConsole();
								w.gConsole.scrollToIndex(w.gConsole.itemCount-1);
							} catch(e) {
								// Fx18+
								w.changeFilter();
								let order = w.gConsole.sortOrder;
								if(order != 'reverse') {
									w.changeSortOrder('reverse');
									w.addEventListener('unload', function() {
										w.changeSortOrder(order);
										w.removeEventListener("unload", arguments.callee, false);
									}, false);
								}
							}
						} else {
							w.gConsole.mode = "Errors";
						}
						w.document.title = nn;
					},20);
					
				}, false );
			}
			wnd = window = null;
		};
	},
	
	r: function(p,v) {
		return function() PrefMon.s(p,v);
	},
	
	j: function(v) {
		(''+v).split(';').forEach(function(p) {
			p = p.split(':').map(String.trim);
			if(p.length == 2) try {
				SPR[p[0]] = new RegExp(p[1]);
			} catch(e) {
				Cu.reportError(e);
			}
		});
	},
	
	n: function() {
		sTimer = null;
		let p = this.p(TP[0]);
		if(!p) {
			this.s(TP[4],'');
			return;
		}
		
		try {
			p = new RegExp(p);
		} catch(e) {
			Cu.reportError(e);
			return;
		}
		
		let o = {};
		for(let [k,v] in Iterator(this.prefs)) {
			
			if(p.test(k)) {
				
				o[k] = v;
			}
		}
		this.s(TP[4],Object.keys(o).length ? JSON.stringify(o) : '');
	},
	
	m: function() {
		sTimer = null;
		
		let o,p;
		try {
			o = JSON.parse(p=this.p(TP[4]));
		} catch(e) {
			if(p) {
				Cu.reportError(e);
			}
			return;
		}
		
		for(let [k,v] in Iterator(this.prefs)) {
			
			if(k in o && v !== o[k]) {
				
				this.s(k,o[k]);
				
				this.log('REVERTED CHANGE: `'+k+'´ FROM `'+v+'´ TO `'+o[k]+'´');
				
				try {
					Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService)
						.showAlertNotification(__SCRIPT_URI_SPEC__+'/../icon.png',
						'Reverted Change...','...on ' + k,false,"",null);
				} catch(e) {}
			}
		}
	},
	
	u: function(k,v,j) {
		this.prefs[k] = v;
		let l = !j && this.prefs[TP[0]];
		if(l) try {
			if(new RegExp(l,'i').test(k)) {
				
				let p = this.prefs[TP[4]],
					o = p && JSON.parse(p) || {};
				o[k] = v;
				this.s(TP[4],this.prefs[TP[4]] = JSON.stringify(o));
			}
		} catch(e) {
			Cu.reportError(e);
		}
	},
	
	observe: function(s, t, d) {
		switch(t) {
			case 'nsPref:changed': {
				let b = WM;
				if(!b || !(b=b.getMostRecentWindow("navigator:browser")) || !(b=b.gBrowser)) {
					this.log('WARNING: Unable to obtain navigator:browser (NotificationBox Unavailable)');
				}
				
				let c = Components.stack.caller,sN,lN,p,ext,ext2,ext3,sNo = null,nV=this.p(d),
					oV = (d in this.prefs ? this.prefs[d] : null), stack = [], eN;
				
				switch(d) {
					case TP[3]:
						this.j(nV);
						break;
					case TP[0]:
						if(sTimer)
							sTimer.cancel();
						setTimeout(this.n.bind(this),1815);
					default:
						break;
				}
				
				if(c == null) {
					this.log('ERROR: Stack unavailable, changed preference: `'+d+'´ FROM `'+oV+'´ TO `'+nV+'´');
					this.u(d,nV);
					break;
				}
				
				do {
					sN = c.filename;
					lN = c.lineNumber;
				} while(sN === null && (c = c.caller));
				
				if(sN == null) {
					this.log('ERROR: Unable to obtain caller, changed preference: `'+d+'´ FROM `'+oV+'´ TO `'+nV+'´');
					this.u(d,nV);
					break;
				}
				
				p = sN;
				while(~(p||'').split(' -> ').pop().indexOf('jetpack/addon-sdk/') && (c=c && c.caller)) {
					do {
						p = c.filename;
						eN = c.lineNumber;
					} while(p === null && (c = c.caller));
				}
				
				if(eN) {
					sN = p;
					lN = eN;
				}
				
				if(~(p = sN.lastIndexOf(' -> '))) {
					sNo = sN;
					sN = sN.substr(p+4);
				}
				
				p = sN.indexOf('://') + 1;
				while(sN.charAt(p) == '/')++p;
				ext = sN.substr(p,sN.indexOf('/',p)-p);
				
				if(~['global','mozapps','browser','components','modules','gre','app','services-common','services-sync'].indexOf(ext) || /^about:/.test(sN)) {
					this.log('Permitted change by `'+(ext||sN)+'´ for "'+d+'"');
					this.u(d,nV);
					break;
				}
				
				// let LOG = (function(m) this.log(m)).bind(this);
				
				// LOG(' ^^^ '+ext+' ~ '+sN);
				if(/^(jar|file)\:/i.test(sN)) {
					
					ext = this.sM(decodeURIComponent(sN),/extensions\/([^\/@]+)(?:@[^\/]+)?\//);
					if(ext)ext = ext.replace(/\.xpi!?$/,'');
				}
				
				ext = ext.replace(/-at-jetpack$/,'@jetpack');
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
					&& !~dL.indexOf(eL.replace(/[^a-z]/g,'') + '.')
					&& !~dL.indexOf(e.replace(/^([a-z]+)[A-Z_][a-z]+$/,'$1').toLowerCase() + '.')) {
						if(!~(SP[e]||'').indexOf(dL) && (!SPR[e] || !SPR[e].test(dL)))
							continue;
						c = 1;
					}
					this.log('Permitted '+(c?'controlled':'self-made')+' change by `'+eN+'´ for "'+d+'"');
					this.u(d,nV);
					return;
				}
				
				if(oV === nV) {
					this.log('VOID change by `'+eN+'´ for "'+d+'" -> ('+nV+')');
					break;
				}
				this.u(d,nV,!0);
				
				c = Components.stack;
				while((c = c.caller)) {
					if(c.filename || stack.length) {
						stack.push(('^ ' + c).replace(/\s[^\s]+ ->/g,'')
							.replace(/\s(jar:)?file:.*?\/extensions\//,' Resource://'));
					}
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
				
				let l = this.prefs[TP[0]];
				if(l) try {
					if(new RegExp(l).test(dL)) {
						this.s(d,oV);
						this.log('REVERTED CHANGE: `'+d+'´ FROM `'+nV+'´ TO `'+oV+'´');
						break;
					}
				} catch(e) {
					Cu.reportError(e);
				}
				
				if(!b)break;
				let k = this.prefs[TP[1]];
				
				if(!(d in this.pan)) {
					this.pan[d] = 0;
				}
				if(++this.pan[d] > 3 && !k)
					break;
				
				let j = this.prefs[TP[2]];
				if(j) try {
					if(new RegExp(j).test(dL))
						break;
				} catch(e) {
					Cu.reportError(e);
				}
				
				let n = b.getNotificationBox(), bn = "More Info", pn;
				if(!k && (pn = n.getNotificationWithValue(nn))) {
					n.removeNotification(pn);
					bn += '*';
				}
				
				let nb = [];
				if(k) {
					nb.push({label:'Revert Change',accessKey:"R",callback:this.r(d,oV)});
				}
				nb.push({label:bn,accessKey:"I",callback:this.c(b.browsers[0].contentWindow,nn,k?d:0,oV)});
				n.appendNotification(nn+': '+Msg,nn,"chrome://global/skin/icons/warning-16.png",n.PRIORITY_WARNING_MEDIUM,nb);
				
			}	break;
			
			default:break;
		}
	}
};

let sTimer;
function setTimeout(f,n) {
	let i = Ci.nsITimer,
		t = Cc["@mozilla.org/timer;1"].createInstance(i);
	t.initWithCallback({notify:f},n||30,i.TYPE_ONE_SHOT);
	return sTimer = t;
}
function startup(aData, aReason) {
	setTimeout(function() {
		sTimer = null;
		
		if("nsIPrefBranch2" in Ci)
			PS.QueryInterface(Ci.nsIPrefBranch2);
		
		if(!PS.getPrefType(TP[0])) {
			PS.setCharPref(TP[0],'^((browser\\.(startup|newtab)|general\\.useragent|keyword)\\.'
				+ '|extensions\\.(autoDisableScopes|enabledScopes))');
		}
		if(!PS.getPrefType(TP[3])) {
			PS.setCharPref(TP[3],'chatzilla:^extensions\\.irc\\.;wot:^weboftrust\\.');
		}
		PrefMon.j(PS.getCharPref(TP[3]));
		
		for each(let o in PS.getChildList("", {value: 0})) {
			this.prefs[o] = this.p(o);
		}
		
		if(!PS.getPrefType(TP[4])) {
			PS.setCharPref(TP[4],'');
			setTimeout(this.n.bind(this),1492);
		} else {
			setTimeout(this.m.bind(this),1815);
		}
		
		PS.addObserver("", this, false);
	}.bind(PrefMon),1942);
	
	AddonManager.addAddonListener(PrefMon);
	AddonManager.getAddonsByTypes(['extension'],function(addons) {
		addons.forEach(function(addon) PrefMon.adb[addon.id.toLowerCase()] = addon.name);
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
