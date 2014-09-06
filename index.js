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

	var name = $e.attr('name') || $e.attr('id') || 'dataset';
	var limit = $e.data('limit');
	var templateName = $e.data('template'); // specifies name of custom template
	var templates = $e.data('templates'); // specifies custom templates
	var valueKey = $e.data('value-key');

	if (!source) {
		source = $e.data('source') || [];
	}

	if (typeof source === 'string') {
		source = resolve_template_function(element, source);
	}

	var dataset = {
		name: name,
		valueKey: valueKey,
		displayKey: valueKey
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

	if ($.isArray(source) || ($.isFunction(source) && source.length === 0)) {
		dataset.local = source;
		return make_bloodhound(dataset);
	}

	dataset.source = source;
	dataset.templates = make_templates(dataset);

	return dataset;
}

function resolve_template_function(element, name) {
	var fn = null;

	if (typeof Blaze == "undefined") {
		var component = UI.DomRange.getContainingComponent(element);
		if (!component) {
			return [];
		}
		fn = component[name];
	} else {
		var view = $.isFunction(Blaze.getView) ? Blaze.getView(element) : Blaze.getElementView(element);
		if (!view) {
			return [];
		}
		fn = view.template && view.template[name];
	}

	if (!$.isFunction(fn)) {
		console.log("Unable to resolve data source function '%s'.", name);
		return [];
	}

	return fn;
}

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

// creates Bloodhound suggestion engine based on given dataset
function make_bloodhound(dataset) {

	function wrap_value(value) {
          if (typeof value == 'object') {
                return value;
          } else {
		return {value: value};
          }
	}

	if (!dataset.template) {
		if (Array.isArray(dataset.local)) {
			dataset.local = dataset.local.map(wrap_value);
		} else if ($.isFunction(dataset.local) && dataset.local.length === 0) {
			var localFn = dataset.local;
			dataset.local = function() {
				return (localFn() || []).map(wrap_value);
			};
		}
	}

	var need_bloodhound = Array.isArray(dataset.local) ||
		$.isFunction(dataset.local) && dataset.local.length === 0;

	var engine;
	var valueKey = dataset.valueKey || 'value';

	if (need_bloodhound) {
		var options = $.extend({}, dataset, {
			// TODO support custom tokenizers
			datumTokenizer: Bloodhound.tokenizers.obj.whitespace(valueKey),
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

	return {
		displayKey: valueKey,
		source: need_bloodhound ? bloodhound_source : dataset.local,
		templates: make_templates(dataset)
	};
}
