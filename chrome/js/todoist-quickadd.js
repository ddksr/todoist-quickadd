(function ($, ch) {
	var platform = null,
		options = null,
		tokenValid = false,
		projects = null,
		helpers = {
			openNewBackgroundTab: function (url) {
				var a = document.createElement("a"),
					evt = document.createEvent("MouseEvents");
				a.href = url;

				evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0,
                                   true, false, false, false, 0, null);
				a.dispatchEvent(evt);
				console.log(url);
			}
		},
		todoist = {
			_request: function (method, data) {
				var req = {
						url: '//todoist.com/API/' + method,
						dataType: 'json',
						data: data || {}
					},
					api = {
						async: function (successCallback, errorCallback) {
							req.async = true;
							req.success = successCallback;
							req.error = errorCallback;
							$.ajax(req);
							return api;
						},
						sync: function () {
							var returnResp = null;
							req.async = false;
							req.success = function (response) {
								returnResp = response;
							};
							$.ajax(req);
							return returnResp;
						},
						setParams: function (params) {
							$.extend(req, params);
							return api;
						}
					};
				req.data.token = options.token;
				
				return api;
			},
			getProjects: function () {	
			if (!tokenValid) { return null; }
				return todoist._request('getProjects').sync();
			},
			addItem: function (item, cb, errCb) {
				if (!tokenValid) { return; }
				var req = todoist._request('addItem', item).async(cb, errCb);
			},
			ping: function (cb, errCb) {
				var req = todoist._request('ping');
				req.setParams({
					dataType: 'text'
				}).async(function (resp) {
					tokenValid = true;
					(cb || function() {})();
				}, errCb || function () {});
			}
		},
		selectors = {
			addItem: '.todoist-quickadd-additem'
		},
		resources = {
			iconUrl: ch.extension.getURL('img/icon.png')
		},
		getPlatformProject = function (platform, search) {
			var projId = null,
				opts = options.platforms[platform];
			$.each(projects, function (i, projectInfo) {
				var okDef = projectInfo.name == opts.project,
					okSearch = search && projectInfo.name.toLowerCase().indexOf(search.toLowerCase()) != -1;
				if (okDef || okSearch) {
					projId = projectInfo.id;
					return false;
				}
				return true;
			});
			return projId;
		},
		platformUrlRgxs = {
			trello: /trello\.com/,
			trac: /trac.*\/ticket\/\d+/,
			feedly: /feedly\.com/,
			github: /github\.com/
		},
		platformInits = {
			github: function () {
				var githubProject = null,
					addButton = $('<a href="#" class="minibutton '+ selectors.addItem+ '">Add to Todoist</a>'),
					opts = options.platforms.github,
					searchers = [
						$('h1 .js-current-repository').text(),
						$('h1 .author').text()
					];
				if (!$('#show_issue').length) { return false; }

				githubProject = getPlatformProject('github',
												   opts.useprojname && searchers[0]);
				if (opts.useprojname && !githubProject) {
					githubProject = getPlatformProject('github', searchers[1]);
				}
				
				$('.gh-header-actions').prepend(addButton);
				addButton.on('click', function (evt) {
					evt.preventDefault();
					var item = { date_string: opts.date || '' },
						titleElt = $('.gh-header-title').children(),
						title = $.map(titleElt, function (obj) {
							return $(obj).text();
						}).join(' '),
						url = window.location.href;
					item.content = url + ' (' + title + ')';
					if (githubProject) {
						item.project_id = githubProject;
					}
					if (opts.labels) {
						item.content += ' @' + opts.labels.split(/, ?/).join(' @');
					}
					todoist.addItem(item);
					$(this).fadeOut('slow');
				});
				return true;
			},
			feedly: function () {
				if (!$('.entryHeader').length && !$('.entryList').length) { return false; }
				var	feedlyProject = null,
					opts = options.platforms.feedly,
					actions = {},
					saveKey = opts.savekey.toUpperCase().charCodeAt(0),
					newbtabKey = opts.newbtabkey.toUpperCase().charCodeAt(0),
					entryData = function () {
						var url, title,
							containerSidebar = $('.sliderContainer .slideEntryContent'),
							containerTimeline = $('#timeline,#featuredArea'),
							elt = containerTimeline.find('.selectedEntry');
						if (elt.length) {
							url = elt.data('alternate-link');
							title = elt.data('title');
							if (!url) {
								elt = elt.find('a.title');
								url = elt.attr('href');
								title = elt.text();
							}
						} else if (!containerSidebar.length) {
							return null;
						} else {
							elt = containerSidebar.find('.entryTitle');
							url = elt.attr('href');
							title = elt.text();
						}
						return {
							url: url,
							title: title,
							elt: elt
						};
					},
					saveArticle = function () {
						var ent = entryData(),
							labels,
							item = {
								content: '',
								date_string: options.platforms.feedly.date,
								priority: 1
							};
						if (ent !== null) { 
							item.content = ent.url + ' (' + ent.title.trim() + ')';
							if (feedlyProject) {
								item.project_id = feedlyProject;
							}
							if (options.platforms.feedly.labels) {
								labels = ' @' + opts.labels.split(/, ?/).join(' @');
								item.content += labels;
							}
							todoist.addItem(item, function () {
								ent.elt.css('text-decoration', 'line-through');
							});
						}
					};
				
				actions[saveKey] = saveArticle();
				actions[newbtabKey] = function () {
					var entry = entryData();
					if (entry) { helpers.openNewBackgroundTab(entry.url); }
					
				};
				feedlyProject = getPlatformProject('feedly');
				$(window).on('keydown', function (evt) {
					var key = evt.keyCode;
					if (!$(evt.target).is('input') && actions[key]) {
						evt.preventDefault();
						actions[key]();
						return false;
					}
					return true;
				});
				return true;
			},
			trac: function () {
				var container=$('#ticket').parent(),
					tracProject = null,
					addItemButton = $('<a class="todoist-quickadd-additem" href="#">Add to Todoist</a> ');
				if (! container.length) { return false; }
				if (projects === null) { return false; }
				tracProject = getPlatformProject('trac');
				$('.trac-topnav').prepend(addItemButton);
				$(container).on('click', selectors.addItem, function (evt) {
					var content = ($('#trac-ticket-title').text() || '[no name]'),
						item = {
							content: window.location.href + ' (' + content.trim() + ')',
							date_string: options.platforms.trac.date,
							priority: 1
						};
					if (tracProject) {
						item.project_id = tracProject;
					}
					if (options.platforms.trac.labels) {
						item.content += ' @' + options.platforms.trac.labels.split(/, ?/).join(' @');
					}
					todoist.addItem(item);
					$(selectors.addItem).fadeOut('slow');
				});
				return true;
			},
			trello: function () {
				var container = $('.window-overlay .window .window-wrapper'),
					trelloProject = null,
					alreadyAddedCards = [],
					addItemButton = $('<a class="button-link todoist-quickadd-additem" title="Add to Todoist"> <span class="icon-sm icon-move"></span> Add to Todoist </a>');
				if (! container.length || !container.html()) { return false; }
				if (projects === null) { return false; }
				trelloProject = getPlatformProject('trello');
				container.find('.js-move-card').after(addItemButton);
				container.bind("DOMSubtreeModified", function() {
					var addItemElt = container.find(selectors.addItem);
					if ($.inArray(window.location.href, alreadyAddedCards) !== -1) { return; }
					if (!addItemElt.length) {
						container.find('.js-move-card').after(addItemButton);
					} else {
						addItemElt.show();
					}
				});
				$(container).on('click', selectors.addItem, function (evt) {
					var due = '',
						item = {
							content: container.find('.window-title-text').text(),
							date_string: options.platforms.trello.date,
							priority: 1
						};
					item.content = window.location.href + ' (' + item.content + ')';
					if ($('.card-detail-due-date-badge').length) {
						due = $('.card-detail-due-date-badge').text();
						if (due) {
							item.date_string = due.split('(')[0];
						}
					}
					if (trelloProject) {
						item.project_id = trelloProject;
					}
					if (options.platforms.trello.labels) {
						item.content += ' @' + options.platforms.trello.labels.split(/, ?/).join(' @');
					}
					todoist.addItem(item);
					alreadyAddedCards.push(window.location.href);
					$(selectors.addItem).fadeOut('slow');
				});
				return true;
			}
		},
		start = (function () {
			var count = 0;
			return function () {
				count += 1;
				if (count >= 2) {
					initialize();
				}
			};
		}()),
		retry = function (fn, time, max, args) {
			if (max === 0) return;
			setTimeout(function () {
				var status = fn.apply(null, args || []);
				if (! status) {
					if (max !== undefined) { max--; }
					retry(fn, time, max, args);
				}
			}, time);
		},
		initialize = function () {
			var pingCb = function () {
					projects = todoist.getProjects();
					init();
				},
				pingErr = function () {
					retry(todoist.ping, 500, 4, [pingCb]);
				},
				init = function () {
					$.each(platformUrlRgxs, function (platformId, rgx) {
						if (window.location.href.match(rgx)) {
							platform = platformId;
							return false;
						}
						return true;
					});
					if (options !== null && platform !== null) {
						if (! platformInits[platform]()) {
							retry(platformInits[platform], 500);
						}
					}
				};
			todoist.ping(pingCb, pingErr);
			
		};
	ch.storage.sync.get(function(items) {
		options = {
			platforms: {}
		};
		$.each(platformInits, function (key) {
			options.platforms[key] = {};
		});
		$.each(items, function (key, val) {
			var segments = key.split('-');
			if (segments.length == 1) {
				options[key] = val;
			} else {
				if (!options.platforms[segments[0]]) { options.platforms[segments[0]] = {}; }
				options.platforms[segments[0]][segments[1]] = val;
			}
		});
		if (options.token) { start(); }
	});
	start();
}(jQuery, chrome));
