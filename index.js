// String.trim polyfill
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

/**
 * Activates typeahead behavior for given element.
 * @param element (required) The DOM element to infect.
 * @param source (optional) The custom data source.
 */
Meteor.typeahead = function(element, source) {
	var $e = $(element);
	var datasets = resolve_datasets($e, source);

	$e.typeahead('destroy');

	var opts = $e.data('options') || {};
	if (typeof opts != 'object') {
		opts = {};
	}

	// other known options passed via data attributes
	var highlight = Boolean($e.data('highlight')) || false;
	var hint = Boolean($e.data('hint')) || false;
	var minLength = parseInt($e.data('min-length')) || 1;
	var autocompleted = null, selected = null;

	if ($e.data('autocompleted')) {
		autocompleted = resolve_template_function($e[0], $e.data('autocompleted'));
	}
	if ($e.data('selected')) {
		selected = resolve_template_function($e[0], $e.data('selected'));
	}

	var options = $.extend(opts, {
		highlight: highlight,
		hint: hint,
		minLength: minLength
	});

	var instance;
	if (Array.isArray(datasets)) {
		instance = $e.typeahead.apply($e, [options].concat(datasets));
	} else {
		instance = $e.typeahead(options, datasets);
	}

	// event handlers (PR #18)
	if ($.isFunction(selected)) {
		instance.on('typeahead:selected', selected);
	}
	if ($.isFunction(autocompleted)) {
		instance.on('typeahead:autocompleted', autocompleted);
	}

	// fix to apply bootstrap form-control to tt-hint
	// TODO support other classes if needed
	if ($e.hasClass('form-control')) {
		$e.parent('.twitter-typeahead').find('.tt-hint').addClass('form-control');
	}
};

/**
 * Activates all typeahead elements.
 * @param selector (optional) selector to find typeahead elements to be activated
 */
Meteor.typeahead.inject = function(selector) {
	if (!selector) {
		selector = '.typeahead';
	}
	$(selector).each(function(i,e) {
		try {
			Meteor.typeahead(e);
		} catch (err) {
			console.log(err);
		}
	});
};

function resolve_datasets($e, source) {
	var element = $e[0];
	var datasets = $e.data('sets');
	if (datasets) {
		if (typeof datasets == 'string') {
			datasets = resolve_template_function(element, datasets);
		}
		if ($.isFunction(datasets)) {
			datasets = datasets() || [];
		}
		return datasets.map(function(ds) {
			return make_bloodhound(ds);
		});
	}

	var name = normalize_dataset_name($e.attr('name') || $e.attr('id') || 'dataset');
	var limit = $e.data('limit');
	var templateName = $e.data('template'); // specifies name of custom template
	var templates = $e.data('templates'); // specifies custom templates
	var valueKey = $e.data('value-key') || 'value';
	var displayKey = $e.data('display-key') || valueKey;

	if (!source) {
		source = $e.data('source') || [];
	}

	var dataset = {
		name: name,
		valueKey: valueKey,
		displayKey: displayKey
	};

	if (limit) {
		dataset.limit = limit;
	}

	// support for custom templates
	if (templateName) {
		dataset.template = templateName;
	}

	// parse string with custom templates if it is specified
	if (templates && typeof templates === 'string') {
		set_templates(dataset, templates);
	}

	dataset.templates = make_templates(dataset);

	if (typeof source === 'string') {
		if (source.indexOf('/') >= 0) { // support prefetch urls
			isprefetch = true;
			dataset.prefetch = {
				url: source,
				filter: function(list) {
					return (list || []).map(value_wrapper(dataset));
				}
			};
			return make_bloodhound(dataset);
		}
		source = resolve_template_function(element, source);
	}

	if ($.isArray(source) || ($.isFunction(source) && source.length === 0)) {
		dataset.local = source;
		return make_bloodhound(dataset);
	}

	dataset.source = source;

	return dataset;
}

// typeahead.js throws error if dataset name does not meet /^[_a-zA-Z0-9-]+$/
function normalize_dataset_name(name) {
	return name.replace(/\./g, '_');
}

// Parses string with template names and set appropriate dataset properties.
function set_templates(dataset, templates) {
	var templateKeys = {header:1, footer:1, template: 1, suggestion: 1, empty: 1};
	var pairs = templates.split(/[;,]+/);
	pairs.map(function(s) {
		var p = s.split(/[:=]+/).map(function(it){ return it.trim(); });
		switch (p.length) {
			case 1: // set suggestion template when no key is specified
				return {key: 'template', value: p[0]};
			case 2:
				return (p[0] in templateKeys) ? {key: p[0], value: p[1]} : null;
			default:
				return null;
		}
	}).filter(function(p) {
		return p !== null;
	}).forEach(function(p) {
		dataset[p.key] = p.value;
	});
}

// Resolves function with specified name from context of given element.
function resolve_template_function(element, name) {
	var view = Blaze.getView(element);
	if (!view || !view.template) {
		return [];
	}

	var fn = Blaze._getTemplateHelper(view.template, name);
	if (!$.isFunction(fn)) {
		console.log("Unable to resolve data source function '%s'.", name);
		return [];
	}

	return fn;
}

// Returns HTML template function that generates HTML string using data from suggestion item.
// This function is implemented using given meteor template specified by templateName argument.
function make_template_function(templateName) {
	if (!templateName) {
		throw new Error("templateName is not specified");
	}

	var tmpl = Template[templateName];
	if (!tmpl) {
		throw new Error("Template '" + templateName  + "' is not defined");
	}

	return function(context) {
		var div = $("<div/>");
		if ($.isFunction(Blaze.renderWithData)) {
			Blaze.renderWithData(tmpl, context, div[0]);
		} else { // for meteor < v0.9
			var range = UI.renderWithData(tmpl, context);
			UI.insert(range, div[0]);
		}
		return div.html();
	};
}

// Creates object with template functions (for header, footer, suggestion, empty templates).
function make_templates(dataset) {

	var templates = {};

	function set(key, value) {
		if (typeof value === "string") {
			if (value.indexOf('<') >= 0) {
				templates[key] = value;
			} else {
				templates[key] = make_template_function(value);
			}
		} else if ($.isFunction(value)) {
			templates[key] = value;
		}
	}

	set('header', dataset.header);
	set('footer', dataset.footer);
	set('suggestion', dataset.template);
	set('empty', dataset.empty);

	if (!templates.suggestion && dataset.suggestion) {
		set('suggestion', dataset.suggestion);
	}

	return templates;
}

// Returns function to map string value to plain JS object required by typeahead.
function value_wrapper(dataset) {
	return function(value) {
		if (typeof value === 'object') {
			return value;
		}
		var item = {};
		item[dataset.valueKey] = value;
		return item;
	};
}

// Creates Bloodhound suggestion engine based on given dataset.
function make_bloodhound(dataset) {
	if (!dataset.template) {
		if (Array.isArray(dataset.local)) {
			dataset.local = dataset.local.map(value_wrapper(dataset));
		} else if ($.isFunction(dataset.local) && dataset.local.length === 0) {
			var localFn = dataset.local;
			dataset.local = function() {
				return (localFn() || []).map(value_wrapper(dataset));
			};
		}
	}

	var need_bloodhound = dataset.prefetch || Array.isArray(dataset.local) ||
		$.isFunction(dataset.local) && dataset.local.length === 0;

	var engine;

	if (need_bloodhound) {
		var options = $.extend({}, dataset, {
			// TODO support custom tokenizers
			datumTokenizer: Bloodhound.tokenizers.obj.whitespace(dataset.valueKey),
			queryTokenizer: Bloodhound.tokenizers.whitespace
		});

		engine = new Bloodhound(options);
		engine.initialize();

		if ($.isFunction(dataset.local) && dataset.local.length === 0) {
			// update data source on changing deps of local function
			// TODO find better (functional) way to do that
			Deps.autorun(function() {
				engine = new Bloodhound(options);
				engine.initialize();
			});
		}
	}

	function bloodhound_source(query, cb) {
		var fn = engine.ttAdapter();
		return fn(query, cb);
	}

	var src = need_bloodhound || typeof dataset.local !== 'undefined' ?
		{source: need_bloodhound ? bloodhound_source : dataset.local}
		: {};

	var templates = typeof dataset.templates === 'undefined' ?
		{templates: make_templates(dataset)}
		: {};

	return $.extend({}, dataset, src, templates);
}
