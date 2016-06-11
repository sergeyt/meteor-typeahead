var global = this || window;

function identity(x) { return x; }

// String.trim polyfill
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

var typeaheadEvents = [
	"active",
	"idle",
	"open",
	"close",
	"change",
	"render",
	"select",
	"autocomplete",
	"asyncrequest",
	"asynccancel",
	"asyncreceive",
];

/**
 * Activates typeahead behavior for given element.
 * @param element (required) The DOM element to infect.
 * @param source (optional) The custom data source.
 */
Meteor.typeahead = function(element, source) {
	var $e = $(element);
	var datasets = resolve_datasets($e, source);

	$e.typeahead('destroy');

	var options = $e.data('options') || {};
	if (typeof options != 'object') {
		options = {};
	}

	function get_bool(name, defval) {
		var val = $e.data(name);
		return val === undefined ? defval : !!val;
	}

	// other known options passed via data attributes
	var highlight = get_bool('highlight', false);
	var hint = get_bool('hint', true);
	var autoselect = get_bool('autoselect', false);
	var minLength = get_min_length($e);

	options = $.extend(options, {
		highlight: highlight,
		hint: hint,
		minLength: minLength,
		autoselect: autoselect
	});

	var instance;
	if (Array.isArray(datasets)) {
		instance = $e.typeahead.apply($e, [options].concat(datasets));
	} else {
		var dataset = datasets;

		// TODO remove this when typeahead.js will support minLength = 0
		if (minLength === 0 && dataset.local) {
			// based on @snekse suggestion (see https://github.com/twitter/typeahead.js/pull/719)
			var altSource = dataset.source;
			dataset.source = function(query, sync, async) {
				return query ? altSource(query, sync, async) : sync(dataset.local());
			};
		}

		instance = $e.typeahead(options, dataset);
	}

	// bind event handlers
	typeaheadEvents.forEach(function(name) {
		var fn = resolve_template_function($e[0], $e.data(name));
		if ($.isFunction(fn)) {
			instance.on('typeahead:' + name, fn);
		}
	});

	// fix to apply bootstrap form-control to tt-hint
	// TODO support other classes if needed
	if ($e.hasClass('form-control')) {
		$e.parent('.twitter-typeahead').find('.tt-hint').addClass('form-control');
	}

	// TODO remove this when typeahead.js will support minLength = 0
	if (minLength === 0) {
		$e.on('focus', function() {
			if ($e.val() === '') {
				$e.data('ttTypeahead').input.trigger('queryChanged', '');
			}
		});
	}

	return instance;
};

/**
 * Activates all typeahead elements.
 * @param selector (optional) selector to find typeahead elements to be activated
 */
Meteor.typeahead.inject = function(selector) {
	if (!selector) {
		selector = '.typeahead';
	}

	// See if we have a template instance to reference
	var template = Template.instance();
	if (!template) {
		// If we don't, just init on the entire DOM
		$(selector).each(init_typeahead);
	} else {
		// Otherwise just init this template's typeaheads
		template.$(selector).each(init_typeahead);
	}
};

function init_typeahead(index, element) {
	try {
		if (!$(element).data('ttTypeahead')) {
			Meteor.typeahead(element);
		}
	} catch (err) {
		console.log(err);
		return;
	}
}

function resolve_datasets($e, source) {
	var element = $e[0];
	var datasets = $e.data('sources') || $e.data('sets');
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

	var name = normalize_dataset_name($e.attr('data-source-name') || $e.attr('name') || $e.attr('id') || 'dataset');
	var limit = $e.data('limit');
	var templateName = $e.data('template'); // specifies name of custom template
	var templates = $e.data('templates'); // specifies custom templates
	var valueKey = $e.data('value-key') || 'value';
	var minLength = get_min_length($e);

	if (!source) {
		source = $e.data('source') || [];
	}

	var dataset = {
		name: name,
		valueKey: valueKey,
		displayKey: valueKey,
		minLength: minLength,
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
		dataset.async = true;
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
		source = resolve_data_source(element, source);
	}

	if ($.isArray(source) || ($.isFunction(source) && source.length === 0)) {
		dataset.local = source;
		return make_bloodhound(dataset);
	}

	dataset.source = source;

	return dataset;
}

function get_min_length($e) {
	var value = parseInt($e.data('min-length'));
	return isNaN(value) || value < 0 ? 1 : value;
}

// typeahead.js throws error if dataset name does not meet /^[_a-zA-Z0-9-]+$/
function normalize_dataset_name(name) {
	return name.replace(/[\]\[\.]/g, '_');
}

// Parses string with template names and set appropriate dataset properties.
function set_templates(dataset, templates) {
	var templateKeys = {
		header: 1,
		footer: 1,
		suggestion: 1,
		template: 1, // suggestion alias
		notFound: 1,
		empty: 1, // notFound alias
		pending: 1
	};
	var pairs = templates.split(/[;,]+/);
	pairs.map(function(s) {
		var p = s.split(/[:=]+/).map(function(it) { return it.trim(); });
		switch (p.length) {
			case 1: // set suggestion template when no key is specified
				return ['template', p[0]];
			case 2:
				return (p[0] in templateKeys) ? [p[0], p[1]] : null;
			default:
				return null;
		}
	}).filter(identity).forEach(function(p) {
		dataset[p[0]] = p[1];
	});
}

// Resolves data source function.
function resolve_data_source(element, name) {
	var fn = resolve_template_function(element, name);
	if ($.isFunction(fn)) {
		return fn;
	}

	// collection.name
	var path = name.split('.');
	if (path.length > 0) {
		var collection = find_collection(path[0]);
		if (collection) {
			var property = path.length > 1 ? path[1] : "";
			return function() {
				return collection.find().fetch()
					.map(function(it) {
						var value = property ? it[property] : it.name || it.title;
						// wrap to object to use object id in selected event handler
						return value ? {value: value, id: it._id} : "";
					})
					.filter(identity);
			};
		}
	}

	console.log("Unable to resolve data source function '%s'.", name);
	return [];
}

function find_collection(name) {
	if (typeof Mongo != "undefined" && typeof Mongo.Collection != "undefined") {
		// when use dburles:mongo-collection-instances
		if ($.isFunction(Mongo.Collection.get)) {
			return Mongo.Collection.get(name);
		}
	}
	if (global) {
		return global[name] || global[name.toLowerCase()] || null;
	}
	return null;
}

// Resolves function with specified name from context of given element.
function resolve_template_function(element, name) {
	var fn = null;
	var opts = {sync:false};
	// traverse view hierarchy and find helper function
	var view = Blaze.getView(element);
	while (view) {
		fn = resolve_helper(view, name, opts);
		if ($.isFunction(fn)) {
			break;
		}
		view = view.parentView;
	}

	if (!$.isFunction(fn)) {
		return null;
	}

	// calls template helper function with Template.instance() context
	function invoke(args) {
		// use Blaze._withCurrentView internal function to set current view
		// also since meteor 1.2 no need to use Template._withTemplateInstanceFunc
		// since the function is already bound to template instance
		return Blaze._withCurrentView(view, function() {
			return fn.apply(null, args);
		});
	}

	if (opts.sync) { // local dataset?
		return function() {
			return invoke(Array.prototype.slice.call(arguments));
		};
	}
	// async data source
	return function(a) {
		return invoke(Array.prototype.slice.call(arguments));
	};
}

function resolve_helper(view, name, opts) {
	if (!view.template) {
		return null;
	}
	// we need to known whether the helper function is async
	// use view.template.__helpers to determine that
	// since meteor 1.2 Blaze._getTemplateHelper wraps
	// the helper function binding it to template context
	var fn = view.template.__helpers.get(name) || view.template[name];
	if (!$.isFunction(fn)) {
		return null;
	}
	opts.sync = fn.length === 0;
	return Blaze._getTemplateHelper(view.template, name, function() {
		return view.templateInstance();
	});
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
		// return html wrapped into div to avoid visual issues
		return div[0].outerHTML;
	};
}

// Creates object with template functions (for header, footer, suggestion, empty templates).
function make_templates(dataset) {

	function make(value) {
		if (!value) {
			return null;
		}
		if (typeof value === "string") {
			if (value.indexOf('<') >= 0) { // detect HTML string
				return value;
			}
			return make_template_function(value);
		}
		return $.isFunction(value) ? value : null;
	}

	var templates = {
		header: make(dataset.header),
		footer: make(dataset.footer),
		suggestion: make(dataset.suggestion || dataset.template),
		notFound: make(dataset.notFound || dataset.empty),
		pending: make(dataset.pending)
	};

	return Object.keys(templates)
		.filter(function(key) { return templates[key]; })
		.reduce(function(result, key) {
			result[key] = templates[key];
			return result;
		}, {});
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
			var tracker = Template.instance() || Tracker;
			tracker.autorun(function(comp) {
				// TODO stop tracking if typeahead is explicitly destroyed (issue #70)
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
