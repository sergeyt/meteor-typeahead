Package.describe({
	name: "sergeyt:typeahead",
	summary: "Autocomplete package for meteor powered by twitter typeahead.js",
	git: "https://github.com/sergeyt/meteor-typeahead.git",
	version: "0.10.5_14"
});

Package.onUse(function(api) {
	api.versionsFrom('METEOR@1.0');
	api.use(['jquery', 'blaze@1.0.0 || 2.0.0', 'ui'], 'client');
	api.use('twbs:bootstrap@3.0.0', 'client', {weak: true});
	api.addFiles('typeahead.bundle.js', 'client');
	api.addFiles('index.js', 'client');
});
