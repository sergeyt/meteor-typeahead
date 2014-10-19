Package.describe({
	name: "sergeyt:typeahead",
	summary: "Autocomplete package for meteor powered by twitter typeahead.js",
	git: "https://github.com/sergeyt/meteor-typeahead.git",
    version: "0.10.5_6"
});

if (typeof Package.onUse == "function") { // for meteor v0.9+
	Package.onUse(function(api) {
		api.versionsFrom('METEOR@0.9.3');
		api.use(['jquery', 'blaze@1.0.0 || 2.0.0', 'ui'], 'client');
		api.addFiles('typeahead.bundle.js', 'client');
		api.addFiles('index.js', 'client');
	});
} else { // for meteor < v0.9
	Package.on_use(function(api) {
		api.use(['jquery', 'blaze', 'ui'], 'client');
		api.add_files('typeahead.bundle.js', 'client');
		api.add_files('index.js', 'client');
	});
}
