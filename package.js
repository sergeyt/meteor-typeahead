Package.describe({
	name: "sergeyt:typeahead",
	summary: "Autocomplete package for meteor powered by twitter typeahead.js",
	git: "https://github.com/sergeyt/meteor-typeahead.git",
	version: "3.0.0"
});

Package.onUse(function(api) {
	api.versionsFrom(['2.8.1', '3.0']);
	api.use(['jquery@3.0.2', 'blaze@2.9.0||3.0.0'], 'client');
	api.use('twbs:bootstrap@3.3.6', 'client', {weak: true});
	api.addFiles('typeahead.bundle.js', 'client');
	api.addFiles('index.js', 'client');
});
