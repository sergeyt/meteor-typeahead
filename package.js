Package.describe({
	name: "sergeyt:typeahead",
	summary: "Autocomplete package for meteor powered by twitter typeahead.js",
	git: "https://github.com/sergeyt/meteor-typeahead.git",
    version: "0.0.12"
});

Package.onUse(function(api) {
	api.versionsFrom('METEOR@0.9.1');
	api.use(['jquery', 'blaze'], 'client');
	api.addFiles('typeahead.bundle.js', 'client');
	api.addFiles('index.js', 'client');
});
