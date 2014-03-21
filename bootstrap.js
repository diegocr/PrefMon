/* ***** BEGIN LICENSE BLOCK *****
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/
 *
 * The Original Code is Preferences Monitor Mozilla Extension.
 *
 * The Initial Developer of the Original Code is
 * Copyright (C)2014 Diego Casorran <dcasorran@gmail.com>
 * All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */

(function(scope) {
	const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components,
		OS = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService),
		PS = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService),
		CS = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService),
		PR = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService),
		WM = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator),
		AS = Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService),
		SP = {
			cooliris: ["permissions.default.image"],
			console2: ['extensions.consolefilter'],
			'pdf.js.components': ['pdfjs.database'],
			noscript: ['dom.max_chrome_script_run_time','dom.max_script_run_time']
		},
		SPRs = {
			'Preferences Monitor': /./,
			'prefmon-ecleaner': /./,
			'Devento': /./
		},
		PPR = [
			'browser.startup.homepage_override.buildID',
			'browser.startup.homepage_override.mstone'
		],
		BR = 'extensions.preferencesmonitor.',
		TP = [
			BR + 'revon',
			BR + 'revask',
			BR + 'nonboxfor',
			BR + 'nonboxbyex',
			BR + 'revonstrg',
			BR + 'ltf',
			BR + 'lfp',
			BR + 'hiper',
			BR + 'nbtime'
		],
		KNS = [
			'global','mozapps','browser','components','modules',
			'gre','app','services-common','services-sync'
		],
		SPR = Object.create(SPRs),
		{ AddonManager } = Cu.import('resource://gre/modules/AddonManager.jsm', {}),
		{ XPCOMUtils   } = Cu.import("resource://gre/modules/XPCOMUtils.jsm",   {}),
		{ Services     } = Cu.import("resource://gre/modules/Services.jsm",     {}),

	PrefMon = {
		prefs: {},
		pan: {},
		adb: {},
		llm: [],
		ilf: !1,
		dlf: [],
		lfp: 0,

		log: function(m) {
			if(~this.llm.indexOf(m))
				return;
			if(this.llm.length == 3)
				this.llm.shift();
			this.llm.push(m);

			if(this.lms) {
				this.lms.push(m);
			} else {
				this.lms = [m];
				setTimeout(function() {
					let lms = this.lms;
					delete this.lms;
					CS.logStringMessage('Preferences Monitor :: '
						+(new Date()).toString()+"\n> "+lms.join("\n> "));
					sTimer = undefined;
				}, 910);
			}
		},

		san: function(t,m) {
			if(!this.asq) {
				this.asq = [];
			} else if(this.asw) {
				this.asq.push([t,m]);
				return;
			}
			this.roi(function() {
				AS.showAlertNotification(__SCRIPT_URI_SPEC__+'/../icon.png',t,m,!1,"",
					function(s,t,d) {
						if(t != "alertshow") {
							this.asw = !1;
							if(this.asq.length) {
								let [t,m] = this.asq.shift();
								this.san(t,m);
							}
						}
					}.bind(this));
			});
			this.asw = !0;
		},

		onDisabling: function(a) {
			if(a.name === 'Preferences Monitor') {
				Services.prompt.alert(null,a.name,a.name + ' is being disabled.');
			}
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
			if(v === null) {
				if(!this.prefs[TP[7]])
					this.log('Resetting option "'+n+'"');
				PS.clearUserPref(n);
			}
			else switch(PS.getPrefType(n)) {
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
					if(p[0].replace(/[^\w]/g,'').length < 2) {
						Cu.reportError('This does not look like a valid extension name[space]: "'+ p[0] +'"');
					}
					SPR[p[0]] = new RegExp(p[1]);
				} catch(e) {
					Cu.reportError(e);
				}
			});
		},

		n: function() {
			delete this.nnt;
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

				if(p.test(k) && !~PPR.indexOf(k)) {

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

			try {
				p = new RegExp(this.prefs[TP[0]]);
			} catch(e) {
				Cu.reportError(e);
				return;
			}

			for(let [k,v] in Iterator(this.prefs)) {

				if(p.test(k) && v !== o[k] && !~PPR.indexOf(k)) {
					let nv = k in o ? o[k] : null;

					this.s(k,nv);

					this.log('REVERTED CHANGE: `'+k+'´ FROM `'+v+'´ TO `'+nv+'´');
					this.san('Reverted Change...','...on ' + k);
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

		wil: function(c) {
			let x = 80, s = [];
			c = c || '-';
			while(x--)
				s.push(c);
			return s.join("");
		},
		lfa: function() {
			return ['['+(new Date().toISOString())+']'];
		},
		wlf: function(r) {
			if(r) {
				let m = this.lfa();
				switch(r) {
					case APP_SHUTDOWN:
						m.push('Application shutting down.');
						break;
					case ADDON_DISABLE:
						m.push('PrefMon being disabled/uninstalled.');
						break;
					default:
						m.push('Logging disabled.');
						break;
				}
				this.dlf.push(this.wil());
				this.dlf.push(m.join(" "));
				this.dlf.push("-\n");
			}
			let data = this.dlf.join("\r\n");
			this.dlf = [];

			let s = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
			s.init(this.lfn, 0x02 | 0x10, parseInt("0755",8), 0);
			let c = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
			c.init( s, "UTF-8", 0, 0 );
			c.writeString(data+"\r\n");
			c.close();
		},
		elf: function(e) {
			let m = e.errorMessage || e.message;
			if(!m||(this.lfp && this.lfp.test(m)))
				return;
			let msg = [this.wil()],
				tmp = this.lfa();
			tmp.push(m);
			msg.push(tmp.join(" "));
			for(let i in e) {
				if(i != 'message'
				&& i != 'errorMessage'
				&& i.substr(-4) != 'Flag'
				&& i != 'timeStamp'
				&& e[i] && typeof e[i] !== 'function')
				{
					msg.push(i + ': ' + e[i]);
				}
			}
			this.dlf.push(msg.join("\r\n"));
			if(this.dlf.length == 20) {
				this.roi(this.wlf);
			}
		},
		slf: function() {
			if(!this.ilf) {

				let f = Services.dirsvc.get("ProfD", Ci.nsIFile);
				f.append("prefmon-console.txt");

				if(!f.exists() || f.fileSize > 1e8) {
					if(f.exists()) f.remove(!1);
					f.create(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt("0755",8));
				}
				this.lfn = f;

				this.dlf = [];
				this.dlf.push(this.wil('#'));

				let tmp = ['['+(new Date().toISOString().split('.').shift())+']'];
				['vendor','name','version','appBuildID',
				'OS','XPCOMABI','widgetToolkit','lastRunCrashID']
					.forEach(function(n) tmp.push(Services.appinfo[n]));

				this.dlf.push(tmp.join(" "))

				CS.registerListener(this, true);
				this.ilf = !0;
			}
		},
		clf: function(r) {
			if(this.ilf) {

				CS.unregisterListener(this);
				this.wlf(r||-1);
				this.ilf = !1;
			}
		},

		roi: function(c) {
			Services.tm.currentThread.dispatch(c.bind(this),Ci.nsIEventTarget.DISPATCH_NORMAL);
		},

		qp: function(d) {
			return [d in this.prefs ? this.prefs[d] : null, this.p(d)];
		},

		cr: function(m,d) {
			let [oV,nV] = this.qp(d);

			this.log('ERROR: ' + m + ', changed preference: `'+d+'´ FROM `'+oV+'´ TO `'+nV+'´');
			this.u(d,nV);
		},

		observe: function(s, t, d) {
			switch(t) {
				case 'EM-loaded': {
					if(this.css) break;
					let sss = Cc["@mozilla.org/content/style-sheet-service;1"]
						.getService(Ci.nsIStyleSheetService);

					if(!this.astyle)
					  this.css = 'display:none;';
					else
					  this.css = ''
						+ 'clip:rect(0px,9999px,35px,0px);'
						+ 'margin-bottom:-35px;'
						+ 'padding-top:5px;'
						+ 'position:absolute;}'
						+ 'setting[spec="preferencesmonitor"]:before {'
						+ 'text-shadow:1px 1px 3px rgba(240,240,200,0.8);'
						+ 'background:-moz-radial-gradient(circle,rgba(190,190,170,0.4),transparent);'
						+ 'content:attr(title);'
						+ 'font:bold 14px serif;'
						+ 'text-transform:uppercase;'
						+ 'display:block;'
						+ 'height:18px;'
						+ 'margin-bottom:4px;'
						+ 'text-align:center;'
						+ 'letter-spacing:0.2em;'
						+ 'width:100%;';

					this.css = '@-moz-document url(chrome://mozapps/content/extensions/extensions.xul),url(about:addons){'
						+ 'setting[spec="preferencesmonitor"] {' + this.css.replace(';',' !important;','g') + '}}';
					this.css = Services.io.newURI('data:text/css;charset=utf-8,'
						+ encodeURIComponent(this.css), null, null);
					sss.loadAndRegisterSheet(this.css, sss.USER_SHEET);

					this.emu = function() {
						sss.unregisterSheet(this.css, sss.USER_SHEET);
						sss = undefined;
						delete this.css;
						s.removeEventListener('unload', this.emu, false);
						delete this.emu;
					}.bind(this);
					s.addEventListener('unload', this.emu, false);
				}	break;
				case 'nsPref:changed': {
					let c = Components.stack.caller,sN,lN,p,ext,ext2,ext3,sNo = null,
						nV,oV, stack = [], eN;

					if(d.substr(0,BR.length) === BR) [oV,nV] = this.qp(d);

					switch(d) {
						case TP[3]:
							this.j(nV);
							break;
						case TP[5]:
							this.roi(this[nV?'slf':'clf']);
							break;
						case TP[6]:
							try {
								this.lfp = new RegExp(nV);
							} catch(e) {}
							break;
						case TP[0]:
							if(this.nnt)
								this.nnt.cancel();
							this.nnt = setTimeout(this.n,1815);
						default:
							break;
					}

					if(c == null) {
						this.cr('Stack unavailable', d);
						break;
					}

					do {
						sN = c.filename;
						lN = c.lineNumber;
					} while(sN === null && (c = c.caller));

					if(sN == null) {
						this.cr('Unable to obtain caller', d);
						break;
					}

					p = sN;
					while(/(?:jetpack\/addon-|commonjs\/)sdk\//.test((p||'').split(' -> ').pop()) && (c=c && c.caller)) {
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

					if(~KNS.indexOf(ext) || /^about:/.test(sN)) {
						if(d.substr(0,14) != "datareporting.") {
							if(!this.prefs[TP[7]])
								this.log('Permitted change by `'+(ext||sN)+'´ for "'+d+'"');
							this.u(d,nV || this.p(d));
						}
						break;
					}

					// let LOG = (function(m) this.log(m)).bind(this);

					// LOG(' ^^^ '+ext+' ~ '+sN);
					if(/^(jar|file)\:/i.test(sN)) {

						ext = this.sM(decodeURIComponent(sN),/extensions\/([^\/@]+)(?:@[^\/]+)?\//);
						ext = (ext || '<unknown/local>').replace(/\.xpi!?$/,'');
					} else {

						if(/^[A-Fa-f\d]{8}-(?:[A-Fa-f\d]{4}-){3}[A-Fa-f\d]{12}$/.test(ext))
							ext = '{'+ext+'}';
					}

					ext = (ext||sN).replace('-at-','@').replace('-dot-','.','g');
					ext2 = this.sM(sN,/extensions\/([^\/@]+)@[^\/]+\//);
					ext3 = this.sM(sN,/extensions\/[^\/@]+@([^\/]+)\//)
						|| this.sM((function(c) {
							while((c=c && c.caller) && (c.filename||'')
								.replace(/^.+->/,'').indexOf('file:') == -1);
							return c && c.filename || '';
						})(c),/extensions\/([^\/]+)\//);
					ext3 = decodeURIComponent(ext3||'').replace(/\.xpi!?$/,'');
					eN = this.gN(ext) || this.gN(''+ext2+'@'+ext3)
						|| this.gN(ext3) || ext;
					ext3 = ext3.replace(/(?:\.\w+)+!?$/,'');

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
						if(!this.prefs[TP[7]])
							this.log('Permitted '+(c?'controlled':'self-made')+' change by `'+eN+'´ for "'+d+'"`');
						this.u(d,nV || this.p(d));
						return;
					}

					if(!nV) [oV,nV] = this.qp(d);

					if(oV === nV) {
						this.log('VOID change by `'+eN+'´ for "'+d+'" -> ('+nV+')');
						break;
					}
					this.u(d,nV,!0);

					c = Components.stack;
					while((c = c.caller)) {
						if(c.filename || stack.length) {
							stack.push(decodeURIComponent('^ ' + c).replace(/\s[^\s]+ ->/g,'')
								.replace(/\s(?:jar:)?file:.*?\/extensions\//,' Profile://'));
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
					},nn = 'Preferences Monitor',Msg = '`' + eN + '´ changed the value of "' + d + '"`',
						MsgExt = nn + ' :: ' + (new Date()).toString() + "\n\n" + Msg + "\n\noldValue: " +  (_(oV)||'`No old Value found´')
							+ "\nnewValue: " + (_(nV)||'`Empty (Value Cleared?)´')
							+ (sNo ? "\n\n"+sNo.replace(sN.replace(/!\/.+$/,'!'),'','g'):"")
							+ (stack.length ? (sNo ? "\n":"\n\n") + stack.join("\n"):"");

					this.roi(function() {
						let sE = Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError);
						sE.init(MsgExt,sN,String(lN),lN,null,Ci.nsIScriptError.errorFlag,'chrome javascript');
						CS.logMessage(sE);
					});

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

					let b = WM;
					if(!b || !(b=b.getMostRecentWindow("navigator:browser")) || !(b=b.gBrowser)) {
						this.log('WARNING: Unable to obtain navigator:browser (NotificationBox Unavailable)');
						break;
					}
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

					let nb = [{
						label     : 'Whitelist',
						accessKey : 'W',
						callback  : function() {
							d = d.split('.');
							if(d.length > 1) {
								d.pop();
								d = '^' + d.join("\\.") + '\\.';
							} else {
								d = '^' + d.join("\\.");
							}
							this.log('Whitelisting `'+eN+'` for `'+d+'`');
							if(SPR[eN]) {
								let o = '' + SPR[eN];
								d = [eN + ':' + d + '|' + o.substr(1,o.length-2)];
								for(let i in SPR) {
									if(SPR.hasOwnProperty(i)) {
										o = '' + SPR[i];
										d.push(i+':'+o.substr(1,o.length-2));
									}
								}
								d = d.join(";");
							} else {
								d = PS.getCharPref(TP[3]) + ';' + eN + ':' + d;
							}
							PS.setCharPref(TP[3],d);
						}.bind(this)
					}];
					if(k) {
						nb.push({label:'Revert Change',accessKey:"R",callback:this.r(d,oV)});
					}
					nb.push({label:bn,accessKey:"I",callback:this.c(b.browsers[0].contentWindow,nn,k?d:0,oV)});
					let ne = n.appendNotification(nn+': '+Msg,nn,
						"chrome://global/skin/icons/warning-16.png",
						n.PRIORITY_WARNING_MEDIUM,nb,function(r) {
							if(r === 'removed') {
								if(ne.nbt)
									ne.nbt.cancel();
							}
						});

					if(this.prefs[TP[8]]) {
						ne.nbt = setTimeout(function() n.removeNotification(ne), this.prefs[TP[8]] * 1000);
					}

				}	break;

				default:
					if(!this.ilf) break;

					if("QueryInterface" in s) {

						if(s instanceof Ci.nsIScriptError) {

							s = s.QueryInterface(Ci.nsIScriptError);
						}
					}

					if(s instanceof Ci.nsIConsoleMessage || s.flags < this.prefs[TP[5]]-1) try {

						this.elf(s);

					} catch(e) {}

					break;
			}
		},

		QueryInterface: XPCOMUtils.generateQI(Ci.nsIConsoleListener)
	};

	let sTimer;
	function setTimeout(f,n) {
		let i = Ci.nsITimer,
			t = Cc["@mozilla.org/timer;1"].createInstance(i);
		t.initWithCallback({notify:f.bind(PrefMon)},n||30,i.TYPE_ONE_SHOT);
		return sTimer = t;
	}
	function startup(aData, aReason) {
		setTimeout(function() {
			sTimer = null;

			AddonManager.getAddonsByTypes(['extension'],function(addons) {
				addons.forEach(function(addon) PrefMon.adb[addon.id.toLowerCase()] = addon.name);
				AddonManager.addAddonListener(PrefMon);

				AddonManager.getAddonsByTypes(['theme'],function(themes) {
					let theme = {id:''};
					themes.some(function(t) t.isActive && (theme=t));

					PrefMon.astyle = theme.id === "{972ce4c6-7e08-4474-a285-3208198ce6fd}"
						|| ~theme.id.indexOf('@personas.mozilla.org');

					let emPong = function(s,t) {
						PrefMon.observe(s,"EM-loaded");
					};
					OS.addObserver(emPong, "EM-pong", false);
					OS.notifyObservers(null, "EM-ping", "");
					OS.removeObserver(emPong, "EM-pong");
					OS.addObserver(PrefMon,"EM-loaded",false);
				});
			});

			if(!PS.getPrefType(TP[0])) {
				let X = [
					'network.proxy.autoconfig_url',
					'extensions.(autoDisableScopes|enabledScopes)',
					'(browser.(startup|newtab)|general.useragent|keyword).',
					'security.turn_off_all_security_so_that_viruses_can_take_over_this_computer'
				];
				PS.setCharPref(TP[0],'^(' + X.join("|").replace('.', '\\.', 'g') + ')');
			}
			if(!PS.getPrefType(TP[3])) {
				PS.setCharPref(TP[3],'chatzilla:^extensions\\.irc\\.;wot:^weboftrust\\.');
			}
			this.j(PS.getCharPref(TP[3]));

			if(!PS.getPrefType(TP[7])) {
				PS.setBoolPref(TP[7],!1);
			}

			if(!PS.getPrefType(TP[8])) {
				PS.setIntPref(TP[8],0);
			}

			for each(let o in PS.getChildList("", {value: 0})) {
				this.prefs[o] = this.p(o);
			}

			if(!this.prefs[TP[4]]) {
				PS.setCharPref(TP[4],'');
				setTimeout(this.n,1492);
			} else {
				setTimeout(this.m,1815);
			}

			PS.addObserver("", this, false);
		},1942);

		if("nsIPrefBranch2" in Ci)
			PS.QueryInterface(Ci.nsIPrefBranch2);

		if(!PS.getPrefType(TP[5])) {
			PS.setIntPref(TP[5],0);
		}
		if(!PS.getPrefType(TP[6])) {
			PS.setCharPref(TP[6],'Duplicate resource declaration|Ignoring obsolete chrome registration modifier');
		}
		try {
			let p = PS.getCharPref(TP[6]);
			if(p) {
				PrefMon.lfp = new RegExp(p);
			}
		} catch(e) {
			Cu.reportError(e);
		}
		if((PrefMon.prefs[TP[5]] = PS.getIntPref(TP[5]))) {
			PrefMon.slf();
		}
	}

	function shutdown(aData, aReason) {
		if(sTimer) sTimer.cancel();
		AddonManager.removeAddonListener(PrefMon);
		OS.removeObserver(PrefMon,"EM-loaded",false);
		PS.removeObserver("", PrefMon);
		if(PrefMon.emu) PrefMon.emu();
		PrefMon.clf(aReason);
	}

	let wrap = function(f) {
		f.prototype = undefined;
		return {value:Object.freeze(f.bind(null))};
	};
	Object.defineProperties(scope, {
		startup   : wrap(startup),
		shutdown  : wrap(shutdown),
		install   : wrap(function() {}),
		uninstall : wrap(function() {})
	});
})(this);
