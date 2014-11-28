// Saves options to chrome.storage
function save_options() {
	var optionElts = document.getElementsByClassName('option'),
		i, options = {};
	for (i = 0; i < optionElts.length; i++) {
		options[optionElts[i].id] = optionElts[i].value;
	}
	chrome.storage.sync.set(options, function() {
		// Update status to let user know options were saved.
		var status = document.getElementById('status');
		status.textContent = 'Options saved.';
		setTimeout(function() {
			status.textContent = '';
		}, 750);
	});
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
	// Use default value color = 'red' and likesColor = true.
	chrome.storage.sync.get({
		'token': '',
		'trello-date': '',
		'trello-project': '',
		'trello-labels': '',
		'trac-date': '',
		'trac-project': '',
		'trac-labels': '',
		'feedly-date': '',
		'feedly-project': '',
		'feedly-labels': '',
		'feedly-newbtabkey': 'h',
		'feedly-savekey': 't',
		'github-date': '',
		'github-project': '',
		'github-labels': ''
	}, function(items) {
		var optionElts = document.getElementsByClassName('option'),
			i, options = {};
		for (i = 0; i < optionElts.length; i++) {
			optionElts[i].value = items[optionElts[i].id];
		}
		
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
