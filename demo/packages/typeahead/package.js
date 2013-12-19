Package.describe({
  summary: "Autocomplete package for meteor powered by twitter typeahead.js"
});

Package.on_use(function(api, where) {
  api.use('jquery', ['client']);
  api.add_files('../../../typeahead/dist/typeahead.js', ['client']);
  api.add_files('../../../style.css', ['client']);
  api.add_files('../../../index.js', ['client']);
});
