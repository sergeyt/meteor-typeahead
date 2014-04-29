Package.describe({
	summary: "Autocomplete package for meteor powered by twitter typeahead.js"
});

Package.on_use(function(api, where) {
	var client = ['client'];
	api.use('jquery', client);
	api.add_files('typeahead.bundle.js', client);
	api.add_files('index.js', client);
});
